// D9 Add to queue: scan the patient's Health Profile QR (mocked) or enter details; set priority, source and bed type.
import { QrCode } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PriorityBadge } from '../../components/Chips';
import { Field } from '../../components/Field';
import { Card, PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { mockFetch } from '../../mock/api';
import { isValidPhone, normalisePhone } from '../../mock/auth';
import { rankQueue } from '../../mock/queue';
import type { BedType, Priority, QueueEntry, QueueSource } from '../../mock/types';
import { useStore, useT } from '../../state/store';

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3'];
const SOURCES: QueueSource[] = ['emergency', 'opd', 'referral'];
const BED_TYPES: BedType[] = ['General', 'ICU'];

/** What a scanned Health Profile QR fills in (mock). */
const SCANNED = { name: 'Shirin Sultana', phone: '01712345678', age: '52' };

function Choice<T extends string>({ legend, name, value, options, label, onChange, error }: {
  legend: string; name: string; value: T | ''; options: T[]; label: (v: T) => React.ReactNode; onChange: (v: T) => void; error?: string;
}) {
  return (
    <fieldset>
      <legend className="font-semibold">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o}
            className={`flex h-12 cursor-pointer items-center gap-2 rounded-control border px-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-600 ${
              value === o ? 'border-2 border-primary-600 bg-primary-50' : 'border-border-input bg-surface'
            }`}
          >
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="sr-only" />
            {label(o)}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-danger-text">{error}</p>}
    </fieldset>
  );
}

export function AddToQueue() {
  const { queue, serverDown, dispatch, logAudit, toast } = useStore();
  const t = useT();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', age: '' });
  const [priority, setPriority] = useState<Priority | ''>('');
  const [source, setSource] = useState<QueueSource | ''>('');
  const [bedType, setBedType] = useState<BedType>('General');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors({ ...errors, [k]: '' });
  };

  const scan = () => {
    setForm(SCANNED);
    setScanned(true);
    setErrors({});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalisePhone(form.phone);
    const age = Number(form.age);
    const next: Record<string, string> = {};
    if (form.name.trim().length < 3) next.name = t('add.err.name');
    if (form.phone && !isValidPhone(phone)) next.phone = t('login.phone.invalid');
    if (form.age && (!Number.isInteger(age) || age < 0 || age > 120)) next.age = t('add.err.age');
    if (!priority) next.priority = t('add.err.priority');
    if (!source) next.source = t('add.err.source');
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await mockFetch(null, { serverDown, delay: 500 });
    } catch {
      setErrors({ form: t('login.server') });
      setBusy(false);
      return;
    }
    const entry: QueueEntry = {
      id: `Q-${Date.now()}`, name: form.name.trim(), phone: form.phone ? phone : undefined, age: form.age ? age : undefined,
      priority: priority as Priority, source: source as QueueSource, bedType, bookedAt: new Date().toISOString(),
    };
    dispatch({ type: 'queue-add', entry });
    logAudit(`Added ${entry.name} to queue (${entry.priority}, ${entry.source}, ${entry.bedType})`, '');
    const rank = rankQueue([...queue, entry], Date.now()).find((r) => r.entry.id === entry.id)!.rank;
    toast(t('add.toast', { name: entry.name, rank }));
    navigate('/queue');
  };

  return (
    <>
      <PageHeader title={t('screen.D9.title')} back={{ to: '/queue', label: t('screen.D8.title') }} />
      <form onSubmit={submit} noValidate className="grid grid-cols-12 gap-6">
        <Card className="col-span-8 2xl:col-span-6">
          <div className="space-y-6 p-6">
            <div className="flex items-center justify-between gap-4 rounded-card border border-primary-100 bg-primary-50 p-4">
              <div>
                <p className="font-semibold">{t('add.scanTitle')}</p>
                <p className="text-sm text-ink-700">{scanned ? t('add.scanned', { name: SCANNED.name }) : t('add.scanBody')}</p>
              </div>
              <button type="button" onClick={scan} className="btn-secondary shrink-0"><QrCode size={16} aria-hidden /> {t('add.scan')}</button>
            </div>

            <Field label={t('add.name')} value={form.name} onChange={set('name')} error={errors.name} autoComplete="off" />
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('add.phone')} help={t('add.optional')} prefix="+88" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} error={errors.phone} className="tabular-nums" />
              <Field label={t('add.age')} help={t('add.optional')} inputMode="numeric" value={form.age} onChange={set('age')} error={errors.age} className="tabular-nums" />
            </div>

            <Choice legend={t('add.priority')} name="priority" value={priority} options={PRIORITIES} label={(p) => <PriorityBadge priority={p} />} onChange={(p) => { setPriority(p); setErrors({ ...errors, priority: '' }); }} error={errors.priority} />
            <Choice legend={t('add.source')} name="source" value={source} options={SOURCES} label={(s) => t(`source.${s}`)} onChange={(s) => { setSource(s); setErrors({ ...errors, source: '' }); }} error={errors.source} />
            <Choice legend={t('add.bedType')} name="bedType" value={bedType} options={BED_TYPES} label={(b) => t(`bedType.${b}`)} onChange={setBedType} />

            {errors.form && <p role="alert" className="rounded-control border border-danger-border bg-danger-bg p-3 text-danger-text">{errors.form}</p>}

            <div className="flex justify-between gap-4 border-t border-border-subtle pt-6">
              <button type="button" onClick={() => navigate('/queue')} className="btn-secondary">{t('dialog.cancel')}</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy && <Spinner />} {t('add.submit')}</button>
            </div>
          </div>
        </Card>
        <aside className="col-span-4 text-sm text-ink-700 2xl:col-span-3">
          <Card title={t('add.howTitle')}>
            <p className="p-4">{t('queue.rule')}</p>
          </Card>
        </aside>
      </form>
    </>
  );
}
