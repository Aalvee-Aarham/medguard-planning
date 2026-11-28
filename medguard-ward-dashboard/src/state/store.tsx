// App state: who is logged in, the ward's live data, Dev panel switches, audit log and toasts.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import bn from '../i18n/bn.json';
import en from '../i18n/en.json';
import { CLEANER, DOCTOR, PATIENTS, QUEUE, STAFF, USERS, WARDS, initialAlerts, initialBedEvents, initialBeds, initialCameraEvents, initialCameras } from '../mock/data';
import { raise } from '../mock/queue';
import { applySwap, initialSwaps, nextMonday } from '../mock/shifts';
import { initialIncidents } from '../mock/incidents';
import { LIVE_INTERVAL_MS, nextLiveEvent } from '../mock/liveEvents';
import type { Alert, AuditEntry, Bed, BedEvent, Camera, CameraEvent, Incident, QueueEntry, Role, ShiftPlan, Staff, SwapRequest, User, Ward } from '../mock/types';

export type Lang = 'en' | 'bn';

interface Toast {
  id: string;
  text: string;
}

export type Session = 'out' | 'in' | 'locked';

interface State {
  session: Session;
  lockReason: 'idle' | 'manual';
  role: Role;
  wardId: string;
  lang: Lang;
  beds: Bed[];
  bedEvents: BedEvent[];
  queue: QueueEntry[];
  cameras: Camera[];
  staff: Staff[];
  /** Next week's plan; null until the manager asks the AI for one. */
  shiftPlan: ShiftPlan | null;
  swaps: SwapRequest[];
  incidents: Incident[];
  /** Fall incident currently shown full screen to the manager (after escalation). */
  alarmId: string | null;
  cameraEvents: CameraEvent[];
  alerts: Alert[];
  audit: AuditEntry[];
  toasts: Toast[];
  alertsOpen: boolean;
  // Dev panel switches
  liveOn: boolean;
  serverDown: boolean;
  forceErrors: boolean;
  quickLock: boolean;
}

type Action =
  | { type: 'login'; role: Role }
  | { type: 'lock'; reason: 'idle' | 'manual' }
  | { type: 'unlock' }
  | { type: 'logout' }
  | { type: 'set-role'; role: Role }
  | { type: 'set-ward'; wardId: string }
  | { type: 'set-lang'; lang: Lang }
  | { type: 'alerts-open'; open: boolean }
  | { type: 'ack'; id: string; by: string }
  | { type: 'add-alert'; alert: Alert }
  | { type: 'live-tick'; rand: number; at: string }
  | { type: 'mark-ready'; bedId: number; at: string; by: string }
  | { type: 'discharge'; bedId: number; at: string }
  | { type: 'queue-add'; entry: QueueEntry }
  | { type: 'camera-online'; id: string; online: boolean; at: string }
  | { type: 'assign-beds'; beds: Record<string, number[]> }
  | { type: 'fall-start'; id: string; bedId: number; at: string }
  | { type: 'fall-escalate'; id: string; at: string; to: string }
  | { type: 'fall-ack'; id: string; at: string; by: string }
  | { type: 'fall-false'; id: string; at: string; by: string; reason: string }
  | { type: 'incident-resolve'; id: string; at: string; by: string; outcome: string; notes: string }
  | { type: 'plan-set'; cells: ShiftPlan['cells']; aiProposed?: boolean }
  | { type: 'plan-publish'; at: string; by: string; note: string }
  | { type: 'swap-answer'; id: string; approve: boolean; answer: string; by: string }
  | { type: 'queue-override'; id: string; points: number; reason: string; by: string }
  | { type: 'request-answer'; id: string; raise: boolean; answer: string; by: string }
  | { type: 'request-new'; id: string; reason: string; at: string }
  | { type: 'assign'; bedId: number; entryId: string; at: string; by: string }
  | { type: 'audit'; entry: AuditEntry }
  | { type: 'toast'; toast: Toast }
  | { type: 'toast-done'; id: string }
  | { type: 'set-flag'; flag: 'liveOn' | 'serverDown' | 'forceErrors' | 'quickLock'; value: boolean }
  | { type: 'reset' };

