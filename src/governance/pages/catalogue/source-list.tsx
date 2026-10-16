import { Database } from 'lucide-react';

import { useJson } from '@/governance/lib/use-json';
import type { AsyncStatus, Row, SqlResult } from '@/governance/lib/use-sql';
import { Badge, Card, DataTable, EmptyState, ReportShell } from '@/governance/ui';
import { ClassificationBadge, StatusDot } from './badges';
import type { SourceSummary } from './types';

/** DataTable was built for useSql results — this adapts a plain JSON list to that shape. */
function asSqlResult(sources: SourceSummary[] | null, status: AsyncStatus, error: unknown): SqlResult {
  return {
    rows: sources ?? [],
    columns: [],
    truncated: false,
    status,
    error,
    refresh: () => {},
  };
}

export function SourceList({ onSelect }: { onSelect: (id: string) => void }) {
  const { data, status, error } = useJson<{ sources: SourceSummary[] }>('/api/catalogue/sources');
  const result = asSqlResult(data?.sources ?? null, status, error);

  return (
    <ReportShell
      title="Source catalogue"
      description="Data quality, governance and ownership for every source, in one place."
      toolbar={<Badge variant="warning">Prototype — mock data</Badge>}
    >
      <Card.Root status={status} error={error}>
        {status === 'ready' && (data?.sources.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Database />}
            title="No sources yet"
            description="Sources will show up here once the catalogue is connected to a real metadata store."
          />
        ) : (
          <DataTable
            result={result}
            onRowClick={(row) => onSelect(row.id as string)}
            columns={[
              {
                key: 'code',
                label: 'Source',
                format: (_value, row: Row) => (
                  <div className="flex flex-col">
                    <span className="font-medium">{row.code}</span>
                    <span className="text-xs text-muted-foreground">{row.description}</span>
                  </div>
                ),
              },
              { key: 'domain', label: 'Domain' },
              {
                key: 'status',
                label: 'Status',
                format: (value) => <StatusDot label={String(value)} />,
              },
              {
                key: 'classification',
                label: 'Governance',
                format: (value) => <ClassificationBadge classification={value} />,
              },
              { key: 'developer', label: 'Developer' },
              {
                key: 'lastUpdated',
                label: 'Last updated',
                format: (value) =>
                  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              },
            ]}
          />
        )}
      </Card.Root>
    </ReportShell>
  );
}
