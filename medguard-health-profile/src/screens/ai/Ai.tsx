import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, History, Send, Stethoscope, Trash2 } from 'lucide-react'
import { useApp, LIMITS, uid } from '../../state/store'
import { useT } from '../../i18n'
import { Avatar, Button, cx, Input, List, ListRow, Note, PageHeader, Screen, SectionTitle } from '../../components/ui'
import { ConfirmDialog } from '../../components/overlays'
import { EmptyState, Loadable } from '../../components/states'
import { fakeDelay, useFakeLoad } from '../../mock/api'
import { fmtDate } from '../../lib/format'
import type { ChatMessage } from '../../mock/types'

/** Mock AI: canned answers by keyword. Explains the user's own reports. Never a diagnosis. */
function answer(q: string, s: ReturnType<typeof useApp>['s'], pid: string, t: (k: string, v?: Record<string, string | number>) => string): Omit<ChatMessage, 'id' | 'from'> {
  const lq = q.toLowerCase()
  const tests = s.tests.filter((x) => x.profileId === pid)
  const hit = tests.find((x) => lq.includes(x.name.toLowerCase().split(' ')[0].toLowerCase()))
  if (/(do i have|diagnos|cancer|serious|should i stop|dose|increase|decrease|chest pain|emergency)/.test(lq))
    return { text: t('I can explain what your reports say, but this question needs a doctor. Please talk to your doctor about it. If you feel very unwell, call 999.'), doctorNote: true }
  if (hit) {
    const last = hit.points[hit.points.length - 1]
    const first = hit.points[0]
    const out = last.value < hit.low || last.value > hit.high
    return {
      text: t('{name} was {v} {unit} on your latest report. The normal range printed on the report is {lo} to {hi} {unit}, so it is {state}. It was {f} {unit} on {fd}.', {
        name: hit.name, v: last.value, unit: hit.unit, lo: hit.low, hi: hit.high, state: out ? t('outside the normal range') : t('inside the normal range'), f: first.value, fd: fmtDate(first.date),
      }),
      cite: s.documents.find((d) => d.id === last.documentId)?.title ?? hit.name,
    }
  }
  if (/(medicine|aspirin|metformin|statin|pill|ওষুধ)/.test(lq)) {
    const meds = s.medicines.filter((m) => m.profileId === pid && m.current)
    return { text: t('Your current medicines are: {list}. Each one was added from a prescription or by you. Your doctor can explain why each one was chosen.', { list: meds.map((m) => `${m.name} ${m.dose}`).join(', ') }), cite: s.documents.find((d) => d.profileId === pid && d.kind === 'prescription')?.title }
  }
  return { text: t('I can explain words and numbers in your own reports. Try asking about a test, such as “What does my haemoglobin mean?”'), cite: undefined }
}

