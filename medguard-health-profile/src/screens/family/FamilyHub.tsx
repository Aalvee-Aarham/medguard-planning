import { useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Droplet, FileText, HeartPulse, Mail, Pill, Plus, Sparkles, UserPlus, Users, UsersRound } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { cx } from '../../components/ui'
import { StatusChip } from '../../components/status'
import { GlassHero, GlassPage, NeuStat } from '../../components/glass'
import { useTilt } from '../../lib/tilt'
import { age } from '../../lib/format'
import type { Profile } from '../../mock/types'
import { hue, initials } from '../../lib/people'


/**
 * H53 Family: a 3D family orbit (you in the centre, everyone you look after circling on a tilted glass
 * plane, with empty plan slots and pending invitations as ghost nodes), then a holographic ID card per
 * person. Picking a node lights its card. Everything is plain DOM + CSS 3D, so every node is a real
 * button; under reduced motion the orbit stands still.
 */
export function Family() {
  const { s, mutate, setLimitHit } = useApp()
  const t = useT()
  const nav = useNavigate()
  const max = s.subscription.plan === 'premium' ? 8 : 2
  const [sel, setSel] = useState<string | null>(null)
  const pending = s.invites.filter((i) => i.status === 'pending')
  const full = s.profiles.length >= max
  const add = () => (full ? setLimitHit('profiles') : nav('/family/add'))
  const open = (p: Profile) => {
    mutate((d) => void (d.activeProfileId = p.id))
    nav('/record')
  }
  const self = s.profiles.find((p) => p.relation === 'self') ?? s.profiles[0]
  const others = s.profiles.filter((p) => p !== self)
  const relLabel = (p: Profile) => (p.relation === 'self' ? t('You') : t(p.relation[0].toUpperCase() + p.relation.slice(1)))
  const hueOf = (p: Profile) => hue(s.profiles.indexOf(p))

  // orbit: other people, then empty slots, then invitations
  const nodes: { key: string; kind: 'person' | 'slot' | 'invite'; p?: Profile; label: string; sub: string; onClick: () => void }[] = [
    ...others.map((p) => ({ key: p.id, kind: 'person' as const, p, label: p.name.split(' ')[0], sub: relLabel(p), onClick: () => setSel(p.id) })),
    ...Array.from({ length: Math.max(0, Math.min(max, 4) - s.profiles.length) }, (_, i) => ({ key: 'slot' + i, kind: 'slot' as const, label: t('Add'), sub: t('Free slot'), onClick: add })),
    ...pending.map((i) => ({ key: i.id, kind: 'invite' as const, label: i.from.split(' ')[0], sub: t('Invitation'), onClick: () => nav(`/invites/${i.id}`) })),
  ]
  const careCount = s.caregivers.filter((c) => s.profiles.some((p) => p.id === c.profileId)).length
  const medCount = s.medicines.filter((m) => m.current && s.profiles.some((p) => p.id === m.profileId)).length

  return (
    <GlassPage>
      <GlassHero
        icon={UsersRound}
        eyebrow={t('Family and caregivers')}
        title={t('Family')}
        sub={<span className="tabular">{t('{n} of {max} profiles on your plan', { n: s.profiles.length, max })}</span>}
        actions={
          <button type="button" onClick={add} className="consent-go btn inline-flex min-h-12 items-center gap-2 rounded-2xl px-4 text-body font-semibold">
            <UserPlus className="size-5" strokeWidth={1.75} aria-hidden /> {t('Add family member')}
          </button>
        }
      >
        <NeuStat icon={Users} label={t('Profiles')} value={s.profiles.length} suffix={`/ ${max}`} />
        <NeuStat icon={HeartPulse} label={t('Caregivers')} value={careCount} />
        <NeuStat icon={Pill} label={t('Current medicines')} value={medCount} />
        <NeuStat icon={Mail} label={t('Invitations')} value={pending.length} tone={pending.length ? 'success' : undefined} />
      </GlassHero>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Orbit self={self} selfHue={hueOf(self)} nodes={nodes} hueOf={hueOf} sel={sel} onSelf={() => setSel(self.id)} />

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" aria-label={t('Family')}>
          {s.profiles.map((p) => {
            const conditions = s.items.filter((x) => x.profileId === p.id && x.section === 'conditions').length
            const meds = s.medicines.filter((m) => m.profileId === p.id && m.current).length
            const docs = s.documents.filter((d) => d.profileId === p.id).length
            const cares = s.caregivers.filter((c) => c.profileId === p.id).length
            return (
              <li key={p.id} data-rise>
                <IdCard
                  p={p}
                  colors={hueOf(p)}
                  lit={sel === p.id}
                  active={s.activeProfileId === p.id}
                  rel={relLabel(p)}
                  stats={[
                    { icon: HeartPulse, n: conditions, l: t('Conditions') },
                    { icon: Pill, n: meds, l: t('Medicines') },
                    { icon: FileText, n: docs, l: t('Documents') },
                  ]}
                  onOpen={() => open(p)}
                  caregivers={p.role === 'owner' && p.relation !== 'self' ? { to: `/family/${p.id}/caregivers`, n: cares } : undefined}
                />
              </li>
            )
          })}
          <li data-rise>
            <button type="button" onClick={add} className="slot-card group grid h-full min-h-[220px] w-full place-items-center rounded-[24px] p-5 text-center">
              <span className="flex flex-col items-center gap-3">
                <span className="skeuo-icon grid size-14 place-items-center rounded-2xl transition-transform duration-300 group-hover:rotate-90">
                  {full ? <Sparkles className="size-7" strokeWidth={1.75} aria-hidden /> : <Plus className="size-7" strokeWidth={2} aria-hidden />}
                </span>
                <span className="text-h3 font-semibold text-ink-900">{full ? t('See plans') : t('Add family member')}</span>
                <span className="text-small text-ink-700 tabular">{t('{n} of {max} profiles on your plan', { n: s.profiles.length, max })}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>

      {pending.map((inv) => (
        <div key={inv.id} data-rise className="glass glass-sheen mt-6 flex flex-wrap items-center gap-4 rounded-[24px] p-4 md:p-5">
          <span className="envelope grid size-14 shrink-0 place-items-center rounded-2xl text-white">
            <Mail className="size-7" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-[220px] flex-1">
            <p className="text-h3 font-semibold">{t('You have an invitation to manage a profile.')}</p>
            <p className="text-small text-ink-700">{t('{from} invited you to help with {name}’s profile', { from: inv.from, name: inv.profileName })}</p>
          </div>
          <button type="button" onClick={() => nav(`/invites/${inv.id}`)} className="neu neu-press inline-flex min-h-12 items-center gap-2 rounded-2xl px-4 font-semibold text-primary-700">
            {t('Open invitation')} <ArrowRight className="size-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
      ))}
    </GlassPage>
  )
}

