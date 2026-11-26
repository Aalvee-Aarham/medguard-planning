import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertOctagon, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, MapPin, Phone, Search, Share2 } from 'lucide-react'
import { useApp, LIMITS } from '../../state/store'
import { useT } from '../../i18n'
import { Button, Card, List, ListRow, PageHeader, Screen, SectionTitle, Stack, Toggle } from '../../components/ui'
import { NeedsInternet } from '../../components/status'
import { EmptyState, Loadable, ListSkeleton } from '../../components/states'
import { useFakeLoad } from '../../mock/api'

/* ---------------- G. Similar cases ---------------- */

/** H41 Disclaimer (first time only): see Disclaimer.tsx */
export { SimilarDisclaimer } from './Disclaimer'

/** H42 Search setup */
export function SimilarSetup() {
  const { s, profile, online, mutate, setLimitHit } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [use, setUse] = useState({ conditions: true, results: true, medicines: false })
  useEffect(() => {
    if (!s.settings.similarAccepted) nav('/similar/disclaimer', { replace: true })
  }, [s.settings.similarAccepted, nav])
  const premium = s.subscription.plan === 'premium'
  const left = LIMITS.free.searches - s.usage.searches
  return (
    <Screen>
      <PageHeader title={t('Similar cases')} action={<Button variant="tertiary" icon={Bookmark} to="/similar/saved" className="px-3">{t('Saved')}</Button>} />
      <p className="mb-4 text-body text-ink-700">{t('Find published cases like {name}’s. Choose what to compare.', { name: profile.name })}</p>
      <Card>
        <Toggle label={t('Conditions')} checked={use.conditions} onChange={(v) => setUse({ ...use, conditions: v })} />
        <Toggle label={t('Test results')} checked={use.results} onChange={(v) => setUse({ ...use, results: v })} />
        <Toggle label={t('Medicines')} checked={use.medicines} onChange={(v) => setUse({ ...use, medicines: v })} />
      </Card>
      {!premium && <p className="mt-3 text-small text-ink-700 tabular">{t('{n} of {max} left this month', { n: Math.max(left, 0), max: LIMITS.free.searches })}</p>}
      <Button
        full
        className="mt-6"
        icon={Search}
        disabled={!online || !Object.values(use).some(Boolean)}
        onClick={() => {
          if (!premium && left <= 0) return setLimitHit('searches')
          mutate((d) => void d.usage.searches++)
          nav('/similar/results')
        }}
      >
        {t('Find similar cases')}
      </Button>
      {!online && <NeedsInternet />}
      <p className="mt-4 text-caption text-ink-700">{t('Cases come from PMC-Patients, 167,000 published patient summaries.')}</p>
    </Screen>
  )
}

/** H43 Urgent-sign warning: red, direct. Never animated. */
export function UrgentWarning() {
  const t = useT()
  return (
    <section role="alert" aria-labelledby="urgent" className="rounded-card border-2 border-danger-text bg-danger-bg p-4 text-danger-text">
      <h2 id="urgent" className="flex items-center gap-2 text-h2 font-semibold">
        <AlertOctagon className="size-6" aria-hidden /> {t('See a doctor now. Call 999.')}
      </h2>
      <p className="mt-1 text-body text-ink-900">{t('This profile has a high blood pressure reading after a recent stroke.')}</p>
      <div className="mt-3 flex gap-2">
        <a href="tel:999" className="btn inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-danger-text px-4 font-semibold text-white">
          <Phone className="size-5" aria-hidden /> {t('Call 999')}
        </a>
        <a href="https://www.google.com/maps/search/hospital" target="_blank" rel="noreferrer" className="btn inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control border border-danger-text bg-surface px-4 font-semibold text-danger-text">
          <MapPin className="size-5" aria-hidden /> {t('Nearest hospital')}
        </a>
      </div>
    </section>
  )
}

