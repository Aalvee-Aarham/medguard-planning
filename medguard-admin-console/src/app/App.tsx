import { useEffect, useMemo, useRef } from 'react';
import {
  createBrowserRouter, Link, Navigate, Outlet, RouterProvider, useLocation, useNavigate, useParams,
} from 'react-router-dom';
import { Button, EmptyState, Skeleton } from '../components';
import { I18nProvider, useI18n } from '../i18n';
import { MockProvider, useMock } from '../mock/store';
import { DemoProvider, useDemo } from '../dev/DemoContext';
import { Brand, LanguageSwitch, Login } from './Login';
import { HospitalShell, MedGuardShell } from './Shells';
import { RequireArea } from './RequireArea';
import { demoUsers, loginPath, SessionProvider, useSession } from './session';
import type { Area } from './session';
import { OfflineBanner, SystemStateDialogs } from './states';
import './app.css';

function RootLayout() {
  return (
    <>
      <Outlet />
      <SystemStateDialogs />
    </>
  );
}

function HomeRedirect() {
  const { user } = useSession();
  return <Navigate to={user ? '/' + user.area : '/login'} replace />;
}

function SignOut({ area }: { area: Area }) {
  const { signOut } = useSession();
  const { t } = useI18n();
  const navigate = useNavigate();
  useEffect(() => {
    signOut();
    void navigate(loginPath(area), { replace: true });
  }, [signOut, navigate, area]);
  return <Skeleton label={t('Signing out')} />;
}

function DemoAccountTransition() {
  const { id } = useParams();
  const { user, locked, signIn } = useSession();
  const { reset } = useMock();
  const { setPageState, setSimulatedOffline } = useDemo();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const applied = useRef(false);
  const account = demoUsers.find((demo) => demo.id === id);
  const requested = location.state?.demoSwitch === true;
  const resetRequested = location.state?.reset === true;

  useEffect(() => {
    if (applied.current || !user || locked || !account || !requested) return;
    applied.current = true;
    if (resetRequested) {
      reset();
      setPageState('ready');
      setSimulatedOffline(false);
    }
    signIn(account);
    void navigate('/' + account.area, { replace: true });
  }, [account, user, locked, requested, resetRequested, reset, setPageState, setSimulatedOffline, signIn, navigate]);

  if (!user) return <Navigate to="/login" replace />;
  if (!account || !requested) return <Navigate to={'/' + user.area} replace />;
  return <Skeleton label={t('Switching demo user')} />;
}

function PageProblem({ missing = false }: { missing?: boolean }) {
  const { t } = useI18n();
  const { user } = useSession();

  return (
    <div className="admin-login">
      <header className="admin-login-header"><Brand /><LanguageSwitch /></header>
      <OfflineBanner />
      <main className="admin-status-page">
        <EmptyState
          title={t(missing ? 'Page not found' : 'This screen could not load')}
          description={t(missing ? 'Return to the Admin Console to continue.' : 'Retry to load the screen again.')}
          action={missing
            ? <Link className="admin-inline-link" to={user ? '/' + user.area : '/login'}>{t('Go to Admin Console')}</Link>
            : <Button type="button" onClick={() => window.location.reload()}>{t('Retry')}</Button>}
        />
      </main>
    </div>
  );
}

const hospital = () => import('../screens/hospital');
const team = () => import('../screens/medguard');

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    hydrateFallbackElement: <Skeleton />,
    errorElement: <PageProblem />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'login', element: <Login key="hospital" area="hospital" /> },
      { path: 'medguard/login', element: <Login key="medguard" area="medguard" /> },
      { path: 'demo-account/:id', element: <DemoAccountTransition /> },
      {
        path: 'hospital',
        element: <RequireArea area="hospital" />,
        children: [
          { path: 'logout', element: <SignOut area="hospital" /> },
          {
            element: <HospitalShell />,
            children: [
              { index: true, lazy: async () => ({ Component: (await hospital()).Overview }) },
              { path: 'staff', lazy: async () => ({ Component: (await hospital()).StaffList }) },
              { path: 'staff/new', lazy: async () => ({ Component: (await hospital()).StaffForm }) },
              { path: 'staff/:id', lazy: async () => ({ Component: (await hospital()).StaffForm }) },
              { path: 'beds', lazy: async () => ({ Component: (await hospital()).Beds }) },
              { path: 'shift-rules', lazy: async () => ({ Component: (await hospital()).ShiftRules }) },
              { path: 'vitals', lazy: async () => ({ Component: (await hospital()).Vitals }) },
              { path: 'formulary', lazy: async () => ({ Component: (await hospital()).Formulary }) },
              { path: 'emergency-access', lazy: async () => ({ Component: (await hospital()).EmergencyAccess }) },
              { path: 'audit', lazy: async () => ({ Component: (await hospital()).Audit }) },
              { path: 'subscription', lazy: async () => ({ Component: (await hospital()).Subscription }) },
              { path: 'settings', lazy: async () => ({ Component: (await hospital()).Settings }) },
            ],
          },
        ],
      },
      {
        path: 'medguard',
        element: <RequireArea area="medguard" />,
        children: [
          { path: 'logout', element: <SignOut area="medguard" /> },
          {
            element: <MedGuardShell />,
            children: [
              { index: true, lazy: async () => ({ Component: (await team()).Hospitals }) },
              { path: 'onboard', lazy: async () => ({ Component: (await team()).Onboard }) },
              { path: 'hospitals/:id/structure', lazy: async () => ({ Component: (await team()).Structure }) },
              { path: 'hospitals/:id/cameras', lazy: async () => ({ Component: (await team()).Cameras }) },
              { path: 'cameras/:camId/mapping', lazy: async () => ({ Component: (await team()).Mapping }) },
              { path: 'hospitals/:id/infra', lazy: async () => ({ Component: (await team()).Infrastructure }) },
              { path: 'billing', lazy: async () => ({ Component: (await team()).Billing }) },
              { path: 'formulary', lazy: async () => ({ Component: (await team()).Formulary }) },
              { path: 'bmdc', lazy: async () => ({ Component: (await team()).Bmdc }) },
              { path: 'support', lazy: async () => ({ Component: (await team()).Support }) },
              { path: 'audit', lazy: async () => ({ Component: (await team()).Audit }) },
            ],
          },
        ],
      },
      { path: '*', element: <PageProblem missing /> },
    ],
  },
]);

function AppProviders() {
  const { user } = useSession();
  const actor = useMemo(() => user && ({ area: user.area, name: user.name, hospitalId: user.hospitalId }), [user]);

  return (
    <MockProvider actor={actor}>
      <DemoProvider>
        <RouterProvider router={router} />
      </DemoProvider>
    </MockProvider>
  );
}

export function App() {
  return (
    <I18nProvider>
      <SessionProvider>
        <AppProviders />
      </SessionProvider>
    </I18nProvider>
  );
}
