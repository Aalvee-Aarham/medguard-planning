import { Link, Route, Routes } from 'react-router-dom';
import { NoAccess } from '../components/States';
import { ComponentGallery } from '../dev/ComponentGallery';
import { ScreenIndex } from '../dev/ScreenIndex';
import { Placeholder } from '../screens/Placeholder';
import { useStore } from '../state/store';
import { canSee } from './access';
import { SCREENS, type Section } from './screens';
import { Shell } from './Shell';

/** Shows "No access" when the current user may not open this section. */
function RoleGate({ section, children }: { section: Section; children: React.ReactNode }) {
  const { role } = useStore();
  return canSee(role, section) ? <>{children}</> : <NoAccess />;
}

function NotFound() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="font-semibold text-primary-600 hover:underline">Go to Overview</Link>
    </div>
  );
}

// D1 and D2 are full-page screens, outside the sidebar layout.
function AccessPlaceholder({ id }: { id: string }) {
  const screen = SCREENS.find((s) => s.id === id)!;
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-lg rounded-card border border-border-subtle bg-surface p-8">
        <Placeholder screen={screen} />
        <Link to="/" className="btn-primary mt-6">Continue to dashboard</Link>
      </div>
    </div>
  );
}

export function AppRoutes() {
  const inShell = SCREENS.filter((s) => s.section !== 'access');
  return (
    <Routes>
      <Route path="/login" element={<AccessPlaceholder id="D1" />} />
      <Route path="/ward" element={<AccessPlaceholder id="D2" />} />
      <Route element={<Shell />}>
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
