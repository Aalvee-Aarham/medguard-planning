// All 21 screens from PLAN.md section 6, named by their plan IDs.
// Names and descriptions live in i18n as screen.<id>.title / screen.<id>.about.
// `step` is the build step that turns the placeholder into the real screen.
import {
  BedDouble, CalendarDays, Cctv, ChartColumn, ClipboardCheck, LayoutDashboard, ListOrdered, Siren, UserSearch, Users,
  type LucideIcon,
} from 'lucide-react';

export type Section = 'access' | 'overview' | 'camera' | 'beds' | 'queue' | 'staff' | 'shifts' | 'incidents' | 'reports' | 'patients' | 'approvals';

export interface Screen {
  id: string;
  path: string;
  /** Link used to open the screen (fills in :params with mock IDs). */
  href: string;
  section: Section;
  step: number;
}

export const SCREENS: Screen[] = [
  { id: 'D1', path: '/login', href: '/login', section: 'access', step: 2 },
  { id: 'D2', path: '/ward', href: '/ward', section: 'access', step: 2 },
  { id: 'D3', path: '/', href: '/', section: 'overview', step: 3 },
  { id: 'D4', path: '/camera', href: '/camera', section: 'camera', step: 6 },
  { id: 'D5', path: '/camera/:camId', href: '/camera/CAM-01', section: 'camera', step: 6 },
  { id: 'D6', path: '/beds', href: '/beds', section: 'beds', step: 4 },
  { id: 'D7', path: '/beds/:bedId', href: '/beds/7', section: 'beds', step: 4 },
  { id: 'D8', path: '/queue', href: '/queue', section: 'queue', step: 5 },
  { id: 'D9', path: '/queue/add', href: '/queue/add', section: 'queue', step: 5 },
  { id: 'D10', path: '/queue/requests', href: '/queue/requests', section: 'queue', step: 5 },
  { id: 'D11', path: '/queue/assign/:bedId', href: '/queue/assign/3', section: 'queue', step: 5 },
  { id: 'D12', path: '/staff', href: '/staff', section: 'staff', step: 7 },
  { id: 'D13', path: '/staff/assign', href: '/staff/assign', section: 'staff', step: 7 },
  { id: 'D14', path: '/shifts', href: '/shifts', section: 'shifts', step: 7 },
  { id: 'D15', path: '/shifts/swaps', href: '/shifts/swaps', section: 'shifts', step: 7 },
  { id: 'D16', path: '/incidents', href: '/incidents', section: 'incidents', step: 8 },
  { id: 'D17', path: '/incidents/:id', href: '/incidents/INC-1', section: 'incidents', step: 8 },
  { id: 'D18', path: '/reports/doses', href: '/reports/doses', section: 'reports', step: 8 },
  { id: 'D19', path: '/reports', href: '/reports', section: 'reports', step: 8 },
  { id: 'D20', path: '/patients', href: '/patients', section: 'patients', step: 9 },
  { id: 'D21', path: '/approvals', href: '/approvals', section: 'approvals', step: 9 },
];

export interface NavItem {
  section: Section;
  to: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { section: 'overview', to: '/', icon: LayoutDashboard },
  { section: 'camera', to: '/camera', icon: Cctv },
  { section: 'beds', to: '/beds', icon: BedDouble },
  { section: 'queue', to: '/queue', icon: ListOrdered },
  { section: 'staff', to: '/staff', icon: Users },
  { section: 'shifts', to: '/shifts', icon: CalendarDays },
  { section: 'incidents', to: '/incidents', icon: Siren },
  { section: 'reports', to: '/reports', icon: ChartColumn },
  { section: 'patients', to: '/patients', icon: UserSearch },
  { section: 'approvals', to: '/approvals', icon: ClipboardCheck },
];
