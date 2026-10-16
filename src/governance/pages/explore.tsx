import { Play } from 'lucide-react';
import { useState } from 'react';

import { useSql } from '@/governance/lib/use-sql';
import { Button, Card, DataTable, Footnote, ReportShell } from '@/governance/ui';

const EXAMPLE = `select current_user() as USER_NAME, current_role() as ROLE, current_warehouse() as WAREHOUSE`;

/** Scratchpad for trying a query before building a page around it. */
export function Explore() {
  const [draft, setDraft] = useState(EXAMPLE);
  const [running, setRunning] = useState<string | null>(EXAMPLE);
  const result = useSql(running);

  return (
    <ReportShell title="Explore data" description="Run a read-only query and see what comes back.">
      <Card.Root className="mb-4">
        <Card.Content className="pt-4">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) setRunning(draft);
            }}
            spellCheck={false}
            rows={6}
            className="w-full resize-y rounded-md border border-input bg-transparent p-3 font-mono text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <div className="mt-3 flex items-center gap-3">
            <Button
              onClick={() => setRunning(draft)}
              loading={result.status === 'updating' || result.status === 'initial'}
            >
              <Play className="size-4" />
              Run
            </Button>
            <Footnote>Ctrl+Enter runs. Reads only — anything that writes is rejected.</Footnote>
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root status={result.status} error={result.error}>
        <DataTable result={result} />
      </Card.Root>
    </ReportShell>
  );
}
