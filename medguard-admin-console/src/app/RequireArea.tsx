import { ShieldAlert } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Brand, LanguageSwitch } from './Login';
import { loginPath, useSession } from './session';
import type { Area } from './session';
import { OfflineBanner } from './states';

export function RequireArea({ area }: { area: Area }) {
  const { t } = useI18n();
  const { user } = useSession();
  const { pathname, search } = useLocation();

  if (!user) return <Navigate to={loginPath(area)} state={{ returnTo: pathname + search }} replace />;
  if (user.area === area) return <Outlet />;

  return (
    <div className="admin-login">
      <header className="admin-login-header"><Brand /><LanguageSwitch /></header>
      <OfflineBanner />
      <main className="admin-status-page">
        <div className="admin-login-card stack">
          <ShieldAlert className="admin-state-icon" size={32} aria-hidden="true" />
          <h1>{t('No access')}</h1>
          <p>{t('Your account belongs to a different area of the Admin Console.')}</p>
          <Link className="admin-inline-link" to={'/' + user.area}>{t('Return to your area')}</Link>
        </div>
      </main>
    </div>
  );
}
