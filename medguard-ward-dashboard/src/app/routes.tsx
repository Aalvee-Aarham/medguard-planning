import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { NoAccess } from '../components/States';
import { ComponentGallery } from '../dev/ComponentGallery';
import { ScreenIndex } from '../dev/ScreenIndex';
import { ChooseWard } from '../screens/login/ChooseWard';
import { Login } from '../screens/login/Login';
import { BedBoard } from '../screens/beds/BedBoard';
import { BedDetail } from '../screens/beds/BedDetail';
import { CameraWall } from '../screens/camera/CameraWall';
import { SingleCamera } from '../screens/camera/SingleCamera';
import { Overview } from '../screens/overview/Overview';
import { ShiftPlanner } from '../screens/shifts/ShiftPlanner';
import { SwapRequests } from '../screens/shifts/SwapRequests';
import { AssignBeds } from '../screens/staff/AssignBeds';
import { StaffOnDuty } from '../screens/staff/StaffOnDuty';
import { AddToQueue } from '../screens/queue/AddToQueue';
import { AssignBed } from '../screens/queue/AssignBed';
import { Queue } from '../screens/queue/Queue';
import { UrgencyRequests } from '../screens/queue/UrgencyRequests';
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

/** Screens that are built. Everything else shows its placeholder until its step. */
const BUILT: Record<string, () => React.ReactElement> = {
  D3: Overview,
  D4: CameraWall,
  D5: SingleCamera,
  D6: BedBoard,
  D7: BedDetail,
  D8: Queue,
  D9: AddToQueue,
  D10: UrgencyRequests,
  D11: AssignBed,
  D12: StaffOnDuty,
  D13: AssignBeds,
  D14: ShiftPlanner,
  D15: SwapRequests,
};

export function AppRoutes() {
  const inShell = SCREENS.filter((s) => s.section !== 'access');
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/ward" element={<RequireSession><ManagerOnly><ChooseWard /></ManagerOnly></RequireSession>} />
      <Route element={<RequireSession><Shell /></RequireSession>}>
        {inShell.map((s) => {
          const Screen = BUILT[s.id];
          return (
            <Route key={s.id} path={s.path} element={<RoleGate section={s.section}>{Screen ? <Screen /> : <Placeholder screen={s} />}</RoleGate>} />
          );
        })}
        <Route path="/dev/screens" element={<ScreenIndex />} />
        <Route path="/dev/components" element={<ComponentGallery />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
