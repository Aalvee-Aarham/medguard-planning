import type { FormEventHandler, ReactNode } from 'react'
import { UnsavedChanges } from '../app/useUnsavedChanges'
import { useI18n } from '../i18n'
import { Button } from './ui'

interface FormPageProps {
  children: ReactNode
  onSubmit: FormEventHandler<HTMLFormElement>
  dirty?: boolean
  saveLabel?: string
  onCancel?: () => void
}

export function FormPage({ children, onSubmit, dirty = false, saveLabel, onCancel }: FormPageProps) {
  const { t } = useI18n()
  return (
    <form className="form-page stack" onSubmit={onSubmit}>
      <UnsavedChanges dirty={dirty} />
      {children}
      <div className="save-bar">
        {dirty && <span className="muted" role="status">{t('Unsaved changes')}</span>}
        <div className="actions">
          {onCancel && <Button variant="ghost" onClick={onCancel}>{t('Cancel')}</Button>}
          <Button type="submit">{saveLabel ?? t('Save changes')}</Button>
        </div>
      </div>
    </form>
  )
}
