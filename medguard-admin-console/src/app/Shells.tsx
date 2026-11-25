import { useEffect, useRef, useState } from 'react';
import {
  Activity, BedDouble, Building2, Camera, ChevronDown, ClipboardCheck, Clock3, Code2,
  CreditCard, FileClock, FilePenLine, Headset, LayoutDashboard, ListTree, LockKeyhole, LogOut,
  Menu, Pill, ScanLine, Server, Settings, ShieldAlert, Users, Video, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, matchPath, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Notice } from '../components';
import { useI18n } from '../i18n';
import { useMock } from '../mock/store';
import { useDemo } from '../dev/DemoContext';
import { DevPanel } from '../dev/DevPanel';
import { Brand, LanguageSwitch } from './Login';
import { usePageMotion } from './motion';
import { useSession } from './session';
import type { Area, DemoUser } from './session';
import { DemoPageState, OfflineBanner } from './states';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

const hospitalLinks: NavItem[] = [
  { label: 'Overview', to: '/hospital', icon: LayoutDashboard, end: true },
  { label: 'Staff', to: '/hospital/staff', icon: Users },
  { label: 'Beds', to: '/hospital/beds', icon: BedDouble },
  { label: 'Shift rules', to: '/hospital/shift-rules', icon: Clock3 },
  { label: 'Vitals', to: '/hospital/vitals', icon: Activity },
  { label: 'Formulary', to: '/hospital/formulary', icon: Pill },
  { label: 'Emergency access', to: '/hospital/emergency-access', icon: ShieldAlert },
  { label: 'Audit log', to: '/hospital/audit', icon: FileClock },
  { label: 'Subscription', to: '/hospital/subscription', icon: CreditCard },
  { label: 'Settings', to: '/hospital/settings', icon: Settings },
];

function teamLinks(hospitalId: string, cameraId?: string): NavItem[] {
  const hospital = '/medguard/hospitals/' + hospitalId;
  return [
    { label: 'Hospitals', to: '/medguard', icon: Building2, end: true },
    { label: 'Onboard hospital', to: '/medguard/onboard', icon: FilePenLine },
    { label: 'Wards and rooms', to: hospital + '/structure', icon: ListTree },
    { label: 'Cameras', to: hospital + '/cameras', icon: Camera },
    ...(cameraId ? [{ label: 'Bed-zone mapping', to: '/medguard/cameras/' + cameraId + '/mapping', icon: ScanLine }] : []),
    { label: 'Server and devices', to: hospital + '/infra', icon: Server },
    { label: 'Plans and billing', to: '/medguard/billing', icon: CreditCard },
    { label: 'Base formulary', to: '/medguard/formulary', icon: Pill },
    { label: 'BMDC check log', to: '/medguard/bmdc', icon: ClipboardCheck },
    { label: 'Support lookup', to: '/medguard/support', icon: Headset },
    { label: 'Team audit log', to: '/medguard/audit', icon: FileClock },
  ];
}

function TopBar({ user, organization }: { user: DemoUser; organization: string }) {
  const { t } = useI18n();
  const { lock } = useSession();
  const menu = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');

  function closeMenu() {
    if (menu.current) menu.current.open = false;
  }

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) closeMenu();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  return (
    <header className="admin-topbar">
      <div className="admin-org">
        {user.area === 'hospital' ? <Building2 size={20} aria-hidden="true" /> : <Video size={20} aria-hidden="true" />}
        <div><strong>{organization}</strong><small>{t(user.area === 'hospital' ? 'Hospital admin' : 'MedGuard team')}</small></div>
      </div>
      <div className="admin-topbar-actions">
        <LanguageSwitch />
        <details className="admin-account" ref={menu} onKeyDown={(event) => {
          if (event.key === 'Escape') { closeMenu(); summary.current?.focus(); }
        }}>
          <summary ref={summary} aria-label={t('Account menu for {name}', { name: user.name })}>
            <span className="admin-avatar" aria-hidden="true">{initials}</span>
            <span>{user.name}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="admin-account-menu">
            <button type="button" onClick={() => { closeMenu(); lock(); }}>
              <LockKeyhole size={18} aria-hidden="true" />{t('Lock session')}
            </button>
            <Link to={'/' + user.area + '/logout'} onClick={closeMenu}>
              <LogOut size={18} aria-hidden="true" />{t('Sign out')}
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}

function Shell({ area }: { area: Area }) {
  const { user } = useSession();
  const { t } = useI18n();
  const { db, storageError } = useMock();
  const { pageState } = useDemo();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const cameraId = matchPath('/medguard/cameras/:camId/mapping', pathname)?.params.camId;
  const selectedCamera = db.cameras.find((camera) => camera.id === cameraId);
  const scopedHospitalId = matchPath('/medguard/hospitals/:id/*', pathname)?.params.id ?? selectedCamera?.hospitalId ?? 'shanti';
  const firstCamera = selectedCamera ?? db.cameras.find((camera) => camera.hospitalId === scopedHospitalId);
  const links = area === 'hospital' ? hospitalLinks : teamLinks(scopedHospitalId, firstCamera?.id);
  const organization = area === 'hospital'
    ? db.hospitals.find((hospital) => hospital.id === user?.hospitalId)?.name ?? t('Hospital administration')
    : t('MedGuard operations');

  usePageMotion(main, pathname);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!user) return null;

  return (
    <div className="admin-shell">
      <a className="admin-skip-link" href="#console-main">{t('Skip to main content')}</a>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <Link to={'/' + area} onClick={() => setNavOpen(false)}><Brand /></Link>
          <button type="button" className="admin-nav-toggle" onClick={() => setNavOpen(!navOpen)}
            aria-expanded={navOpen} aria-controls="console-navigation" aria-label={t(navOpen ? 'Close navigation' : 'Open navigation')}>
            {navOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
        <div id="console-navigation" className={'admin-sidebar-content' + (navOpen ? ' is-open' : '')}>
          <nav aria-label={t('Main navigation')}>
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={label} to={to} end={end} onClick={() => setNavOpen(false)}>
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                {t(label)}
              </NavLink>
            ))}
          </nav>
          <div className="admin-sidebar-footer">
            <button type="button" onClick={() => { setNavOpen(false); setDevOpen(true); }}>
              <Code2 size={20} strokeWidth={1.75} aria-hidden="true" />{t('Demo controls')}
            </button>
          </div>
        </div>
      </aside>
      <div className="admin-workspace">
        <TopBar user={user} organization={organization} />
        <div className="admin-workspace-status">
          <OfflineBanner />
          {storageError && <Notice tone="warning">{t('Demo changes could not be saved to this browser. Keep this tab open to retain them.')}</Notice>}
        </div>
        <main className="admin-content" id="console-main" tabIndex={-1} ref={main}>
          <div className="admin-content-inner" hidden={pageState !== 'ready'}><Outlet /></div>
          <DemoPageState />
        </main>
      </div>
      {devOpen && <DevPanel onClose={() => setDevOpen(false)} />}
    </div>
  );
}

export function HospitalShell() {
  return <Shell area="hospital" />;
}

export function MedGuardShell() {
  return <Shell area="medguard" />;
}