/** H39 Chat */
export function Chat() {
  const { s, profile, mutate, online, setLimitHit } = useApp()
  const t = useT()
  const [q] = useSearchParams()
  const threadId = q.get('thread')
  const [msgs, setMsgs] = useState<ChatMessage[]>(() => s.chats.find((c) => c.id === threadId)?.messages ?? [])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const tid = useRef(threadId ?? uid('ch'))
  const premium = s.subscription.plan === 'premium'
  const left = premium ? Infinity : LIMITS.free.chats - s.usage.chats
  const aiOff = !s.settings.consents.ai
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs.length])
  const tests = s.tests.filter((x) => x.profileId === profile.id)
  const suggestions = [tests[0] && t('What does my {name} mean?', { name: tests[0].name }), t('What are my current medicines for?'), t('Explain my last report in simple words')].filter(Boolean) as string[]

  const ask = async (question: string) => {
    if (!question.trim() || busy) return
    if (!premium && left <= 0) return setLimitHit('chats')
    const um: ChatMessage = { id: uid('m'), from: 'user', text: question.trim() }
    setMsgs((m) => [...m, um])
    setText('')
    setBusy(true)
    await fakeDelay(null)
    const a: ChatMessage = { id: uid('m'), from: 'ai', ...answer(question, s, profile.id, t) }
    setMsgs((m) => {
      const all = [...m, a]
      mutate((d) => {
        d.usage.chats++
        const ex = d.chats.find((c) => c.id === tid.current)
        if (ex) ex.messages = all
        else d.chats.unshift({ id: tid.current, profileId: profile.id, title: question.trim().slice(0, 60), at: new Date().toISOString(), messages: all })
      })
      return all
    })
    setBusy(false)
  }

  return (
    <div className="flex min-h-[calc(100dvh-160px)] flex-col">
      <Screen className="flex-1">
        <PageHeader title={t('Ask AI')} back={false} action={<Button variant="tertiary" icon={History} to="/ai/history" className="px-3">{t('History')}</Button>} />
        <div className="flex items-center gap-2 rounded-card border border-border-subtle bg-surface p-3">
          <Avatar name={profile.name} size={32} />
          <p className="flex-1 text-small text-ink-700">{t('Answers use {name}’s reports only.', { name: profile.name })}</p>
        </div>
        {!premium && (
          <p className="mt-2 text-small text-ink-700 tabular" aria-live="polite">
            {t('{n} of {max} left this month', { n: Math.max(left, 0), max: LIMITS.free.chats })}
          </p>
        )}
        {aiOff ? (
          <Note tone="neutral" className="mt-4">
            {t('AI processing is off. Turn it on in Privacy to use Ask AI.')}
            <Button variant="secondary" className="mt-3" to="/settings/privacy">
              {t('Turn on AI processing')}
            </Button>
          </Note>
        ) : msgs.length === 0 ? (
          <div className="mt-6">
            <EmptyState art="chat" text={t('Ask about a word or number in your reports. AI explains; it does not diagnose.')} />
            <SectionTitle>{t('Try asking')}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((x) => (
                <button key={x} type="button" disabled={!online} onClick={() => ask(x)} className="btn min-h-12 rounded-full border border-primary-100 bg-primary-50 px-4 text-left text-small font-semibold text-primary-700 disabled:opacity-60">
                  {x}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="mt-4 flex flex-col gap-3" aria-live="polite">
            {msgs.map((m) => (
              <li key={m.id} className={cx('max-w-[85%] rounded-card p-3', m.from === 'user' ? 'self-end bg-primary-600 text-white' : 'self-start border border-border-subtle bg-surface')}>
                <p className="text-body">{m.text}</p>
                {m.cite && (
                  <p className="mt-2 flex items-center gap-1 text-caption text-ink-700">
                    <FileText className="size-3.5" aria-hidden /> {t('From: {doc}', { doc: m.cite })}
                  </p>
                )}
                {m.doctorNote && (
                  <Note tone="info" icon={Stethoscope} className="mt-2">
                    {t('Talk to a doctor about this.')}
                  </Note>
                )}
              </li>
            ))}
            {busy && (
              <li className="self-start rounded-card border border-border-subtle bg-surface p-3 text-small text-ink-700" role="status">
                {t('Reading your reports…')}
              </li>
            )}
          </ol>
        )}
        <div ref={end} />
      </Screen>
      {!aiOff && (
        <form
          className="safe-bottom sticky bottom-16 z-10 mx-auto flex w-full max-w-3xl items-end gap-2 border-t border-border-subtle bg-surface px-4 py-3 shadow-bar lg:bottom-0 lg:rounded-t-card lg:border-x"
          onSubmit={(e) => {
            e.preventDefault()
            ask(text)
          }}
        >
          <div className="flex-1">
            <label htmlFor="ask" className="sr-only">
              {t('Your question')}
            </label>
            <input id="ask" value={text} onChange={(e) => setText(e.target.value)} disabled={!online} placeholder={online ? t('Ask about your reports') : t('Needs internet')} className="h-12 w-full rounded-control border border-border-input px-3 focus:border-2 focus:border-primary-600 focus:outline-none" />
          </div>
          <Button type="submit" aria-label={t('Send')} disabled={!online || !text.trim()} loading={busy} icon={busy ? undefined : Send} className="w-12 px-0" />
        </form>
      )}
    </div>
  )
}

/** H40 Chat history: search + delete */
export function ChatHistory() {
  const { s, profile, mutate } = useApp()
  const t = useT()
  const [q, setQ] = useState('')
  const [del, setDel] = useState<string | null>(null)
  const { state, retry } = useFakeLoad('hist')
  const list = s.chats.filter((c) => c.profileId === profile.id && c.title.toLowerCase().includes(q.toLowerCase()))
  return (
    <Screen>
      <PageHeader title={t('Past chats')} />
      <Input label={t('Search chats')} type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      <Loadable state={state} retry={retry}>
        {list.length ? (
          <List className="mt-4">
            {list.map((c) => (
              <ListRow
                key={c.id}
                title={c.title}
                sub={fmtDate(c.at)}
                to={`/ai?thread=${c.id}`}
                right={
                  <button type="button" aria-label={t('Delete chat: {title}', { title: c.title })} onClick={(e) => (e.preventDefault(), setDel(c.id))} className="grid size-12 place-items-center rounded-full text-ink-700 hover:bg-danger-bg hover:text-danger-text">
                    <Trash2 className="size-5" />
                  </button>
                }
              />
            ))}
          </List>
        ) : (
          <div className="mt-4">
            <EmptyState art="chat" text={q ? t('No chats match “{q}”.', { q }) : t('No chats yet.')} action={!q && <Button to="/ai">{t('Ask a question')}</Button>} />
          </div>
        )}
      </Loadable>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={t('Delete this chat?')} body={t('The answers are deleted. Your reports are not touched.')} confirmLabel={t('Delete')} destructive onConfirm={() => mutate((d) => void (d.chats = d.chats.filter((c) => c.id !== del)))} />
    </Screen>
  )
}

