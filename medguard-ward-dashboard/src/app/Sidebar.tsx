import { ShieldPlus } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useStore, useT } from '../state/store';
import { canSee } from './access';
import { NAV } from './screens';

export function Sidebar() {
  const { role } = useStore();
  const t = useT();

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-border-subtle bg-surface">
      <div className="flex h-16 items-center gap-2 border-b border-border-subtle px-6">
        <ShieldPlus size={24} strokeWidth={1.75} aria-hidden className="text-primary-600" />
        <div className="leading-5">
          <div className="font-bold text-primary-700">{t('app.name')}</div>
          <div className="text-sm text-ink-700">{t('app.subtitle')}</div>
        </div>
      </div>

      <nav aria-label={t('nav.label')} className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {NAV.filter((item) => canSee(role, item.section)).map(({ section, to, icon: Icon }) => (
            <li key={section}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `relative flex h-12 items-center gap-3 px-6 font-semibold ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary-600'
                      : 'text-ink-700 hover:bg-page hover:text-ink-900'
                  }`
                }
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden />
                {t(`nav.${section}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