type Node = { key: string; kind: 'person' | 'slot' | 'invite'; p?: Profile; label: string; sub: string; onClick: () => void }

/** CSS-3D orbit. The plane is tilted back; nodes counter-rotate so they always face the viewer. */
function Orbit({ self, selfHue, nodes, hueOf, sel, onSelf }: { self: Profile; selfHue: string[]; nodes: Node[]; hueOf: (p: Profile) => string[]; sel: string | null; onSelf: () => void }) {
  const t = useT()
  const stage = useRef<HTMLDivElement>(null)
  useTilt(stage, 7)
  const n = Math.max(nodes.length, 1)
  return (
    <section data-rise aria-label={t('Family')} className="orbit-card glass relative isolate overflow-hidden rounded-[28px] lg:sticky lg:top-6">
      <div ref={stage} className="orbit-stage tilt relative h-[360px] sm:h-[440px] lg:h-[520px]">
        <div className="orbit-plane">
          {[1, 0.72, 0.44].map((r, i) => (
            <span key={r} aria-hidden className={cx('orbit-ring', i === 1 && 'dashed')} style={{ '--r': r } as CSSProperties} />
          ))}
          <span aria-hidden className="orbit-ripple" />
          <span aria-hidden className="orbit-ripple" style={{ animationDelay: '-1.6s' }} />
          <div className="orbit-spin">
            {nodes.map((nd, i) => {
              const a = (i / n) * 360 - 90
              const c = nd.p ? hueOf(nd.p) : null
              return (
                <div key={nd.key} className="orbit-item">
                  <span aria-hidden className={cx('orbit-spoke', nd.kind !== 'person' && 'ghost')} style={{ '--a': `${a}deg`, '--c': c?.[0] } as CSSProperties} />
                  <div className="orbit-anchor" style={{ '--a': `${a}deg` } as CSSProperties}>
                    <div className="orbit-upright">
                      <button
                        type="button"
                        onClick={nd.onClick}
                        aria-pressed={nd.kind === 'person' ? sel === nd.key : undefined}
                        className={cx('orbit-node group flex flex-col items-center gap-1.5', sel === nd.key && 'is-sel')}
                      >
                        <span
                          className={cx('orb grid size-16 place-items-center rounded-full text-h3 font-bold text-white sm:size-[72px]', nd.kind !== 'person' && 'ghost')}
                          style={c ? ({ '--c1': c[0], '--c2': c[1] } as CSSProperties) : undefined}
                        >
                          {nd.kind === 'person' ? initials(nd.p!.name) : nd.kind === 'slot' ? <Plus className="size-6" strokeWidth={2} aria-hidden /> : <Mail className="size-6" strokeWidth={1.75} aria-hidden />}
                        </span>
                        <span className="orbit-label rounded-full px-2.5 py-0.5 text-center text-caption leading-tight">
                          <span className="block font-semibold text-ink-900">{nd.label}</span>
                          <span className="block text-ink-700">{nd.sub}</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="orbit-center">
            <div className="orbit-upright-c">
              <button type="button" onClick={onSelf} aria-pressed={sel === self.id} className={cx('orbit-node flex flex-col items-center gap-2', sel === self.id && 'is-sel')}>
                <span className="orb orb-self grid size-24 place-items-center rounded-full text-h1 font-bold text-white sm:size-28" style={{ '--c1': selfHue[0], '--c2': selfHue[1] } as CSSProperties}>
                  {initials(self.name)}
                </span>
                <span className="orbit-label rounded-full px-3 py-0.5 text-small font-semibold text-ink-900">
                  {self.name.split(' ')[0]} · {t('You')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Holographic ID card: colour band, glossy avatar, vitals row, actions. Tilts toward the mouse. */
function IdCard({
  p, colors, lit, active, rel, stats, onOpen, caregivers,
}: {
  p: Profile
  colors: string[]
  lit: boolean
  active: boolean
  rel: string
  stats: { icon: typeof Pill; n: number; l: string }[]
  onOpen: () => void
  caregivers?: { to: string; n: number }
}) {
  const t = useT()
  const nav = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  useTilt(ref, 6)
  return (
    <div ref={ref} className={cx('id-card tilt glass group relative overflow-hidden rounded-[24px]', lit && 'is-lit')} style={{ '--c1': colors[0], '--c2': colors[1] } as CSSProperties}>
      <div className="id-band relative h-24 overflow-hidden">
        <div aria-hidden className="passport-guilloche absolute inset-0" />
        <div aria-hidden className="passport-holo absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="relative flex items-start justify-between p-4 text-white">
          <span className="font-mono text-caption font-bold tracking-[0.2em] uppercase opacity-90">MedGuard ID</span>
          <span className="flex gap-1.5">
            {active && <span className="rounded-full bg-white/25 px-2 py-0.5 text-caption font-semibold backdrop-blur">{t('Open now')}</span>}
            {p.role === 'caregiver-view' && <StatusChip status="viewonly" />}
          </span>
        </div>
      </div>
      <div className="pop relative px-4 pb-4">
        <span className="orb -mt-10 mb-2 grid size-20 place-items-center rounded-[22px] border-4 border-surface text-h2 font-bold text-white" style={{ '--c1': colors[0], '--c2': colors[1] } as CSSProperties} aria-hidden>
          {initials(p.name)}
        </span>
        <h2 className="text-h3 leading-tight font-bold text-ink-900">{p.name}</h2>
        <p className="flex flex-wrap items-center gap-x-2 text-small text-ink-700">
          <span>{rel}</span>
          <span aria-hidden>·</span>
          <span className="tabular">{t('{n} years', { n: age(p.dob) })}</span>
          {p.bloodGroup && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-danger-text">
                <Droplet className="size-3.5 fill-current" aria-hidden />
                <span className="sr-only">{t('Blood group')}</span>
                {p.bloodGroup}
              </span>
            </>
          )}
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          {stats.map((x) => (
            <div key={x.l} className="neu-inset flex flex-col items-center rounded-xl px-1 py-2">
              <dt className="order-2 text-caption text-ink-700">{x.l}</dt>
              <dd className="order-1 flex items-center gap-1 text-h3 leading-tight font-bold text-ink-900 tabular">
                <x.icon className="size-4 text-[var(--c1)]" strokeWidth={2} aria-hidden />
                {x.n}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onOpen} className="id-go btn inline-flex min-h-12 flex-[1.4] items-center whitespace-nowrap justify-center gap-2 rounded-2xl px-3 font-semibold text-white">
            {t('Open record')} <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
          </button>
          {caregivers && (
            <button type="button" onClick={() => nav(caregivers.to)} className="neu neu-press inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-3 font-semibold whitespace-nowrap text-ink-900">
              <Users className="size-4" strokeWidth={2} aria-hidden /> {t('Caregivers')}
              <span className="rounded-full bg-primary-600 px-1.5 text-caption text-white tabular">{caregivers.n}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
