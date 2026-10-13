import React from 'react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface ResponsiveTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  className?: string;
  breakpointThreshold?: 'sm' | 'md' | 'lg';
}

/**
 * ResponsiveTable: Renders a traditional table on wider screens and
 * automatically decomposes into accessible mobile cards on small screens.
 */
export function ResponsiveTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
  className = '',
  breakpointThreshold = 'md',
}: ResponsiveTableProps<T>) {
  const hiddenTableClass =
    breakpointThreshold === 'sm'
      ? 'hidden sm:table'
      : breakpointThreshold === 'md'
      ? 'hidden md:table'
      : 'hidden lg:table';

  const visibleCardsClass =
    breakpointThreshold === 'sm'
      ? 'sm:hidden'
      : breakpointThreshold === 'md'
      ? 'md:hidden'
      : 'lg:hidden';

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-text-muted border border-surface-border rounded-xl">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`w-full min-w-0 ${className}`.trim()}>
      {/* Desktop Table View */}
      <div className={`w-full overflow-x-auto ${hiddenTableClass}`}>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-text-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {data.map((item, rowIdx) => (
              <tr
                key={keyExtractor(item, rowIdx)}
                className="hover:bg-surface-raised/40 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3.5 px-4 ${
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left'
                    }`}
                  >
                    {col.render ? col.render(item, rowIdx) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className={`flex flex-col gap-3 ${visibleCardsClass}`}>
        {data.map((item, rowIdx) => (
          <div
            key={keyExtractor(item, rowIdx)}
            className="p-4 rounded-xl border border-surface-border bg-surface-card/60 flex flex-col gap-2.5"
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex items-center justify-between text-xs sm:text-sm gap-2"
              >
                <span className="text-text-muted font-medium">{col.header}</span>
                <span className="font-semibold text-right">
                  {col.render ? col.render(item, rowIdx) : (item as any)[col.key]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
