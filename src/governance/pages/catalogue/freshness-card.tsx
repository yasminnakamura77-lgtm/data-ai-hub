import { CheckCircle2, TriangleAlert } from 'lucide-react';
import type * as React from 'react';

import { Card } from '@/governance/ui';
import type { Freshness } from './types';

const EYEBROW = 'text-xs font-semibold tracking-wide text-muted-foreground uppercase';

function Field({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'success' | 'warning' }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 flex items-center gap-1 text-sm font-medium ${
          tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning-foreground' : ''
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function FreshnessCard({ freshness }: { freshness: Freshness }) {
  return (
    <Card.Root className="mb-4">
      <Card.Header>
        <span className={EYEBROW}>Freshness</span>
      </Card.Header>
      <Card.Content>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Last updated" value={freshness.lastUpdatedLabel} />
          <Field label="Expected" value={freshness.expected} />
          <Field
            label="Status"
            tone={freshness.onTime ? 'success' : 'warning'}
            value={
              freshness.onTime ? (
                <>
                  <CheckCircle2 className="size-3.5" /> On time
                </>
              ) : (
                <>
                  <TriangleAlert className="size-3.5" /> Delayed
                </>
              )
            }
          />
          <Field label="Next refresh" value={freshness.nextRefreshLabel} />
        </div>
      </Card.Content>
    </Card.Root>
  );
}
