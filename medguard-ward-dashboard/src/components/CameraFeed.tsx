// A drawn camera view (no real video in this build): the ward, AI boxes labelled with bed IDs only,
// faces blurred, and markers for recent events. Used live on D4/D5 and frozen as event snapshots.
// Privacy: never shows patient names; people are simple shapes with a blurred head.
import { Eye, Siren, VideoOff } from 'lucide-react';
import { useId } from 'react';
import type { Bed, Camera, CameraEvent } from '../mock/types';
import { useT } from '../state/store';
import { formatTime } from '../utils/format';

const VB_W = 640;
const VB_H = 360;
/** Events newer than this show a marker on the live view. */
const MARKER_MINUTES = 15;
/** A nurse figure stands at the bed for this long after a visit. */
const STAFF_MINUTES = 3;

interface Props {
  camera: Camera;
  beds: Bed[];
  events: CameraEvent[];
  now: number;
  /** Frozen view of one event instead of the live picture. */
  snapshot?: CameraEvent;
  size?: 'thumb' | 'tile' | 'large';
}

const SKIN = '#B9927A';

/** A person seen from above: blurred head, body. `lying` draws them on the floor (a fall). */
function Person({ x, y, blurId, staff, lying }: { x: number; y: number; blurId: string; staff?: boolean; lying?: boolean }) {
  const body = staff ? '#ECFDF3' : '#D6E6FB';
  const stroke = staff ? '#75E0A7' : '#9DBDEB';
  if (lying) {
    return (
      <g>
        <rect x={x} y={y} width={92} height={28} rx={12} fill={body} stroke={stroke} />
        <circle cx={x - 8} cy={y + 14} r={13} fill={SKIN} filter={`url(#${blurId})`} />
      </g>
    );
  }
  return (
    <g>
      <rect x={x - 22} y={y + 16} width={44} height={staff ? 56 : 78} rx={12} fill={body} stroke={stroke} />
      <circle cx={x} cy={y} r={13} fill={SKIN} filter={`url(#${blurId})`} />
    </g>
  );
}

/** AI detection box with a small label on top (bed ID or "Staff", never a name). */
function AiBox({ x, y, w, h, label, tone }: { x: number; y: number; w: number; h: number; label: string; tone: 'info' | 'staff' | 'danger' }) {
  const color = tone === 'danger' ? '#B42318' : tone === 'staff' ? '#067647' : '#1D5FBF';
  const labelW = Math.max(52, label.length * 7.5 + 14);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill="none" stroke={color} strokeWidth={2.5} />
      <rect x={x} y={y - 20} width={labelW} height={20} rx={4} fill={color} />
      <text x={x + 7} y={y - 6} fontSize={12} fontWeight={600} fill="#fff">{label}</text>
    </g>
  );
}

function Marker({ x, y, kind }: { x: number; y: number; kind: CameraEvent['kind'] }) {
  const Icon = kind === 'fall' ? Siren : Eye;
  return (
    <g>
      <circle cx={x} cy={y} r={13} fill={kind === 'fall' ? '#B42318' : '#1D5FBF'} stroke="#fff" strokeWidth={2} />
      <Icon x={x - 8} y={y - 8} width={16} height={16} color="#fff" strokeWidth={2} />
    </g>
  );
}

