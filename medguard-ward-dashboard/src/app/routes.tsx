import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { NoAccess } from '../components/States';
import { ComponentGallery } from '../dev/ComponentGallery';
import { ScreenIndex } from '../dev/ScreenIndex';
import { ChooseWard } from '../screens/login/ChooseWard';
import { Login } from '../screens/login/Login';
import { Placeholder } from '../screens/Placeholder';
import { useStore, useT } from '../state/store';
import { canSee } from './access';
import { SCREENS, type Section } from './screens';
import { Shell } from './Shell';

/** Shows "No access" when the current user may not open this section. */
function RoleGate({ section, children }: { section: Section; children: React.ReactNode }) {
  const { role } = useStore();
  return canSee(role, section) ? <>{children}</> : <NoAccess />;
}

function NotFound() {
  const t = useT();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{t('notFound.title')}</h1>
      <Link to="/" className="font-semibold text-primary-600 hover:underline">{t('notFound.link')}</Link>
    </div>
  );
}

/** Sends logged-out visitors to D1 Login, remembering where they wanted to go. */
function RequireSession({ children }: { children: React.ReactNode }) {
  const { session } = useStore();
  const { pathname } = useLocation();
  if (session === 'out') return <Navigate to="/login" replace state={{ from: pathname }} />;
  return <>{children}</>;
}

/** D2 is only for managers; the admission desk goes straight to the queue. */
function ManagerOnly({ children }: { children: React.ReactNode }) {
  const { role } = useStore();
  return role === 'desk' ? <Navigate to="/queue" replace /> : <>{children}</>;
}

export function AppRoutes() {
  const inShell = SCREENS.filter((s) => s.section !== 'access');
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/ward" element={<RequireSession><ManagerOnly><ChooseWard /></ManagerOnly></RequireSession>} />
      <Route element={<RequireSession><Shell /></RequireSession>}>
        {inShell.map((s) => (
          <Route key={s.id} path={s.path} element={<RoleGate section={s.section}><Placeholder screen={s} /></RoleGate>} />
        ))}
        <Route path="/dev/screens" element={<ScreenIndex />} />
        <Route path="/dev/components" element={<ComponentGallery />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
