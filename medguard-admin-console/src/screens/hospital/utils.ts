export function hospitalDay(date: string) {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return ''
  const fields = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => fields.find((field) => field.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function taka(amount: number) {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(amount)
}

export function downloadAudit(rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => {
    const safe = /^\s*[=+@\-\t\r]/u.test(cell) ? `'${cell}` : cell
    return `"${safe.replaceAll('"', '""')}"`
  }).join(',')).join('\r\n')

  const objectUrl = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = 'medguard-hospital-audit.csv'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
