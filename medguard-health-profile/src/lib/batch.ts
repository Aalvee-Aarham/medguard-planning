import type { UploadBatch } from '../mock/types'
import { uid } from '../state/store'

/** Builds a mock upload batch. The fake AI "reads" these fields; low confidence ones are highlighted. */
export function makeBatch(profileId: string, pageNames: string[]): UploadBatch {
  const pages = pageNames.map((name, i) => ({ id: uid('pg'), name, seed: 10 + i * 3 + Math.floor(Math.random() * 3) }))
  const many = pages.length >= 2
  return {
    id: uid('b'),
    profileId,
    createdAt: new Date().toISOString(),
    pages,
    status: 'processing',
    progress: 0,
    issues: many
      ? [
          { id: uid('is'), kind: 'duplicate', detail: 'Page 1 and page {n} look like the same report.', options: ['Keep page 1', 'Keep page {n}', 'Keep both'] },
          { id: uid('is'), kind: 'name', detail: 'Page 2 has a different name: “Rahima Khatun”.', options: ['It’s this profile', 'A family member’s', 'Not mine, remove it'] },
          { id: uid('is'), kind: 'conflict', detail: 'Two blood pressure medicines found: Amlodipine 5 mg and Losartan 50 mg. Which are you taking now?', options: ['Amlodipine 5 mg', 'Losartan 50 mg', 'Both'] },
        ]
      : [],
    fields: [
      { id: uid('f'), section: 'medicines', label: 'Medicine', value: 'Metformin 500 mg, twice daily after food', confidence: 0.93, confirmed: false, page: 0 },
      { id: uid('f'), section: 'medicines', label: 'Medicine', value: 'Losartan 50 mg, once daily', confidence: 0.66, confirmed: false, page: 0 },
      { id: uid('f'), section: 'conditions', label: 'Condition', value: 'Chronic kidney disease, stage 2', confidence: 0.72, confirmed: false, page: Math.min(1, pages.length - 1) },
      { id: uid('f'), section: 'tests', label: 'Test result', value: 'Creatinine 1.4 mg/dL', confidence: 0.9, confirmed: false, page: Math.min(1, pages.length - 1) },
      { id: uid('f'), section: 'allergies', label: 'Allergy', value: 'Sulfa drugs', confidence: 0.58, confirmed: false, page: 0 },
    ],
  }
}