/** H44 Results: match reasons, age, sex, main condition; outcome collapsed */
export function SimilarResults() {
  const { s, profile } = useApp()
  const t = useT()
  const { state, retry } = useFakeLoad('sim' + profile.id)
  return (
    <Screen wide>
      <PageHeader title={t('Cases like {name}’s', { name: profile.name.split(' ')[0] })} />
      {profile.dangerSigns && (
        <div className="mb-4">
          <UrgentWarning />
        </div>
      )}
      <Loadable state={state} retry={retry} skeleton={<ListSkeleton rows={3} />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {s.cases.map((c) => (
            <Card key={c.id} to={`/similar/cases/${c.id}`}>
              <p className="text-h3 font-semibold">{c.condition}</p>
              <p className="text-body text-ink-700 tabular">
                {c.age} {t('years')} · {t(c.sex === 'female' ? 'Female' : 'Male')}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {c.matches.map((m) => (
                  <span key={m} className="rounded-full bg-primary-50 px-3 py-1 text-small font-semibold text-primary-700">
                    {t(m)}
                  </span>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1 text-small text-ink-700">
                <ChevronDown className="size-4" aria-hidden /> {t('Outcome hidden. Open to see it.')}
              </p>
            </Card>
          ))}
        </div>
      </Loadable>
    </Screen>
  )
}

/** H45 Case detail */
export function CaseDetail() {
  const { s, profile, mutate, toast } = useApp()
  const t = useT()
  const id = location.pathname.split('/').pop()
  const c = s.cases.find((x) => x.id === id)
  const [show, setShow] = useState(false)
  if (!c) return <Screen><PageHeader title={t('Not found')} /></Screen>
  const saved = (s.savedCases[profile.id] ?? []).includes(c.id)
  return (
    <Screen>
      <PageHeader title={c.condition} sub={<span className="tabular">{c.age} {t('years')} · {t(c.sex === 'female' ? 'Female' : 'Male')}</span>} />
      <SectionTitle>{t('Summary')}</SectionTitle>
      <Card>
        <p>{c.summary}</p>
      </Card>
      <SectionTitle>{t('Treatment')}</SectionTitle>
      <Card>
        <p>{c.treatment}</p>
      </Card>
      <SectionTitle>{t('Outcome')}</SectionTitle>
      <Card>
        <button type="button" aria-expanded={show} onClick={() => setShow(!show)} className="flex min-h-12 w-full items-center justify-between gap-2 font-semibold text-primary-600">
          {show ? t('Hide outcome') : t('Show outcome')}
          {show ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
        </button>
        {show && <p className="mt-2">{c.outcome}</p>}
      </Card>
      <p className="mt-3 text-caption text-ink-700">
        {t('Source')}: {c.citation}
      </p>
      <Stack className="mt-6" gap={2}>
        <Button full icon={Share2} to={`/share/doctor?case=${c.id}`}>
          {t('Share with doctor')}
        </Button>
        <Button
          full
          variant="secondary"
          icon={saved ? BookmarkCheck : Bookmark}
          onClick={() => {
            mutate((d) => {
              const list = d.savedCases[profile.id] ?? []
              d.savedCases[profile.id] = saved ? list.filter((x) => x !== c.id) : [...list, c.id]
            })
            toast(saved ? t('Removed from saved') : t('Case saved'))
          }}
        >
          {saved ? t('Saved') : t('Save case')}
        </Button>
      </Stack>
    </Screen>
  )
}

/** H46 Saved cases per profile */
export function SavedCases() {
  const { s, profile } = useApp()
  const t = useT()
  const ids = s.savedCases[profile.id] ?? []
  const list = s.cases.filter((c) => ids.includes(c.id))
  return (
    <Screen>
      <PageHeader title={t('Saved cases')} sub={t('For {name}', { name: profile.name })} />
      {list.length ? (
        <List>
          {list.map((c) => (
            <ListRow key={c.id} icon={BookmarkCheck} title={c.condition} sub={`${c.age} · ${t(c.sex === 'female' ? 'Female' : 'Male')}`} to={`/similar/cases/${c.id}`} />
          ))}
        </List>
      ) : (
        <EmptyState art="search" text={t('No saved cases yet.')} action={<Button to="/similar">{t('Find similar cases')}</Button>} />
      )}
    </Screen>
  )
}
