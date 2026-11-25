import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CreditCard, Minus, Receipt, Smartphone, Sparkles } from 'lucide-react'
import { useApp, uid } from '../../state/store'
import { useT } from '../../i18n'
import { ActionBar, Button, Card, List, ListRow, Note, PageHeader, Radio, Screen, SectionTitle } from '../../components/ui'
import { StatusChip } from '../../components/status'
import { ConfirmDialog } from '../../components/overlays'
import { CheckDraw } from '../../components/CheckDraw'
import { fakeDelay } from '../../mock/api'
import { fmtDate } from '../../lib/format'

const ROWS: [string, string, string][] = [
  ['Family profiles', '2', '8'],
  ['AI chats a month', '20', 'Unlimited'],
  ['Similar-case searches a month', '3', 'Unlimited'],
  ['Storage', '500 MB', '10 GB'],
  ['Medicine reminders', '✓', '✓'],
  ['QR sharing and access log', '✓', '✓'],
]

/** H57 Plans: Free vs Premium (PLAN.md section 10 defaults) */
export function Plans() {
  const { s } = useApp()
  const t = useT()
  const premium = s.subscription.plan === 'premium'
  return (
    <Screen>
      <PageHeader title={t('Plans')} />
      <div className="overflow-hidden rounded-card border border-border-subtle bg-surface">
        <table className="w-full text-left">
          <caption className="sr-only">{t('Free and Premium compared')}</caption>
          <thead className="bg-primary-50">
            <tr>
              <th scope="col" className="p-3 text-small font-semibold text-ink-700">
                <span className="sr-only">{t('Feature')}</span>
              </th>
              <th scope="col" className="p-3 text-small font-semibold">{t('Free')}</th>
              <th scope="col" className="p-3 text-small font-semibold text-primary-700">{t('Premium')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {ROWS.map(([f, a, b]) => (
              <tr key={f}>
                <th scope="row" className="p-3 text-small font-semibold">{t(f)}</th>
                <td className="p-3 text-small tabular">{a === '✓' ? <Check className="size-5 text-success-text" aria-label={t('Included')} /> : t(a)}</td>
                <td className="p-3 text-small font-semibold tabular">{b === '✓' ? <Check className="size-5 text-success-text" aria-label={t('Included')} /> : t(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card className="mt-4 border-primary-100 bg-primary-50">
        <p className="text-display font-bold text-primary-700 tabular">BDT 149</p>
        <p className="text-body text-ink-700">{t('a month. Cancel any time.')}</p>
      </Card>
      <ActionBar>
        {premium ? (
          <Button full variant="secondary" to="/premium/subscription">
            {t('Manage subscription')}
          </Button>
        ) : (
          <Button full icon={Sparkles} to="/premium/checkout">
            {t('Get Premium')}
          </Button>
        )}
      </ActionBar>
    </Screen>
  )
}

/** H58 Checkout: bKash / Nagad / Card, mock success */
export function Checkout() {
  const { mutate, online } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [m, setM] = useState('bkash')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  if (done)
    return (
      <Screen className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
        <CheckDraw size={88} />
        <h1 className="text-h1 font-semibold">{t('You are on Premium')}</h1>
        <p className="text-body text-ink-700">{t('Receipt sent to your email.')}</p>
        <Button full onClick={() => nav('/home')}>
          {t('Go to Home')}
        </Button>
      </Screen>
    )
  return (
    <Screen>
      <PageHeader title={t('Pay for Premium')} sub={<span className="tabular">BDT 149 / {t('month')}</span>} />
      <Radio
        name="pay"
        legend={t('Payment method')}
        value={m}
        onChange={setM}
        options={[
          { value: 'bkash', label: 'bKash', desc: t('Pay from your bKash wallet') },
          { value: 'nagad', label: 'Nagad', desc: t('Pay from your Nagad wallet') },
          { value: 'card', label: t('Card'), desc: 'Visa, Mastercard, Amex' },
        ]}
      />
      <Note tone="neutral" icon={m === 'card' ? CreditCard : Smartphone} className="mt-4">
        {t('Demo: no money is taken.')}
      </Note>
      <ActionBar>
        <Button
          full
          loading={busy}
          disabled={!online}
          onClick={async () => {
            setBusy(true)
            await fakeDelay(null)
            const now = new Date()
            const renews = new Date(now)
            renews.setMonth(now.getMonth() + 1)
            mutate((d) => {
              d.subscription = { plan: 'premium', renews: renews.toISOString(), method: m as 'bkash', receipts: [{ id: uid('rc'), at: now.toISOString(), amount: 149 }, ...d.subscription.receipts] }
            })
            setBusy(false)
            setDone(true)
          }}
        >
          {t('Pay BDT 149')}
        </Button>
      </ActionBar>
    </Screen>
  )
}

/** H59 Subscription: plan, renewal date, receipts, Cancel (confirm) */
export function Subscription() {
  const { s, mutate, toast } = useApp()
  const t = useT()
  const [cancel, setCancel] = useState(false)
  const sub = s.subscription
  return (
    <Screen>
      <PageHeader title={t('Subscription')} />
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-h3 font-semibold">{sub.plan === 'premium' ? t('Premium') : t('Free')}</p>
          <StatusChip status="active" />
        </div>
        {sub.renews && <p className="mt-1 text-body text-ink-700 tabular">{t('Renews on {date}', { date: fmtDate(sub.renews) })}</p>}
      </Card>
      <SectionTitle>{t('Receipts')}</SectionTitle>
      {sub.receipts.length ? (
        <List>
          {sub.receipts.map((r) => (
            <ListRow key={r.id} icon={Receipt} title={<span className="tabular">BDT {r.amount}</span>} sub={fmtDate(r.at)} />
          ))}
        </List>
      ) : (
        <p className="text-ink-700">{t('No receipts yet.')}</p>
      )}
      {sub.plan === 'premium' ? (
        <Button full variant="tertiary" icon={Minus} className="mt-6 text-danger-text" onClick={() => setCancel(true)}>
          {t('Cancel Premium')}
        </Button>
      ) : (
        <Button full className="mt-6" to="/premium">
          {t('See plans')}
        </Button>
      )}
      <ConfirmDialog
        open={cancel}
        onClose={() => setCancel(false)}
        title={t('Cancel Premium?')}
        body={t('You keep Premium until {date}. After that, profiles beyond 2 become view only. Nothing is deleted.', { date: sub.renews ? fmtDate(sub.renews) : '' })}
        confirmLabel={t('Cancel Premium')}
        destructive
        onConfirm={() => {
          mutate((d) => void (d.subscription = { ...d.subscription, plan: 'free', renews: undefined }))
          toast(t('Premium cancelled'))
        }}
      />
    </Screen>
  )
}
