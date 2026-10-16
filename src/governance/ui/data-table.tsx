import type * as React from 'react';

import type { Row, SqlResult } from '@/governance/lib/use-sql';
import { cn } from '@/governance/lib/utils';
import { EmptyState, ErrorMessage, Skeleton } from './feedback';

export interface ColumnSpec {
  /** Column name as it comes back from the query, e.g. 'TOTAL_CASES'. */
  key: string;
  label?: string;
  align?: 'left' | 'right';
  format?: (value: any, row: Row) => React.ReactNode;
}

/**
 * Renders a query result as a table. With no `columns` it shows whatever the
 * query returned, in order.
 *
 *   <DataTable result={sales} columns={[
 *     { key: 'REGION', label: 'Region' },
 *     { key: 'TOTAL', label: 'Total', align: 'right', format: (v) => formatCurrency(v) },
 *   ]} />
 */
export function DataTable({
  result,
  columns,
  maxRows = 100,
  className,
  onRowClick,
}: {
  result: SqlResult;
  columns?: ColumnSpec[];
  maxRows?: number;
  className?: string;
  onRowClick?: (row: Row) => void;
}) {
  const specs: ColumnSpec[] = columns ?? result.columns.map((key) => ({ key }));

  if (result.status === 'error') {
    return (
      <ErrorMessage
        className="p-4"
        message="Couldn't load this table."
        detail={result.error instanceof Error ? result.error.message : undefined}
      />
    );
  }

  if (result.status === 'initial') {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (result.rows.length === 0) {
    return <EmptyState title="No rows" description="This query returned nothing." />;
  }

  const rows = result.rows.slice(0, maxRows);

  return (
    <div className={cn('relative w-full overflow-x-auto', className)}>
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr>
            {specs.map((spec) => (
              <th
                key={spec.key}
                className={cn(
                  'h-10 px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground',
                  spec.align === 'right' && 'text-right'
                )}
              >
                {spec.label ?? spec.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b transition-colors hover:bg-muted/50',
                onRowClick && 'cursor-pointer'
              )}
            >
              {specs.map((spec) => (
                <td
                  key={spec.key}
                  className={cn(
                    'h-10 px-3 align-middle whitespace-nowrap',
                    spec.align === 'right' && 'text-right tabular-nums'
                  )}
                >
                  {spec.format ? spec.format(row[spec.key], row) : String(row[spec.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(result.truncated || result.rows.length > maxRows) && (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Showing {rows.length.toLocaleString()} rows. Narrow the query to see the rest.
        </p>
      )}
    </div>
  );
}
