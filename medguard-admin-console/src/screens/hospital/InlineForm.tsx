import { useState, type ComponentProps } from 'react'
import { Button, FormPage, Modal } from '../../components'
import { useI18n } from '../../i18n'

export function InlineForm({ onCancel, ...props }: ComponentProps<typeof FormPage> & { onCancel: () => void }) {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  return <>
    <FormPage {...props} onCancel={() => {
      if (props.dirty) setConfirming(true)
      else onCancel()
    }} />
    {confirming && <Modal title={t('Discard unsaved changes?')} onClose={() => setConfirming(false)}>
      <p>{t('Your changes on this page will be lost if you leave.')}</p>
      <div className="dialog-actions">
        <Button variant="secondary" onClick={() => setConfirming(false)}>{t('Keep editing')}</Button>
        <Button variant="danger" onClick={onCancel}>{t('Discard changes')}</Button>
      </div>
    </Modal>}
  </>
}
