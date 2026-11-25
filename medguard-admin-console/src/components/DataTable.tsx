import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Ellipsis, Search } from 'lucide-react'
import { useI18n } from '../i18n'
import { Button, EmptyState } from './ui'

interface Column<Row> {
  heading: string
  cell: (row: Row) => ReactNode
  sort?: (row: Row) => string | number
}

interface RowAction {
  label: string
  run: () => void
  danger?: boolean
}

interface DataTableProps<Row> {
  rows: Row[]
  columns: Column<Row>[]
  rowKey: (row: Row) => string
  searchText?: (row: Row) => string
  searchLabel?: string
  filters?: ReactNode
  emptyTitle?: string
  emptyAction?: ReactNode
  actions?: (row: Row) => RowAction[]
  pageSize?: number
}

function RowMenu({ actions }: { actions: RowAction[] }) {
  const { t } = useI18n()
  const popupId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = popup.current
    if (!element) return

    function place() {
      const button = trigger.current?.getBoundingClientRect()
      if (!button || !element?.matches(':popover-open')) return
      element.style.left = `${Math.max(8, button.right - element.offsetWidth)}px`
      const top = button.bottom + element.offsetHeight + 8 > window.innerHeight
        ? Math.max(8, button.top - element.offsetHeight - 4)
        : button.bottom + 4
      element.style.top = `${top}px`
    }

    element.addEventListener('toggle', place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      element.removeEventListener('toggle', place)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [])

  if (!actions.length) return null

  return (
    <>
      <button ref={trigger} type="button" className="button button-ghost icon-button" popoverTarget={popupId} aria-label={t('Row actions')}>
        <Ellipsis aria-hidden="true" />
      </button>
      <div ref={popup} id={popupId} popover="auto" className="table-menu">
        {actions.map((action) => (
          <button key={action.label} type="button" className={action.danger ? 'danger-text' : undefined} onClick={() => {
            popup.current?.hidePopover()
            action.run()
          }}>{action.label}</button>
        ))}
      </div>
    </>
  )
}

export function DataTable<Row>({
  rows, columns, rowKey, searchText, searchLabel, filters, emptyTitle, emptyAction, actions, pageSize = 8,
}: DataTableProps<Row>) {
  const { t, language } = useI18n()
  const [query, setQuery] = useState('')
  const [pagination, setPagination] = useState({ page: 1, scope: '' })
  const [sort, setSort] = useState<{ column: number; descending: boolean }>()
  const scope = JSON.stringify(rows.map(rowKey))
  const term = query.trim().toLocaleLowerCase(language)
  const matching = rows.filter((row) => !term || searchText?.(row).toLocaleLowerCase(language).includes(term))
  const sortColumn = sort && columns[sort.column]?.sort
  if (sort && sortColumn) {
    const collator = new Intl.Collator(language, { numeric: true, sensitivity: 'base' })
    matching.sort((a, b) => {
      const left = sortColumn(a)
      const right = sortColumn(b)
      const diff = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : collator.compare(String(left), String(right))
      return sort.descending ? -diff : diff
    })
  }

  const pageCount = Math.max(1, Math.ceil(matching.length / pageSize))
  const shownPage = pagination.scope === scope ? Math.min(pagination.page, pageCount) : 1
  const setPage = (page: number) => setPagination({ page, scope })
  const start = (shownPage - 1) * pageSize
  const shown = matching.slice(start, start + pageSize)
  const label = searchLabel ?? t('Search')

  return (
    <section className="table-card">
      {(searchText || filters) && (
        <div className="table-filters">
          {searchText && (
            <label className="table-search">
              <span>{label}</span>
              <span className="search-control">
                <Search aria-hidden="true" />
                <input type="search" placeholder={label} value={query} onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }} />
              </span>
            </label>
          )}
          {filters}
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState title={term ? t('No matching results') : emptyTitle ?? t('No records to show')} action={term ? (
          <Button variant="secondary" onClick={() => { setQuery(''); setPage(1) }}>{t('Clear search')}</Button>
        ) : emptyAction} />
      ) : (
        <div className="table-scroll" tabIndex={0} role="region" aria-label={t('Results table')}>
          <table>
            <thead>
              <tr>
                {columns.map((column, index) => {
                  const direction = sort?.column === index ? (sort.descending ? 'descending' : 'ascending') : undefined
                  const Icon = direction === 'ascending' ? ArrowUp : direction === 'descending' ? ArrowDown : ArrowUpDown
                  return (
                    <th key={column.heading} scope="col" aria-sort={direction}>
                      {column.sort ? (
                        <button type="button" className="sort-button" onClick={() => {
                          setSort({ column: index, descending: sort?.column === index && !sort.descending })
                          setPage(1)
                        }}>{column.heading}<Icon aria-hidden="true" /></button>
                      ) : column.heading}
                    </th>
                  )
                })}
                {actions && <th scope="col" className="table-action-cell"><span className="sr-only">{t('Actions')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((column) => <td key={column.heading}>{column.cell(row)}</td>)}
                  {actions && <td className="table-action-cell"><RowMenu actions={actions(row)} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {shown.length > 0 && (
        <footer className="table-footer">
          <span role="status">{t('{first}–{last} of {total}', { first: start + 1, last: start + shown.length, total: matching.length })}</span>
          {pageCount > 1 && (
            <nav className="actions" aria-label={t('Pagination')}>
              <Button variant="ghost" className="icon-button" aria-label={t('Previous page')} disabled={shownPage === 1} onClick={() => setPage(shownPage - 1)}><ChevronLeft aria-hidden="true" /></Button>
              <span>{t('Page {page} of {total}', { page: shownPage, total: pageCount })}</span>
              <Button variant="ghost" className="icon-button" aria-label={t('Next page')} disabled={shownPage === pageCount} onClick={() => setPage(shownPage + 1)}><ChevronRight aria-hidden="true" /></Button>
            </nav>
          )}
        </footer>
      )}
    </section>
  )
}