const PREFS_KEY = 'mg-dashboard-prefs';
// Session is kept per browser tab, so a page refresh does not log you out (closing the tab does).
const SESSION_KEY = 'mg-dashboard-session';
const MAX_ALERTS = 50;

function loadSession(): Pick<State, 'session' | 'role' | 'lockReason'> {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}');
    const session: Session = ['in', 'locked'].includes(saved.session) ? saved.session : 'out';
    const role: Role = ['manager', 'desk', 'manager-senior'].includes(saved.role) ? saved.role : 'manager';
    return { session, role, lockReason: saved.lockReason === 'idle' ? 'idle' : 'manual' };
  } catch {
    return { session: 'out', role: 'manager', lockReason: 'manual' };
  }
}

function loadPrefs(): Pick<State, 'lang' | 'wardId'> {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    return { lang: saved.lang === 'bn' ? 'bn' : 'en', wardId: WARDS.some((w) => w.id === saved.wardId) ? saved.wardId : WARDS[0].id };
  } catch {
    return { lang: 'en', wardId: WARDS[0].id };
  }
}

function freshState(): State {
  const beds = initialBeds();
  return {
    ...loadSession(),
    ...loadPrefs(),
    beds,
    bedEvents: initialBedEvents(beds),
    queue: structuredClone(QUEUE),
    cameras: initialCameras(),
    staff: structuredClone(STAFF),
    shiftPlan: null,
    swaps: initialSwaps(),
    incidents: initialIncidents(),
    alarmId: null,
    cameraEvents: initialCameraEvents(beds),
    alerts: initialAlerts(),
    audit: [],
    toasts: [],
    alertsOpen: false,
    liveOn: true,
    serverDown: false,
    forceErrors: false,
    quickLock: false,
  };
}

/** A live "visit seen by camera" alert also becomes an event on that bed's camera. */
const visitEvent = (state: State, alert: Alert): CameraEvent => {
  const bed = state.beds.find((b) => b.id === alert.bedId)!;
  return { id: `ce-live-${alert.at}`, cameraId: bed.cameraId, bedId: bed.id, kind: 'visit', at: alert.at, staff: String(alert.detail.vars?.nurse ?? '') };
};

