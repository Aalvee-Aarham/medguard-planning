// D2 Choose ward: for managers who cover more than one ward.
import { BedDouble, Bell, Building2, ChevronRight, LogOut } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LangToggle } from '../../components/LangToggle';
import { WARDS } from '../../mock/data';
import type { Ward } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { AuthLayout } from './AuthLayout';

export function ChooseWard() {
  const { wardId, beds, openAlerts, user, dispatch } = useStore();
  const t = useT();
  const navigate = useNavigate();
  const next = useSearchParams()[0].get('next');

  // Only Neuro Ward B has live mock data; other wards show fixed numbers.
  const stats = (w: Ward) =>
    w.id === 'neuro-b'
      ? { free: beds.filter((b) => b.status === 'ready' || b.status === 'cleaning').length, alerts: openAlerts }
      : { free: w.mockFreeBeds ?? 0, alerts: w.mockOpenAlerts ?? 0 };

  const choose = (id: string) => {
    dispatch({ type: 'set-ward', wardId: id });
    // Only follow "next" if it is a path inside this app.
    navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true });
  };

  return (
    <AuthLayout wide aside={<LangToggle />}>
      <h1 className="text-2xl font-semibold">{t('ward.title')}</h1>
      <p className="mt-1 text-ink-700">{t('ward.subtitle', { name: user.name, n: WARDS.length })}</p>

      <ul className="mt-6 grid grid-cols-2 gap-4">
        {WARDS.map((w) => {
          const s = stats(w);
          const last = w.id === wardId;
          return (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => choose(w.id)}
                aria-label={t('ward.open', { ward: w.name })}
                className={`group flex w-full flex-col rounded-card border p-4 text-left hover:border-primary-600 hover:bg-primary-50 ${
                  last ? 'border-primary-600' : 'border-border-subtle'
                }`}
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <span className="text-lg font-semibold">{w.name}</span>
                  {last && <span className="rounded-full bg-primary-100 px-2 text-sm font-semibold text-primary-700">{t('ward.last')}</span>}
                </span>
                <span className="mt-1 flex items-center gap-1 text-sm text-ink-700">
                  <Building2 size={16} aria-hidden /> {w.hospital} · {t('ward.beds', { n: w.beds })}
                </span>
                <span className="mt-4 flex items-end justify-between">
                  <span className="flex gap-6">
                    <span>
                      <span className="flex items-center gap-1 text-sm text-ink-700"><BedDouble size={16} aria-hidden /> {t('ward.free')}</span>
                      <span className="text-[28px] font-bold leading-9 tabular-nums">{s.free}</span>
                    </span>
                    <span>
                      <span className="flex items-center gap-1 text-sm text-ink-700"><Bell size={16} aria-hidden /> {t('ward.alerts')}</span>
                      <span className={`text-[28px] font-bold leading-9 tabular-nums ${s.alerts ? 'text-danger-text' : ''}`}>{s.alerts}</span>
                    </span>
                  </span>
                  <ChevronRight size={24} aria-hidden className="text-primary-600" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={() => dispatch({ type: 'logout' })} className="mt-6 inline-flex h-10 items-center gap-2 text-sm font-semibold text-primary-600 hover:underline">
        <LogOut size={16} aria-hidden /> {t('user.logout')}
      </button>
    </AuthLayout>
  );
}
