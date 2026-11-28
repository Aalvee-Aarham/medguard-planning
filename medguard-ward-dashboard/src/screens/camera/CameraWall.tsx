// D4 Camera wall: every feed with AI boxes and bed IDs, faces blurred, event markers.
// Layout toggle 2×1 / 2×2 / 3×3; click a feed to open D5.
import { ChevronLeft, ChevronRight, Eye, Siren, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CameraFeed } from '../../components/CameraFeed';
import { Chip } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { ErrorState, Skeleton } from '../../components/States';
import { useStore, useT } from '../../state/store';
import { useAgo, useMockLoad, useNow } from '../../utils/hooks';

type Layout = '2x1' | '2x2' | '3x3';
const LAYOUTS: { id: Layout; cols: string; perPage: number }[] = [
  { id: '2x1', cols: 'grid-cols-2', perPage: 2 },
  { id: '2x2', cols: 'grid-cols-2', perPage: 4 },
  { id: '3x3', cols: 'grid-cols-3', perPage: 9 },
];
const LAYOUT_KEY = 'mg-dashboard-camera-layout';

export function CameraWall() {
  const { cameras, beds, cameraEvents } = useStore();
  const t = useT();
  const ago = useAgo();
  const now = useNow(1000);
  const { loading, error, retry } = useMockLoad();
  const [layout, setLayout] = useState<Layout>(() => (localStorage.getItem(LAYOUT_KEY) as Layout) || '2x2');
  const [page, setPage] = useState(0);

  useEffect(() => { localStorage.setItem(LAYOUT_KEY, layout); }, [layout]);

  const spec = LAYOUTS.find((l) => l.id === layout) ?? LAYOUTS[1];
  const pages = Math.max(1, Math.ceil(cameras.length / spec.perPage));
  const current = Math.min(page, pages - 1);
  const shown = cameras.slice(current * spec.perPage, (current + 1) * spec.perPage);
  const online = cameras.filter((c) => c.online).length;

  return (
    <>
      <PageHeader
        title={t('screen.D4.title')}
        subtitle={t('camera.wallSubtitle', { n: cameras.length, online })}
        actions={
          <div role="group" aria-label={t('camera.layout')} className="flex rounded-control border border-border-input p-1">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={layout === l.id}
                onClick={() => { setLayout(l.id); setPage(0); }}
                className={`h-8 rounded-[6px] px-3 text-sm font-semibold tabular-nums ${layout === l.id ? 'bg-primary-100 text-primary-700' : 'text-ink-700 hover:bg-page'}`}
              >
                {l.id.replace('x', '×')}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div role="status" aria-label="Loading" className={`grid gap-6 ${spec.cols}`}>
          {shown.map((c) => <Skeleton key={c.id} className="aspect-video" />)}
        </div>
      ) : error ? (
        <Card><ErrorState onRetry={retry} /></Card>
      ) : (
        <>
          <ul className={`grid gap-6 ${spec.cols}`}>
            {shown.map((cam) => {
              const last = cameraEvents.find((e) => e.cameraId === cam.id);
              return (
                <li key={cam.id}>
                  <Link
                    to={`/camera/${cam.id}`}
                    aria-label={t('camera.open', { cam: cam.id, name: t(`camName.${cam.id}`) })}
                    className="block rounded-card border border-border-subtle bg-surface p-2 hover:border-primary-600"
                  >
                    <CameraFeed camera={cam} beds={beds} events={cameraEvents} now={now} size={layout === '3x3' ? 'thumb' : 'tile'} />
                    <span className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-3">
                      <span className="font-semibold">
                        <span className="tabular-nums">{cam.id}</span> · {t(`camName.${cam.id}`)}
                      </span>
                      {cam.online
                        ? <Chip tone="success" icon={Wifi}>{t('bedDetail.online')}</Chip>
                        : <Chip tone="neutral" icon={WifiOff}>{t('camera.offlineChip')}</Chip>}
                    </span>
                    <span className="flex items-center gap-2 px-2 pb-2 text-sm text-ink-700">
                      {last ? (
                        <>
                          {last.kind === 'fall' ? <Siren size={16} aria-hidden className="text-danger-text" /> : <Eye size={16} aria-hidden className="text-primary-600" />}
                          {t(last.kind === 'fall' ? 'camera.event.fall' : 'camera.event.visit', { bed: last.bedId })} · {ago(last.at)}
                        </>
                      ) : t('camera.noEvents')}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2 text-sm text-ink-700">
              <span className="tabular-nums">{t('camera.page', { n: current + 1, total: pages })}</span>
              <button type="button" aria-label={t('table.prev')} disabled={current === 0} onClick={() => setPage(current - 1)} className="btn-icon"><ChevronLeft size={20} aria-hidden /></button>
              <button type="button" aria-label={t('table.next')} disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="btn-icon"><ChevronRight size={20} aria-hidden /></button>
            </div>
          )}
        </>
      )}
      <p className="mt-4 text-sm text-ink-500">{t('camera.privacyNote')}</p>
    </>
  );
}