export function CameraFeed({ camera, beds, events, now, snapshot, size = 'tile' }: Props) {
  const t = useT();
  const uid = useId().replace(/:/g, '');
  const blurId = `blur-${uid}`;
  const at = snapshot ? new Date(snapshot.at).getTime() : now;

  if (!camera.online && !snapshot) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-control bg-neutral-bg p-4 text-center text-neutral-text">
        <VideoOff size={size === 'large' ? 40 : 28} strokeWidth={1.75} aria-hidden />
        <p className="font-semibold">{t('camera.offline', { cam: camera.id, time: formatTime(camera.offlineSince ?? new Date(now).toISOString()) })}</p>
        <p className="text-sm">{t('camera.offlineHint')}</p>
      </div>
    );
  }

  const camBeds = camera.beds.map((id) => beds.find((b) => b.id === id)).filter((b): b is Bed => !!b);
  const slot = VB_W / Math.max(camBeds.length, 1);
  const recent = (e: CameraEvent, minutes: number) => at - new Date(e.at).getTime() < minutes * 60_000 && new Date(e.at).getTime() <= at;
  const markers = snapshot ? [snapshot] : events.filter((e) => e.cameraId === camera.id && recent(e, MARKER_MINUTES));
  const staffAt = new Set(
    (snapshot ? (snapshot.kind === 'visit' ? [snapshot] : []) : events.filter((e) => e.cameraId === camera.id && e.kind === 'visit' && recent(e, STAFF_MINUTES))).map((e) => e.bedId),
  );
  const fallBed = snapshot?.kind === 'fall' ? snapshot.bedId : undefined;
  const showLabels = size !== 'thumb';

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-control bg-[#EEF2F7]">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full" role="img" aria-label={t('camera.sceneLabel', { cam: camera.id })}>
        <defs>
          <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
        {/* Wall and floor */}
        <rect width={VB_W} height={110} fill="#DCE3EC" />
        <rect y={110} width={VB_W} height={VB_H - 110} fill="#EEF2F7" />
        {[90, 290, 490].map((x) => <rect key={x} x={x} y={22} width={70} height={52} rx={4} fill="#F5F8FC" stroke="#C3CEDC" />)}

        {camBeds.length === 0 && (
          camera.id === 'CAM-03' ? (
            // Corridor: perspective lines and doors.
            <g stroke="#C3CEDC" fill="none" strokeWidth={2}>
              <path d="M0 360 L250 140 M640 360 L390 140 M250 140 H390" />
              {[60, 140].map((x) => <rect key={x} x={x} y={200 - x / 3} width={40} height={90 - x / 6} fill="#F5F8FC" />)}
              {[540, 460].map((x) => <rect key={x} x={x} y={200 - (640 - x) / 3} width={40} height={90 - (640 - x) / 6} fill="#F5F8FC" />)}
            </g>
          ) : (
            // Nurses' station: desk and screens.
            <g>
              <rect x={150} y={210} width={340} height={70} rx={8} fill="#fff" stroke="#B8C4D4" />
              {[200, 290, 380].map((x) => <rect key={x} x={x} y={180} width={60} height={36} rx={4} fill="#D6E6FB" stroke="#9DBDEB" />)}
              <Person x={320} y={290} blurId={blurId} staff />
            </g>
          )
        )}

        {camBeds.map((bed, i) => {
          const x = i * slot + (slot - 92) / 2;
          const y = 140;
          const occupied = bed.status === 'occupied' && fallBed !== bed.id;
          const oos = bed.status === 'oos';
          return (
            <g key={bed.id} opacity={oos ? 0.55 : 1}>
              <rect x={x} y={y} width={92} height={140} rx={8} fill="#fff" stroke="#B8C4D4" strokeWidth={2} strokeDasharray={oos ? '6 4' : undefined} />
              <rect x={x + 16} y={y + 8} width={60} height={20} rx={6} fill="#F2F4F7" />
              {occupied && <Person x={x + 46} y={y + 34} blurId={blurId} />}
              {occupied && showLabels && <AiBox x={x + 12} y={y + 16} w={68} h={112} label={t('common.bed', { n: bed.id })} tone="info" />}
              {!occupied && showLabels && fallBed !== bed.id && (
                <text x={x + 46} y={y + 160} textAnchor="middle" fontSize={12} fontWeight={600} fill="#5B6B80">{t('common.bed', { n: bed.id })}</text>
              )}
              {staffAt.has(bed.id) && (
                <>
                  <Person x={x + 108 > VB_W - 20 ? x - 16 : x + 104} y={y + 56} blurId={blurId} staff />
                  {showLabels && <AiBox x={(x + 108 > VB_W - 20 ? x - 16 : x + 104) - 28} y={y + 38} w={56} h={92} label={t('camera.staff')} tone="staff" />}
                </>
              )}
              {fallBed === bed.id && (
                <>
                  <Person x={x + 4} y={y + 168} blurId={blurId} lying />
                  {showLabels && <AiBox x={x - 18} y={y + 158} w={124} h={48} label={t('camera.fallAt', { bed: bed.id })} tone="danger" />}
                </>
              )}
              {markers.filter((m) => m.bedId === bed.id).slice(0, 1).map((m) => <Marker key={m.id} x={x + 88} y={y + 4} kind={m.kind} />)}
            </g>
          );
        })}
      </svg>

      {size !== 'thumb' && (
        <>
          <span className="absolute left-2 top-2 inline-flex items-center gap-2 rounded-full bg-surface/95 px-2 py-1 text-xs font-semibold tabular-nums shadow-bar">
            {snapshot ? (
              <>{t('camera.snapshot')} · {formatTime(snapshot.at)}</>
            ) : (
              <>
                <span aria-hidden className="h-2 w-2 rounded-full bg-danger-text" />
                {t('camera.live')} · {new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </>
            )}
          </span>
          <span className="absolute right-2 top-2 rounded-full bg-ink-900/80 px-2 py-1 text-xs font-semibold text-surface tabular-nums">{camera.id}</span>
          {size === 'large' && (
            <span className="absolute bottom-2 right-2 rounded-full bg-surface/95 px-2 py-1 text-xs text-ink-700 shadow-bar">{t('camera.privacy')}</span>
          )}
        </>
      )}
    </div>
  );
}