let eventSeq = 0;
const bedEvent = (bedId: number, at: string, kind: BedEvent['kind'], by: string, patient?: string): BedEvent => ({
  id: `be-live-${++eventSeq}`, bedId, at, kind, by, patient,
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'login':
      return { ...state, session: 'in', role: action.role };
    case 'lock':
      return state.session === 'in' ? { ...state, session: 'locked', lockReason: action.reason, alertsOpen: false } : state;
    case 'unlock':
      return { ...state, session: 'in' };
    case 'logout':
      return { ...state, session: 'out', alertsOpen: false };
    case 'set-role':
      return { ...state, role: action.role };
    case 'set-ward':
      return { ...state, wardId: action.wardId };
    case 'set-lang':
      return { ...state, lang: action.lang };
    case 'alerts-open':
      return { ...state, alertsOpen: action.open };
    case 'ack':
      return {
        ...state,
        alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, acknowledged: true, acknowledgedBy: action.by } : a)),
      };
    case 'add-alert':
      return { ...state, alerts: [action.alert, ...state.alerts].slice(0, MAX_ALERTS) };
    case 'live-tick': {
      const ev = nextLiveEvent(state.beds, state.alerts, state.staff, action.rand, action.at);
      return {
        ...state,
        beds: ev.bed ? state.beds.map((b) => (b.id === ev.bed!.id ? { ...b, ...ev.bed } : b)) : state.beds,
        bedEvents: ev.bed ? [...state.bedEvents, bedEvent(ev.bed.id, action.at, 'cleaningDone', CLEANER)] : state.bedEvents,
        alerts: ev.alert ? [ev.alert, ...state.alerts].slice(0, MAX_ALERTS) : state.alerts,
        cameraEvents: ev.alert?.kind === 'visit' ? [visitEvent(state, ev.alert), ...state.cameraEvents].slice(0, 200) : state.cameraEvents,
      };
    }
    case 'fall-start': {
      const bed = state.beds.find((b) => b.id === action.bedId);
      const patient = PATIENTS.find((p) => p.id === bed?.patientId)?.name ?? '';
      const incident: Incident = {
        id: action.id, kind: 'fall', bedId: action.bedId, patient, at: action.at, status: 'open',
        timeline: [{ step: 'sent', at: action.at, by: bed?.cameraId ?? 'Camera' }],
      };
      return {
        ...state,
        incidents: [incident, ...state.incidents],
        cameraEvents: bed ? [{ id: `ce-${action.id}`, cameraId: bed.cameraId, bedId: bed.id, kind: 'fall' as const, at: action.at }, ...state.cameraEvents] : state.cameraEvents,
        alerts: [
          {
            id: `alert-${action.id}`, tier: 'critical', kind: 'fall', bedId: action.bedId, at: action.at, acknowledged: false,
            title: { key: 'alert.fall.title', vars: { bed: action.bedId } },
            detail: { key: 'alert.fallOpen.detail', vars: { patient } },
          } satisfies Alert,
          ...state.alerts,
        ].slice(0, MAX_ALERTS),
      };
    }
    case 'fall-escalate': {
      const inc = state.incidents.find((i) => i.id === action.id);
      if (!inc || inc.timeline.some((s) => s.step === 'acknowledged')) return state;
      return {
        ...state,
        alarmId: action.id,
        incidents: state.incidents.map((i) => (i.id === inc.id ? { ...i, managerAlarm: true, timeline: [...i.timeline, { step: 'escalated', at: action.at, by: action.to }] } : i)),
      };
    }
    case 'fall-ack':
    case 'fall-false': {
      const inc = state.incidents.find((i) => i.id === action.id);
      if (!inc || inc.timeline.some((s) => s.step === 'acknowledged')) return state;
      const secs = Math.round((new Date(action.at).getTime() - new Date(inc.at).getTime()) / 1000);
      const isFalse = action.type === 'fall-false';
      const timeline: Incident['timeline'] = [...inc.timeline, { step: 'acknowledged', at: action.at, by: action.by }];
      if (isFalse) timeline.push({ step: 'resolved', at: action.at, by: action.by, note: action.reason });
      return {
        ...state,
        alarmId: state.alarmId === inc.id ? null : state.alarmId,
        incidents: state.incidents.map((i) => (i.id === inc.id ? {
          ...i, responseSecs: secs, timeline,
          ...(isFalse ? { status: 'resolved' as const, outcome: 'outcome.falseAlarm', notes: action.reason } : {}),
        } : i)),
        alerts: state.alerts.map((a) => (a.id === `alert-${inc.id}` ? { ...a, acknowledged: true, acknowledgedBy: action.by } : a)),
      };
    }
    case 'incident-resolve':
      return {
        ...state,
        incidents: state.incidents.map((i) => (i.id === action.id && i.status === 'open' ? {
          ...i, status: 'resolved', outcome: action.outcome, notes: action.notes,
          timeline: [...i.timeline, { step: 'resolved', at: action.at, by: action.by }],
        } : i)),
      };
    case 'assign-beds':
      return { ...state, staff: state.staff.map((s) => (action.beds[s.id] ? { ...s, beds: action.beds[s.id] } : s)) };
    case 'plan-set': {
      const prev = state.shiftPlan;
      return {
        ...state,
        shiftPlan: {
          weekStart: prev?.weekStart ?? nextMonday(),
          cells: action.cells,
          status: prev?.status ?? 'draft',
          aiProposed: action.aiProposed ?? prev?.aiProposed ?? false,
          publishedAt: prev?.publishedAt,
          publishedBy: prev?.publishedBy,
          note: prev?.note,
          changedSincePublish: prev?.status === 'published' ? true : undefined,
        },
      };
    }
    case 'plan-publish':
      if (!state.shiftPlan) return state;
      return { ...state, shiftPlan: { ...state.shiftPlan, status: 'published', publishedAt: action.at, publishedBy: action.by, note: action.note, changedSincePublish: false } };
    case 'swap-answer': {
      const req = state.swaps.find((r) => r.id === action.id);
      if (!req || req.status !== 'open') return state;
      return {
        ...state,
        swaps: state.swaps.map((r) => (r.id === req.id ? { ...r, status: action.approve ? 'approved' : 'declined', answer: action.answer, by: action.by } : r)),
        shiftPlan: action.approve && state.shiftPlan ? { ...state.shiftPlan, cells: applySwap(state.shiftPlan.cells, req) } : state.shiftPlan,
      };
    }
    case 'camera-online': {
      const cam = state.cameras.find((c) => c.id === action.id);
      if (!cam || cam.online === action.online) return state;
      return {
        ...state,
        cameras: state.cameras.map((c) => (c.id === cam.id ? { ...c, online: action.online, offlineSince: action.online ? undefined : action.at } : c)),
        alerts: action.online ? state.alerts : [
          {
            id: `cam-${action.at}`, tier: 'high', kind: 'camera', at: action.at, acknowledged: false,
            title: { key: 'alert.camOffline.title', vars: { cam: cam.id } },
            detail: { key: 'alert.camOffline.detail', vars: { beds: cam.beds.length ? `${cam.beds[0]}–${cam.beds[cam.beds.length - 1]}` : '—' } },
          } satisfies Alert,
          ...state.alerts,
        ].slice(0, MAX_ALERTS),
      };
    }
    case 'mark-ready': {
      const bed = state.beds.find((b) => b.id === action.bedId);
      if (bed?.status !== 'cleaning') return state;
      return {
        ...state,
        beds: state.beds.map((b) => (b.id === bed.id ? { ...b, status: 'ready', since: action.at } : b)),
        bedEvents: [...state.bedEvents, bedEvent(bed.id, action.at, 'markedReady', action.by)],
      };
    }
    case 'discharge': {
      // Comes from the Ward app in the real product; the Dev panel fakes it here.
      const bed = state.beds.find((b) => b.id === action.bedId);
      if (bed?.status !== 'occupied') return state;
      const patient = PATIENTS.find((p) => p.id === bed.patientId)?.name ?? '';
      return {
        ...state,
        beds: state.beds.map((b) => (b.id === bed.id ? { ...b, status: 'cleaning', since: action.at, patientId: undefined } : b)),
        bedEvents: [
          ...state.bedEvents,
          bedEvent(bed.id, action.at, 'discharged', DOCTOR, patient),
          bedEvent(bed.id, action.at, 'cleaningStart', CLEANER),
        ],
        alerts: [
          {
            id: `discharge-${action.at}`, tier: 'normal', kind: 'bed', bedId: bed.id, at: action.at, acknowledged: false,
            title: { key: 'alert.discharged.title', vars: { bed: bed.id } },
            detail: { key: 'alert.discharged.detail', vars: { patient } },
          } satisfies Alert,
          ...state.alerts,
        ].slice(0, MAX_ALERTS),
      };
    }
    case 'queue-add':
      return { ...state, queue: [...state.queue, action.entry] };
    case 'queue-override':
      return {
        ...state,
        queue: state.queue.map((q) => (q.id === action.id ? { ...q, override: { points: action.points, reason: action.reason, by: action.by } } : q)),
      };
    case 'request-answer':
      return {
        ...state,
        queue: state.queue.map((q) =>
          q.id === action.id && q.urgencyRequest
            ? {
                ...q,
                priority: action.raise ? raise(q.priority) : q.priority,
                urgencyRequest: { ...q.urgencyRequest, status: action.raise ? 'raised' : 'declined', answer: action.answer, answeredBy: action.by },
              }
            : q,
        ),
        // The request is handled, so its alert is done too.
        alerts: state.alerts.map((a) => (a.kind === 'request' && a.title.vars?.name === state.queue.find((q) => q.id === action.id)?.name ? { ...a, acknowledged: true, acknowledgedBy: action.by } : a)),
      };
    case 'request-new': {
      const entry = state.queue.find((q) => q.id === action.id);
      if (!entry || entry.urgencyRequest?.status === 'open') return state;
      return {
        ...state,
        queue: state.queue.map((q) => (q.id === action.id ? { ...q, urgencyRequest: { reason: action.reason, at: action.at, status: 'open' } } : q)),
        alerts: [
          {
            id: `req-${action.at}`, tier: 'normal', kind: 'request', at: action.at, acknowledged: false,
            title: { key: 'alert.request.title', vars: { name: entry.name } },
            detail: { key: 'alert.requestNew.detail', vars: { priority: entry.priority } },
          } satisfies Alert,
          ...state.alerts,
        ].slice(0, MAX_ALERTS),
      };
    }
    case 'assign': {
      const bed = state.beds.find((b) => b.id === action.bedId);
      const entry = state.queue.find((q) => q.id === action.entryId);
      if (bed?.status !== 'ready' || !entry) return state;
      return {
        ...state,
        beds: state.beds.map((b) => (b.id === bed.id ? { ...b, status: 'reserved', since: action.at, reservedFor: entry.name } : b)),
        bedEvents: [...state.bedEvents, bedEvent(bed.id, action.at, 'reserved', action.by, entry.name)],
        queue: state.queue.filter((q) => q.id !== entry.id),
      };
    }
    case 'audit':
      return { ...state, audit: [action.entry, ...state.audit] };
    case 'toast':
      return { ...state, toasts: [...state.toasts, action.toast] };
    case 'toast-done':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    case 'set-flag':
      return { ...state, [action.flag]: action.value };
    case 'reset':
      // Resets mock data and switches; keeps who is logged in and the language.
      return { ...freshState(), session: state.session, role: state.role, lang: state.lang };
  }
}

