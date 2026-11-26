// Dev panel: fake events and switches for testing on mock data. Not part of the real product.
import { Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MOCK_OTP, MOCK_PIN } from '../mock/auth';
import { LIVE_INTERVAL_MS } from '../mock/liveEvents';
import type { AlertTier, Role } from '../mock/types';
import { useStore } from '../state/store';

const ROLES: { role: Role; label: string }[] = [
  { role: 'manager', label: 'Ward manager (Habib)' },
  { role: 'desk', label: 'Admission desk (Salma)' },
  { role: 'manager-senior', label: 'Manager as senior nurse' },
];

const LATER = [
  { label: 'Fall Bed 7, no acknowledgement', step: 8 },
  { label: 'Fall Bed 7, acknowledged', step: 8 },
  { label: 'New urgency request', step: 5 },
];

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex h-10 cursor-pointer items-center justify-between gap-4">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-primary-600" />
    </label>
  );
}

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const { role, session, liveOn, serverDown, forceErrors, quickLock, audit, beds, dispatch } = useStore();
  const bed2Occupied = beds.find((b) => b.id === 2)?.status === 'occupied';
  const navigate = useNavigate();

  const switchRole = (r: Role) => {
    dispatch({ type: 'set-role', role: r });
    if (r === 'desk') navigate('/queue');
  };

  const addAlert = (tier: AlertTier) => {
    const at = new Date().toISOString();
    dispatch({
      type: 'add-alert',
      alert: {
        id: `dev-${at}`, tier, kind: 'test', at, acknowledged: false,
        title: { key: `alert.test.${tier}` },
        detail: { key: 'alert.test.detail' },
      },
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-[58] inline-flex h-10 items-center gap-2 rounded-full bg-ink-900 px-4 font-semibold text-surface shadow-float"
      >
        <Wrench size={16} aria-hidden /> Dev
      </button>
    );
  }

  return (
    <div role="dialog" aria-label="Dev panel" className="fixed bottom-6 left-6 z-[58] max-h-[85vh] w-80 overflow-y-auto rounded-dialog border border-border-subtle bg-surface p-4 shadow-float">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold"><Wrench size={16} aria-hidden /> Dev panel</h2>
        <button type="button" aria-label="Close Dev panel" onClick={() => setOpen(false)} className="btn-icon"><X size={20} aria-hidden /></button>
      </div>
      <p className="text-sm text-ink-500">Mock data only. Not shown in the real app.</p>

      <fieldset className="mt-4">
        <legend className="mb-1 text-sm font-semibold text-ink-700">Switch user</legend>
        {ROLES.map((r) => (
          <label key={r.role} className="flex h-10 cursor-pointer items-center gap-2">
            <input type="radio" name="dev-role" checked={role === r.role} onChange={() => switchRole(r.role)} className="h-5 w-5 accent-primary-600" />
            {r.label}
          </label>
        ))}
      </fieldset>

      <div className="mt-4 border-t border-border-subtle pt-2">
        <Toggle label={`Live events (every ${LIVE_INTERVAL_MS / 1000} s)`} checked={liveOn} onChange={(v) => dispatch({ type: 'set-flag', flag: 'liveOn', value: v })} />
        <Toggle label="Hospital server unreachable" checked={serverDown} onChange={(v) => dispatch({ type: 'set-flag', flag: 'serverDown', value: v })} />
        <Toggle label="Force errors" checked={forceErrors} onChange={(v) => dispatch({ type: 'set-flag', flag: 'forceErrors', value: v })} />
      </div>

      <div className="mt-2 space-y-2 border-t border-border-subtle pt-2">
        <p className="text-sm font-semibold text-ink-700">
          Session: {session === 'in' ? 'logged in' : session === 'locked' ? 'locked' : 'logged out'}
        </p>
        <Toggle label="Quick auto-lock (30 s, not 5 min)" checked={quickLock} onChange={(v) => dispatch({ type: 'set-flag', flag: 'quickLock', value: v })} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={session !== 'in'} onClick={() => dispatch({ type: 'lock', reason: 'idle' })} className="btn-secondary h-10 px-2 text-sm">Lock now</button>
          <button type="button" disabled={session === 'out'} onClick={() => dispatch({ type: 'logout' })} className="btn-secondary h-10 px-2 text-sm">Log out</button>
        </div>
        <p className="text-xs text-ink-500 tabular-nums">Login: 01711000001 (Habib) or 01711000002 (Salma) · code {MOCK_OTP} · PIN {MOCK_PIN}</p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border-subtle pt-4">
        <button type="button" onClick={() => addAlert('high')} className="btn-secondary h-10 px-2 text-sm">+ High alert</button>
        <button type="button" onClick={() => addAlert('normal')} className="btn-secondary h-10 px-2 text-sm">+ Normal alert</button>
      </div>

      <div className="mt-4 space-y-2 border-t border-border-subtle pt-4">
        <p className="text-sm font-semibold text-ink-700">Ward events (from the Ward app)</p>
        <button
          type="button"
          disabled={!bed2Occupied}
          onClick={() => dispatch({ type: 'discharge', bedId: 2, at: new Date().toISOString() })}
          className="btn-secondary h-10 w-full text-sm"
        >
          Discharge Bed 2
        </button>
        {!bed2Occupied && <p className="text-xs text-ink-500">Bed 2 is empty. Use Reset to bring the patient back.</p>}
      </div>

      <div className="mt-4 space-y-1 border-t border-border-subtle pt-2">
        <p className="text-sm font-semibold text-ink-700">Coming in later steps</p>
        {LATER.map((l) => (
          <button key={l.label} type="button" disabled className="flex h-10 w-full items-center justify-between rounded-control px-2 text-left text-sm text-ink-500">
            {l.label} <span className="text-xs">step {l.step}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-border-subtle pt-4 text-sm">
        <Link to="/dev/screens" className="font-semibold text-primary-600 hover:underline">All 21 screens →</Link>
        <Link to="/dev/components" className="font-semibold text-primary-600 hover:underline">Component gallery →</Link>
        <span className="text-ink-500">Audit log entries: {audit.length}</span>
        <button type="button" onClick={() => { dispatch({ type: 'reset' }); navigate('/'); }} className="btn-secondary mt-2 h-10">Reset all mock data</button>
      </div>
    </div>
  );
}
