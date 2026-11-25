// Dates "25 Nov 2026", times "8:00 AM". Doses, vitals and times always use English digits (PLAN.md section 10).
const EN_M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const BN_M = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']

let lang: 'en' | 'bn' = 'en'
export const setFormatLang = (l: 'en' | 'bn') => (lang = l)

export function fmtDate(iso: string | Date) {
  const d = new Date(iso)
  return `${d.getDate()} ${(lang === 'bn' ? BN_M : EN_M)[d.getMonth()]} ${d.getFullYear()}`
}
export function monthName(m: number) {
  return (lang === 'bn' ? BN_M : EN_M)[m]
}
export function fmtTime(iso: string | Date) {
  const d = new Date(iso)
  return hm12(d.getHours(), d.getMinutes())
}
export function hm12(h: number, m: number) {
  const ap = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`
}
/** "08:00" -> "8:00 AM" */
export function fmtHHMM(t: string) {
  const [h, m] = t.split(':').map(Number)
  return hm12(h, m)
}
export function fmtDateTime(iso: string) {
  return `${fmtDate(iso)}, ${fmtTime(iso)}`
}
export function age(dob: string) {
  const d = new Date(dob)
  const n = new Date()
  let a = n.getFullYear() - d.getFullYear()
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--
  return a
}
/** next dose time today/tomorrow for "HH:MM" times */
export function nextDose(times: string[], from = new Date()) {
  const cands = times.flatMap((t) => {
    const [h, m] = t.split(':').map(Number)
    const a = new Date(from)
    a.setHours(h, m, 0, 0)
    const b = new Date(a.getTime() + 86400000)
    return [a, b]
  })
  // a dose up to 60 min late still counts as "due now"
  const soon = cands.filter((c) => c.getTime() > from.getTime() - 60 * 60000).sort((x, y) => x.getTime() - y.getTime())
  return soon[0]
}
export function countdown(ms: number) {
  if (ms <= 0) return '0:00'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`
}
export const initials = (name: string) =>
  name.replace(/^Dr\.\s*/, '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