interface Store extends State {
  user: User;
  ward: Ward;
  openAlerts: number;
  dispatch: React.Dispatch<Action>;
  toast: (text: string) => void;
  /** Saves an action and its reason in the audit log (safety rule 11). */
  logAudit: (action: string, reason: string) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, freshState);

  // Remember UI prefs only.
  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: state.lang, wardId: state.wardId }));
    document.documentElement.lang = state.lang;
  }, [state.lang, state.wardId]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ session: state.session, role: state.role, lockReason: state.lockReason }));
  }, [state.session, state.role, state.lockReason]);

  // Live mock events. Paused when logged out, when the server is "down" or when the Dev panel turns them off.
  // They keep running while the screen is locked, like a real ward.
  const loggedIn = state.session !== 'out';
  useEffect(() => {
    if (!loggedIn || !state.liveOn || state.serverDown) return;
    const timer = setInterval(() => dispatch({ type: 'live-tick', rand: Math.random(), at: new Date().toISOString() }), LIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loggedIn, state.liveOn, state.serverDown]);

  const toast = useCallback((text: string) => {
    const id = `t-${Date.now()}-${Math.random()}`;
    dispatch({ type: 'toast', toast: { id, text } });
    setTimeout(() => dispatch({ type: 'toast-done', id }), 4000);
  }, []);

  const user = USERS[state.role];
  const logAudit = useCallback(
    (action: string, reason: string) =>
      dispatch({ type: 'audit', entry: { id: `au-${Date.now()}`, at: new Date().toISOString(), by: user.name, action, reason } }),
    [user.name],
  );

  const value = useMemo<Store>(
    () => ({
      ...state,
      user,
      ward: WARDS.find((w) => w.id === state.wardId) ?? WARDS[0],
      openAlerts: state.alerts.filter((a) => !a.acknowledged).length,
      dispatch,
      toast,
      logAudit,
    }),
    [state, user, toast, logAudit],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

const DICTS: Record<Lang, Record<string, string>> = { en, bn };

/** Translate a key. `{name}` placeholders are filled from `vars`. Falls back to English. */
export function useT() {
  const { lang } = useStore();
  return useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let text = DICTS[lang][key] ?? DICTS.en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
      return text;
    },
    [lang],
  );
}
