// All 21 screens from PLAN.md section 6, named by their plan IDs.
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
  title: string;
  about: string;
  section: Section;
  step: number;
}

export const SCREENS: Screen[] = [
  { id: 'D1', path: '/login', href: '/login', title: 'Login', about: 'Phone + OTP (mock 123456), then PIN; session times out on shared PCs', section: 'access', step: 2 },
  { id: 'D2', path: '/ward', href: '/ward', title: 'Choose ward', about: 'For managers covering more than one ward', section: 'access', step: 2 },
  { id: 'D3', path: '/', href: '/', title: 'Overview', about: 'Stat tiles (free beds, open alerts, doses on time %) · bed map by status · live alert feed · staff on duty', section: 'overview', step: 3 },
  { id: 'D4', path: '/camera', href: '/camera', title: 'Camera wall', about: 'Grid of feeds (2×1, 2×2, 3×3 toggle), AI boxes + bed IDs, faces blurred, event markers', section: 'camera', step: 6 },
  { id: 'D5', path: '/camera/:camId', href: '/camera/CAM-01', title: 'Single camera', about: 'One feed large + event list (falls, nurse visits) with snapshots; click event → jump', section: 'camera', step: 6 },
  { id: 'D6', path: '/beds', href: '/beds', title: 'Bed board', about: 'Every bed: status chip, time in status; filter by status; Mark ready', section: 'beds', step: 4 },
  { id: 'D7', path: '/beds/:bedId', href: '/beds/7', title: 'Bed detail', about: 'Current patient, history, cleaning log, mapped camera', section: 'beds', step: 4 },
  { id: 'D8', path: '/queue', href: '/queue', title: 'Waiting queue', about: 'Ranked table with urgency request flag · "Why here?" score breakdown · Override with a reason', section: 'queue', step: 5 },
  { id: 'D9', path: '/queue/add', href: '/queue/add', title: 'Add to queue', about: 'Scan Health Profile QR or enter details · priority · source · bed type', section: 'queue', step: 5 },
  { id: 'D10', path: '/queue/requests', href: '/queue/requests', title: 'Urgency requests', about: 'Patient’s reason · Raise priority / Decline (reason required — patient sees answer)', section: 'queue', step: 5 },
  { id: 'D11', path: '/queue/assign/:bedId', href: '/queue/assign/3', title: 'Assign bed', about: 'Freed bed matched to top patient · Confirm or pick another (reason) · patient + desk notified', section: 'queue', step: 5 },
  { id: 'D12', path: '/staff', href: '/staff', title: 'Staff on duty', about: 'Who’s in, assigned beds, open tasks, overdue doses per nurse', section: 'staff', step: 7 },
  { id: 'D13', path: '/staff/assign', href: '/staff/assign', title: 'Assign beds to nurses', about: 'Nurse columns; drag patient cards between them; ratio warning if over limit; Save', section: 'staff', step: 7 },
  { id: 'D14', path: '/shifts', href: '/shifts', title: 'Shift planner', about: 'Week grid · AI-proposed plan · rule warnings · drag to change · Publish (confirm)', section: 'shifts', step: 7 },
  { id: 'D15', path: '/shifts/swaps', href: '/shifts/swaps', title: 'Swap requests', about: 'Approve / Decline nurse swaps (decline needs reason)', section: 'shifts', step: 7 },
  { id: 'D16', path: '/incidents', href: '/incidents', title: 'Incident log', about: 'Falls + missed doses: time, bed, response time, outcome', section: 'incidents', step: 8 },
  { id: 'D17', path: '/incidents/:id', href: '/incidents/INC-1', title: 'Incident detail', about: 'Alarm timeline (sent → escalated → acknowledged → resolved) with times, outcome, notes', section: 'incidents', step: 8 },
  { id: 'D18', path: '/reports/doses', href: '/reports/doses', title: 'Dose compliance', about: 'On-time / late / missed by nurse, by drug, by time of day (bar charts + table)', section: 'reports', step: 8 },
  { id: 'D19', path: '/reports', href: '/reports', title: 'Reports', about: 'Pilot metrics: bed turnover, doses on time, fall response time · before vs after · Export CSV / PDF', section: 'reports', step: 8 },
  { id: 'D20', path: '/patients', href: '/patients', title: 'Patient directory', about: 'Search all ward patients → read-only profile (header + allergy strip + summary)', section: 'patients', step: 9 },
  { id: 'D21', path: '/approvals', href: '/approvals', title: 'Approvals', about: 'Medicine approvals; only if manager is also senior nurse (same UI as Ward app W34)', section: 'approvals', step: 9 },
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
