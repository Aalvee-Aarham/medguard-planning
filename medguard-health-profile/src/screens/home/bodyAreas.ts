import { Activity, Brain, Droplet, Eye, HeartPulse, Wind, Bean, type LucideIcon } from 'lucide-react'
import type { AppState } from '../../state/store'
import type { AreaKey } from '../../three/bodyScene'
import type { Medicine, RecordItem, TestResult } from '../../mock/types'

export interface AreaDef {
  id: AreaKey
  label: string
  icon: LucideIcon
  /** position on the anatomy model, in metres (+Y up, +Z front, left = +X, feet at 0) */
  pos: [number, number, number]
  /** position on the flat fallback figure, % of the stage */
  pos2: [number, number]
  match: RegExp
}

/** Body areas the Home explorer can show. Only areas that have records appear (sections show only when they have data). */
export const AREAS: AreaDef[] = [
  { id: 'brain', label: 'Brain and nerves', icon: Brain, pos: [-0.05, 1.69, 0.06], pos2: [50, 12], match: /stroke|infarct|ct brain|neuro|clopidogrel/i },
  { id: 'eyes', label: 'Eyes', icon: Eye, pos: [0.045, 1.6, 0.09], pos2: [55, 17], match: /cataract|\beye/i },
  { id: 'heart', label: 'Heart and blood pressure', icon: HeartPulse, pos: [0.055, 1.3, 0.128], pos2: [53, 36], match: /blood pressure|hypertension|aspirin|atorvastatin|amlodipine|losartan|statin|heart/i },
  { id: 'lungs', label: 'Lungs', icon: Wind, pos: [-0.095, 1.37, 0.125], pos2: [43, 33], match: /lung|asthma|pulmon|copd/i },
  { id: 'metabolic', label: 'Blood sugar', icon: Activity, pos: [-0.04, 1.14, 0.125], pos2: [47, 47], match: /diabet|hba1c|glucose|metformin|insulin/i },
  { id: 'kidneys', label: 'Kidneys', icon: Bean, pos: [0.1, 1.06, 0.115], pos2: [56, 50], match: /kidney|creatinine|renal/i },
  { id: 'blood', label: 'Blood count', icon: Droplet, pos: [-0.245, 0.99, 0.04], pos2: [31, 52], match: /haemoglobin|hemoglobin|anaemia|anemia|\bcbc\b/i },
]

export type AreaStatus = 'danger' | 'warning' | 'success'

export interface AreaData {
  def: AreaDef
  items: RecordItem[]
  tests: TestResult[]
  meds: Medicine[]
  status: AreaStatus
  count: number
  updated: string
}

export const outOfRange = (t: TestResult) => {
  const v = t.points[t.points.length - 1].value
  return v < t.low || v > t.high
}

/** Groups a profile's record by body area. Danger: a latest result out of range. Warning: a known condition. Else: normal. */
export function areaData(s: AppState, profileId: string): AreaData[] {
  const items = s.items.filter((i) => i.profileId === profileId && i.section !== 'doctors' && i.section !== 'allergies' && i.confirmed !== false)
  const tests = s.tests.filter((t) => t.profileId === profileId)
  const meds = s.medicines.filter((m) => m.profileId === profileId && m.current)
  const out: AreaData[] = []
  for (const def of AREAS) {
    const it = items.filter((i) => def.match.test(`${i.title} ${i.detail ?? ''}`))
    const ts = tests.filter((t) => def.match.test(t.name))
    const ms = meds.filter((m) => def.match.test(m.name))
    const count = it.length + ts.length + ms.length
    if (!count) continue
    const status: AreaStatus = ts.some(outOfRange) ? 'danger' : it.some((i) => i.section === 'conditions') ? 'warning' : 'success'
    const dates = [...it.map((i) => i.source.at), ...ts.map((t) => t.points[t.points.length - 1].date), ...ms.map((m) => m.source.at)].sort()
    out.push({ def, items: it, tests: ts, meds: ms, status, count, updated: dates[dates.length - 1] })
  }
  return out
}

export const STATUS_WORD: Record<AreaStatus, string> = { danger: 'Out of range', warning: 'Condition', success: 'Normal' }
