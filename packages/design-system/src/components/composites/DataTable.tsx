import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';

export type SortDirection = 'asc' | 'desc' | null;

export interface DataTableColumn<TRow> {
  /** Unique id. Used as React key and sort accessor when `accessor` omitted. */
  id: string;
  /** Column header. */
  header: ReactNode;
  /** Cell renderer — receives the row. */
  cell: (row: TRow, index: number) => ReactNode;
  /** Getter for sort comparisons. If omitted, column is not sortable. */
  sortAccessor?: (row: TRow) => string | number | Date | null | undefined;
  /** Horizontal alignment. */
  align?: 'left' | 'center' | 'right';
  /** Width (CSS value, e.g. "120px" or "15%"). */
  width?: string;
  /** Max width for truncation. */
  maxWidth?: string;
}

export interface DataTableSort {
  columnId: string;
  direction: Exclude<SortDirection, null>;
}

export interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[];
  data: TRow[];
  /** Unique row id accessor — required for stable React keys. */
  getRowId: (row: TRow, index: number) => string;
  /** Render as clickable rows. */
  onRowClick?: (row: TRow) => void;
  /** Controlled sort. If omitted, the table sorts internally. */
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  loading?: boolean;
  empty?: ReactNode;
  className?: string;
  /** Sticky header (for long scrollable tables). */
  stickyHeader?: boolean;
}

const compare = (a: unknown, b: unknown): number => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'tr-TR');
};

export function DataTable<TRow>({
  columns,
  data,
  getRowId,
  onRowClick,
  sort: controlledSort,
  onSortChange,
  loading = false,
  empty,
  className,
  stickyHeader = false,
}: DataTableProps<TRow>) {
  const [internalSort, setInternalSort] = useState<DataTableSort | null>(null);
  const sort = controlledSort !== undefined ? controlledSort : internalSort;

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const column = columns.find((c) => c.id === sort.columnId);
    if (!column?.sortAccessor) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = column.sortAccessor!(a);
      const bv = column.sortAccessor!(b);
      const cmp = compare(av, bv);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [data, sort, columns]);

  const handleSort = (column: DataTableColumn<TRow>) => {
    if (!column.sortAccessor) return;
    let next: DataTableSort | null;
    if (!sort || sort.columnId !== column.id) {
      next = { columnId: column.id, direction: 'asc' };
    } else if (sort.direction === 'asc') {
      next = { columnId: column.id, direction: 'desc' };
    } else {
      next = null;
    }
    if (onSortChange) onSortChange(next);
    else setInternalSort(next);
  };

  const alignClass = (align?: 'left' | 'center' | 'right') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-line bg-bg',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead
            className={cn(
              'border-b border-line bg-bg-2',
              stickyHeader && 'sticky top-0 z-10',
            )}
          >
            <tr>
              {columns.map((col) => {
                const sorted = sort?.columnId === col.id ? sort.direction : null;
                const sortable = !!col.sortAccessor;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    style={{ width: col.width, maxWidth: col.maxWidth }}
                    className={cn(
                      'h-10 px-4 align-middle text-[11px] font-semibold uppercase tracking-wide text-ink-60',
                      alignClass(col.align),
                    )}
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded hover:text-ink',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                          col.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        <span>{col.header}</span>
                        {sorted === 'asc' ? (
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        ) : sorted === 'desc' ? (
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <LoadingSpinner size="md" />
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12">
                  {empty ?? <EmptyState title="Veri yok" description="Görüntülenecek kayıt bulunamadı." />}
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => (
                <tr
                  key={getRowId(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-line last:border-b-0 transition-colors duration-fast',
                    onRowClick &&
                      'cursor-pointer hover:bg-bg-2 focus-within:bg-bg-2',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      style={{ maxWidth: col.maxWidth }}
                      className={cn(
                        'px-4 py-3 align-middle text-sm text-ink',
                        alignClass(col.align),
                        col.maxWidth && 'truncate',
                      )}
                    >
                      {col.cell(row, idx)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
