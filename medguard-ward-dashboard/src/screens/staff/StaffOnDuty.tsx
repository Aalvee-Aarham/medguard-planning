// D12 Staff on duty: who is in, their beds, open tasks and overdue doses per nurse.
import { CalendarDays, Clock, TriangleAlert, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BED_STATUS, Chip } from '../../components/Chips';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { SHIFT_RULE } from '../../mock/data';
import type { Staff } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { useMockLoad } from '../../utils/hooks';

export function StaffOnDuty() {
  const { staff, beds, alerts } = useStore();
  const t = useT();
  const { loading, error, retry } = useMockLoad();
  const occupied = new Set(beds.filter((b) => b.status === 'occupied').map((b) => b.id));
  const overdueBeds = alerts.filter((a) => a.kind === 'overdue' && !a.acknowledged).map((a) => a.bedId);
  const patients = (s: Staff) => s.beds.filter((b) => occupied.has(b)).length;
  const overdue = (s: Staff) => overdueBeds.filter((b) => b !== undefined && s.beds.includes(b)).length;

  const columns: Column<Staff>[] = [
    {
      key: 'name', header: t('staffPage.col.name'), sortValue: (s) => s.name,
      render: (s) => <span><span className="font-semibold">{s.name}</span><span className="block text-ink-500">{t(`staffRole.${s.role}`)}</span></span>,
    },
    {
      key: 'shift', header: t('staffPage.col.shift'),
      render: (s) => <span className="tabular-nums">{s.role === 'doctor' ? t('staffPage.onCall') : `${t('shift.E')} · ${t('shiftTime.E')}`}</span>,
    },
    { key: 'beds', header: t('staffPage.col.beds'), render: (s) => <span className="tabular-nums">{s.beds.length ? s.beds.join(', ') : t('staff.noBeds')}</span> },
    {
      key: 'patients', header: t('staffPage.col.patients'), sortValue: patients, align: 'right',
      render: (s) => s.role === 'nurse' && patients(s) > SHIFT_RULE.patientsPerNurse
        ? <Chip tone="warning" icon={TriangleAlert}>{t('staff.overRatio', { n: patients(s), max: SHIFT_RULE.patientsPerNurse })}</Chip>
        : <span className="tabular-nums">{patients(s)}</span>,
    },
    { key: 'tasks', header: t('staffPage.col.tasks'), sortValue: (s) => s.openTasks, align: 'right', render: (s) => <span className="tabular-nums">{s.openTasks}</span> },
    {
      key: 'overdue', header: t('staffPage.col.overdue'), sortValue: overdue, align: 'right',
      render: (s) => overdue(s) > 0
        ? <Chip tone="danger" icon={Clock}>{t('staff.overdue', { n: overdue(s) })}</Chip>
        : <Chip tone="success" icon={BED_STATUS.ready.icon}>{t('staff.noneOverdue')}</Chip>,
    },
  ];

  return (
    <>
      <PageHeader
        title={t('screen.D12.title')}
        subtitle={t('staffPage.subtitle', { n: staff.length, max: SHIFT_RULE.patientsPerNurse })}
        actions={
          <>
            <Link to="/shifts" className="btn-secondary"><CalendarDays size={16} aria-hidden /> {t('screen.D14.title')}</Link>
            <Link to="/staff/assign" className="btn-primary"><UsersRound size={16} aria-hidden /> {t('screen.D13.title')}</Link>
          </>
        }
      />
      <DataTable caption={t('screen.D12.title')} rows={staff} columns={columns} rowId={(s) => s.id} loading={loading} error={error} onRetry={retry} />
    </>
  );
}
