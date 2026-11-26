// D5 Single camera: one feed large, with its events (falls, nurse visits) and snapshots.
// Clicking an event jumps the big view to that moment; "Back to live" returns.
import { Eye, Radio, Siren, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BedTile } from '../../components/BedTile';
import { CameraFeed } from '../../components/CameraFeed';
import { Chip } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import type { CameraEvent } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { formatTime } from '../../utils/format';
import { useAgo, useMockLoad, useNow } from '../../utils/hooks';

type Filter = 'all' | 'fall' | 'visit';

export function SingleCamera() {
  const { cameras, beds, cameraEvents } = useStore();
  const t = useT();
  const ago = useAgo();
  const now = useNow(1000);
  const { camId } = useParams();
  const { loading, error, retry } = useMockLoad();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<CameraEvent | null>(null);

  const back = { to: '/camera', label: t('screen.D4.title') };
  const camera = cameras.find((c) => c.id === camId);

  if (!camera) {
    return (
      <>
        <PageHeader title={t('camera.notFound')} back={back} />
        <Card><EmptyState title={t('camera.notFound')} body={t('camera.notFoundBody', { list: cameras.map((c) => c.id).join(', ') })} /></Card>
      </>
    );
  }

  const events = cameraEvents.filter((e) => e.cameraId === camera.id);
  const listed = filter === 'all' ? events : events.filter((e) => e.kind === filter);
  const camBeds = beds.filter((b) => camera.beds.includes(b.id));
  const count = (k: Filter) => (k === 'all' ? events.length : events.filter((e) => e.kind === k).length);

  return (
    <>
      <PageHeader
        back={back}
        title={<span><span className="tabular-nums">{camera.id}</span> · {t(`camName.${camera.id}`)}</span>}
        subtitle={camera.online
          ? <Chip tone="success" icon={Wifi}>{t('bedDetail.online')}</Chip>
          : <Chip tone="neutral" icon={WifiOff}>{t('camera.offlineChip')}</Chip>}
      />

      {loading ? (
        <div role="status" aria-label="Loading" className="grid grid-cols-12 gap-6">
          <Skeleton className="col-span-8 aspect-video" />
          <Skeleton className="col-span-4 h-96" />
        </div>
      ) : error ? (
        <Card><ErrorState onRetry={retry} /></Card>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 xl:col-span-8">
            <Card>
              <div className="p-3">
                <CameraFeed camera={camera} beds={beds} events={cameraEvents} now={now} snapshot={selected ?? undefined} size="large" />
                {selected && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3">
                    <p className="font-semibold">
                      {t('camera.viewing', { event: t(selected.kind === 'fall' ? 'camera.event.fall' : 'camera.event.visit', { bed: selected.bedId }), time: formatTime(selected.at) })}
                    </p>
                    <button type="button" onClick={() => setSelected(null)} className="btn-primary"><Radio size={16} aria-hidden /> {t('camera.backToLive')}</button>
                  </div>
                )}
              </div>
            </Card>

            {camBeds.length > 0 && (
              <Card title={t('camera.bedsHere')}>
                {/* Camera-related view: patient IDs only, no names. */}
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3 p-4">
                  {camBeds.map((b) => <li key={b.id}><BedTile bed={b} showName={false} /></li>)}
                </ul>
              </Card>
            )}
          </div>

          <Card title={t('camera.events')} className="col-span-12 xl:col-span-4">
            <div role="group" aria-label={t('camera.filter')} className="flex gap-2 border-b border-border-subtle p-3">
              {(['all', 'fall', 'visit'] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`h-10 rounded-full border px-3 text-sm font-semibold ${filter === f ? 'border-primary-600 bg-primary-100 text-primary-700' : 'border-border-subtle text-ink-700 hover:border-primary-600'}`}
                >
                  {t(`camera.filter.${f}`)} <span className="tabular-nums">{count(f)}</span>
                </button>
              ))}
            </div>
            {listed.length === 0 ? (
              <p className="p-6 text-center text-ink-700">{t('camera.noEvents')}</p>
            ) : (
              <ul className="max-h-[640px] divide-y divide-border-subtle overflow-y-auto">
                {listed.map((e) => {
                  const active = selected?.id === e.id;
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelected(e)}
                        className={`flex w-full gap-3 p-3 text-left hover:bg-primary-50 ${active ? 'bg-primary-50' : ''}`}
                      >
                        <span className="w-28 shrink-0">
                          <CameraFeed camera={camera} beds={beds} events={cameraEvents} now={now} snapshot={e} size="thumb" />
                        </span>
                        <span className="min-w-0">
                          <span className={`flex items-center gap-1 font-semibold ${e.kind === 'fall' ? 'text-danger-text' : ''}`}>
                            {e.kind === 'fall' ? <Siren size={16} aria-hidden /> : <Eye size={16} aria-hidden className="text-primary-600" />}
                            {t(e.kind === 'fall' ? 'camera.event.fall' : 'camera.event.visit', { bed: e.bedId })}
                          </span>
                          {e.staff && (
                            <span className="block text-sm text-ink-700">
                              {e.kind === 'fall' && e.responseSecs ? t('camera.reached', { name: e.staff, s: e.responseSecs }) : e.staff}
                            </span>
                          )}
                          <span className="block text-xs text-ink-500 tabular-nums">{formatTime(e.at)} · {ago(e.at)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
