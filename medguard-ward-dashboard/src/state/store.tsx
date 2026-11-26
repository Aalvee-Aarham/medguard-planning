// App state: who is logged in, the ward's live data, Dev panel switches, audit log and toasts.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import bn from '../i18n/bn.json';
import en from '../i18n/en.json';
import { USERS, WARDS, initialAlerts, initialBeds } from '../mock/data';
import { LIVE_INTERVAL_MS, nextLiveEvent } from '../mock/liveEvents';
import type { Alert, AuditEntry, Bed, Role, User, Ward } from '../mock/types';

export type Lang = 'en' | 'bn';

interface Toast {
  id: string;
  text: string;
}

interface State {
  role: Role;
  wardId: string;
  lang: Lang;
  beds: Bed[];
  alerts: Alert[];
  audit: AuditEntry[];
  toasts: Toast[];
  alertsOpen: boolean;
  // Dev panel switches
  liveOn: boolean;
  serverDown: boolean;
  forceErrors: boolean;
}

type Action =
  | { type: 'set-role'; role: Role }
  | { type: 'set-ward'; wardId: string }
  | { type: 'set-lang'; lang: Lang }
  | { type: 'alerts-open'; open: boolean }
  | { type: 'ack'; id: string; by: string }
  | { type: 'add-alert'; alert: Alert }
  | { type: 'live-tick'; rand: number; at: string }
  | { type: 'audit'; entry: AuditEntry }
  | { type: 'toast'; toast: Toast }
  | { type: 'toast-done'; id: string }
  | { type: 'set-flag'; flag: 'liveOn' | 'serverDown' | 'forceErrors'; value: boolean }
  | { type: 'reset' };

const PREFS_KEY = 'mg-dashboard-prefs';
const MAX_ALERTS = 50;

function loadPrefs(): Pick<State, 'lang' | 'wardId'> {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    return { lang: saved.lang === 'bn' ? 'bn' : 'en', wardId: WARDS.some((w) => w.id === saved.wardId) ? saved.wardId : WARDS[0].id };
  } catch {
    return { lang: 'en', wardId: WARDS[0].id };
  }
}

function freshState(): State {
  return {
    role: 'manager',
    ...loadPrefs(),
    beds: initialBeds(),
    alerts: initialAlerts(),
    audit: [],
    toasts: [],
    alertsOpen: false,
    liveOn: true,
    serverDown: false,
    forceErrors: false,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
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
      const ev = nextLiveEvent(state.beds, state.alerts, action.rand, action.at);
      return {
        ...state,
        beds: ev.bed ? state.beds.map((b) => (b.id === ev.bed!.id ? { ...b, ...ev.bed } : b)) : state.beds,
        alerts: ev.alert ? [ev.alert, ...state.alerts].slice(0, MAX_ALERTS) : state.alerts,
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
      return { ...freshState(), lang: state.lang };
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

  // Live mock events. Paused when the server is "down" or the Dev panel turns them off.
  useEffect(() => {
    if (!state.liveOn || state.serverDown) return;
    const timer = setInterval(() => dispatch({ type: 'live-tick', rand: Math.random(), at: new Date().toISOString() }), LIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [state.liveOn, state.serverDown]);

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
