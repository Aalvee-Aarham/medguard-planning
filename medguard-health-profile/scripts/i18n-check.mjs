// i18n check: collects every UI string, writes src/i18n/en.json, lists strings missing from bn.json.
// Keys are the English strings themselves (see ArKo_AI_LOG.md, decision D4).
// Sources: t('...') calls, and string values of label/title/sub/body/desc/l/text/detail props,
// plus option arrays, which are passed to t() later.
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..', 'src')
const files = []
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) && files.push(path.join(d, e.name))))
walk(root)

const keys = new Set()
const str = String.raw`'((?:[^'\\]|\\.)+)'`
const patterns = [
  new RegExp(String.raw`\bt\(\s*` + str, 'g'),
  new RegExp(String.raw`\b(?:label|title|sub|body|desc|l|text|detail|what)\s*:\s*` + str, 'g'),
]
for (const f of files) {
  if (f.includes(`${path.sep}dev${path.sep}`) || f.includes(`${path.sep}mock${path.sep}seed`)) continue
  const src = fs.readFileSync(f, 'utf8')
  for (const re of patterns) for (const m of src.matchAll(re)) keys.add(m[1].replace(/\\'/g, "'"))
  // string arrays and tuples that feed t(): ['Felt sick', 'Ran out of medicine', ...]
  for (const m of src.matchAll(/\[\s*('[^'\n]+'(?:\s*,\s*'[^'\n]+')+)\s*\]/g))
    for (const s of m[1].matchAll(/'([^'\n]+)'/g)) if (/[A-Za-z]{2}/.test(s[1]) && /^[A-Z]/.test(s[1])) keys.add(s[1])
}
// drop things that are clearly not UI copy
const ui = [...keys].filter((k) => /[A-Za-z]/.test(k) && !/^[a-z-]+$/.test(k) && !/^(\/|#|https?:|[a-z]+\.[a-z]+)/.test(k) && !/[{}]{2}|=>|className/.test(k)).sort()

const en = Object.fromEntries(ui.map((k) => [k, k]))
fs.writeFileSync(path.join(root, 'i18n', 'en.json'), JSON.stringify(en, null, 2) + '\n')
const bn = JSON.parse(fs.readFileSync(path.join(root, 'i18n', 'bn.json'), 'utf8'))
const missing = ui.filter((k) => !(k in bn))
console.log(`${ui.length} strings. Bangla: ${ui.length - missing.length} translated, ${missing.length} missing.`)
if (process.argv.includes('--list')) console.log(JSON.stringify(missing, null, 0))
process.exitCode = missing.length && process.argv.includes('--strict') ? 1 : 0
