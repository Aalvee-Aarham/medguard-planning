// 248 px sidebar (PLAN.md section 5). Active item: primary-50 background, primary-700 text, 3 px blue bar on the left.
// Items are grouped; the active highlight slides to the new item (200 ms, off under "reduce motion").
// Admission desk sees only Queue.
import { Lock, ShieldPlus } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStore, useT } from '../state/store';
import { canSee } from './access';
import { NAV, type Section } from './screens';

const GROUPS: { id: string; sections: Section[] }[] = [
  { id: 'ward', sections: ['overview', 'camera', 'beds'] },
  { id: 'patients', sections: ['queue', 'patients'] },
  { id: 'team', sections: ['staff', 'shifts'] },
  { id: 'review', sections: ['incidents', 'reports', 'approvals'] },
];

export function Sidebar() {
  const { role, queue, lang, dispatch } = useStore();
  const t = useT();
  const { pathname } = useLocation();
  const nav = useRef<HTMLElement>(null);
  const [mark, setMark] = useState<{ top: number; height: number } | null>(null);

  // Urgency requests waiting for an answer (D10): shown as a count on Queue.
  const openRequests = queue.filter((q) => q.urgencyRequest?.status === 'open').length;

  // Move the highlight under the active link; measure again when the language or text size changes it.
  useLayoutEffect(() => {
    const active = nav.current?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!active || !nav.current) { setMark(null); return; }
    const measure = () => setMark({ top: active.offsetTop, height: active.offsetHeight });
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(nav.current);
    watch.observe(active);
    return () => watch.disconnect();
  }, [pathname, role, lang]);

  const visible = GROUPS
    .map((g) => ({ ...g, items: NAV.filter((n) => g.sections.includes(n.section) && canSee(role, n.section)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-border-subtle bg-surface">
      <div className="flex h-16 items-center gap-3 px-6">
        <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-control bg-primary-600 text-surface">
          <ShieldPlus size={24} strokeWidth={1.75} />
        </span>
        <div className="leading-5">
          <div className="font-bold italic tracking-tight text-primary-700">{t('app.name')}</div>
          <div className="text-sm text-ink-700">{t('app.subtitle')}</div>
        </div>
      </div>

      <nav ref={nav} aria-label={t('nav.label')} className="relative flex-1 overflow-y-auto px-3 pb-4">
        {/* Sliding highlight: primary-50 pill with the 3 px blue bar at the sidebar's left edge. */}
        {mark && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-3 rounded-control bg-primary-50 transition-[top,height] duration-200 ease-out motion-reduce:transition-none before:absolute before:inset-y-0 before:-left-3 before:w-[3px] before:bg-primary-600"
            style={{ top: mark.top, height: mark.height }}
          />
        )}

        {visible.map((group) => (
          <div key={group.id} className="mt-4 first:mt-2">
            <p className="px-3 pb-1 text-sm font-semibold text-ink-500">{t(`nav.group.${group.id}`)}</p>
            <ul className="space-y-1">
              {group.items.map(({ section, to, icon: Icon }) => (
                <li key={section}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `group relative flex min-h-12 items-center gap-3 rounded-control px-3 py-2 font-semibold transition-colors duration-150 ease-out ${
                        isActive ? 'text-primary-700' : 'text-ink-700 hover:bg-page hover:text-ink-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control transition-colors duration-150 ease-out ${
                            isActive ? 'bg-primary-600 text-surface' : 'text-ink-700 group-hover:text-primary-600'
                          }`}
                        >
                          <Icon size={20} strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1 leading-5">{t(`nav.${section}`)}</span>
                        {section === 'queue' && openRequests > 0 && (
                          <span className="shrink-0 rounded-full bg-primary-600 px-2 text-sm tabular-nums text-surface" title={t('nav.openRequests', { n: openRequests })}>
                            {openRequests}
                            <span className="sr-only"> {t('nav.openRequests', { n: openRequests })}</span>
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Shared PCs: locking is one tap away. */}
      <div className="border-t border-border-subtle p-3">
        <button
          type="button"
          onClick={() => dispatch({ type: 'lock', reason: 'manual' })}
          className="flex h-12 w-full items-center gap-3 rounded-control px-3 font-semibold text-ink-700 transition-colors duration-150 ease-out hover:bg-page hover:text-ink-900"
        >
          <span aria-hidden className="flex h-8 w-8 items-center justify-center"><Lock size={20} strokeWidth={1.75} /></span>
          {t('user.lock')}
        </button>
      </div>
    </aside>
  );
}
