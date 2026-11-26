// Table rules (PLAN.md section 4): 48 px rows, sticky header, no zebra, primary-50 hover,
// sortable headers, filters above, pagination below.
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Search } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useT } from '../state/store';
import { EmptyState, ErrorState, TableSkeleton } from './States';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Give this to make the column sortable. */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right';
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Text each row is searched by. Leave out to hide the search box. */
  searchText?: (row: T) => string;
  /** Extra filters shown next to the search box. */
  filters?: ReactNode;
  pageSize?: number;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  empty?: ReactNode;
  caption: string;
}

export function DataTable<T>({ rows, columns, rowId, onRowClick, searchText, filters, pageSize = 10, loading, error, onRetry, empty, caption }: Props<T>) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q && searchText ? rows.filter((r) => searchText(r).toLowerCase().includes(q)) : rows;
    const col = sort && columns.find((c) => c.key === sort.key);
    if (col?.sortValue) {
      const get = col.sortValue;
      list = [...list].sort((a, b) => {
        const x = get(a), y = get(b);
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return sort!.dir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, query, sort, columns, searchText]);

  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages - 1);
  const pageRows = visible.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));

  return (
    <div className="rounded-card border border-border-subtle bg-surface">
      {(searchText || filters) && (
        <div className="flex flex-wrap items-end gap-4 border-b border-border-subtle p-4">
          {searchText && (
            <label className="flex flex-col gap-1 text-sm font-semibold text-ink-700">
              {t('table.search')}
              <span className="relative">
                <Search size={20} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(0); }}
                  className="input w-72 pl-10"
                />
              </span>
            </label>
          )}
          {filters}
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState onRetry={onRetry ?? (() => {})} />
      ) : rows.length === 0 ? (
        empty ?? <EmptyState title={t('state.empty')} />
      ) : (
        <>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="sticky top-0 z-10 bg-surface shadow-bar">
                <tr>
                  {columns.map((c) => {
                    const active = sort?.key === c.key;
                    const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                        className={`h-12 px-4 font-semibold text-ink-700 ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        {c.sortValue ? (
                          <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 rounded-control hover:text-primary-600">
                            {c.header}
                            <Icon size={16} aria-hidden className={active ? 'text-primary-600' : 'text-ink-500'} />
                          </button>
                        ) : (
                          c.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr
                    key={rowId(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`h-12 border-t border-border-subtle hover:bg-primary-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={`px-4 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && <EmptyState title={t('table.noResults')} />}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-4 py-2 text-sm text-ink-700">
            <span className="tabular-nums">
              {t('table.showing', {
                from: visible.length ? current * pageSize + 1 : 0,
                to: Math.min(visible.length, (current + 1) * pageSize),
                total: visible.length,
              })}
            </span>
            <button type="button" aria-label={t('table.prev')} disabled={current === 0} onClick={() => setPage(current - 1)} className="btn-icon">
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button type="button" aria-label={t('table.next')} disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="btn-icon">
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
