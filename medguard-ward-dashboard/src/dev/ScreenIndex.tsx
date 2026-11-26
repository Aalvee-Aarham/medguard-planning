// Dev page: every screen from the plan with its route, so you can check they all open.
import { Link } from 'react-router-dom';
import { canSee } from '../app/access';
import { SCREENS, type Screen } from '../app/screens';
import { DataTable, type Column } from '../components/DataTable';
import { useStore } from '../state/store';

export function ScreenIndex() {
  const { role } = useStore();

  const columns: Column<Screen>[] = [
    { key: 'id', header: 'ID', render: (s) => <span className="font-semibold">{s.id}</span>, sortValue: (s) => Number(s.id.slice(1)) },
    { key: 'title', header: 'Screen', render: (s) => <Link to={s.href} className="font-semibold text-primary-600 hover:underline">{s.title}</Link>, sortValue: (s) => s.title },
    { key: 'route', header: 'Route', render: (s) => <code className="text-ink-700">{s.path}</code> },
    { key: 'step', header: 'Built in step', render: (s) => s.step, sortValue: (s) => s.step, align: 'right' },
    { key: 'access', header: 'You can open it', render: (s) => (canSee(role, s.section) ? 'Yes' : 'No access') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">All 21 screens</h1>
        <p className="mt-1 text-ink-700">Click a screen to open it. Switch user in the Dev panel to check who can see what.</p>
      </div>
      <DataTable caption="All screens" rows={SCREENS} columns={columns} rowId={(s) => s.id} pageSize={25} searchText={(s) => `${s.id} ${s.title} ${s.path}`} />
    </div>
  );
}
