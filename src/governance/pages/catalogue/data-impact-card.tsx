import { AlertOctagon, Bot, GitBranch, LayoutDashboard, TriangleAlert } from 'lucide-react';
import type * as React from 'react';

import { Badge, Card, Muted } from '@/governance/ui';
import type { ImpactItem, ImpactSeverity, ImpactType } from './types';

const TYPE_ICON: Record<ImpactType, React.ReactNode> = {
  dashboard: <LayoutDashboard className="size-4" />,
  pipeline: <GitBranch className="size-4" />,
  'ai-asset': <Bot className="size-4" />,
  source: <GitBranch className="size-4" />,
};

const SEVERITY_VARIANT: Record<ImpactSeverity, 'danger' | 'warning' | 'secondary'> = {
  high: 'danger',
  medium: 'warning',
  low: 'secondary',
};

/**
 * "If this source changes, what breaks?" — every source connects to other
 * tools, pipelines and even other sources downstream; this makes that blast
 * radius visible before someone ships a schema change.
 */
export function DataImpactCard({ impact }: { impact: ImpactItem[] }) {
  const highCount = impact.filter((i) => i.severity === 'high').length;

  return (
    <Card.Root className="mb-4">
      <Card.Header>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Data impact</span>
          {highCount > 0 && (
            <Badge variant="danger" className="flex items-center gap-1">
              <AlertOctagon className="size-3" />
              {highCount} high-impact
            </Badge>
          )}
        </div>
        <Card.Subtitle>What depends on this source, and how badly a breaking change would hurt</Card.Subtitle>
      </Card.Header>
      <Card.Content>
        {impact.length === 0 ? (
          <Muted className="text-sm">Nothing downstream is connected to this source yet.</Muted>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {impact.map((item) => (
              <div key={item.name} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-0.5 text-muted-foreground">{TYPE_ICON[item.type]}</span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <Badge variant={SEVERITY_VARIANT[item.severity]} className="capitalize">
                      {item.severity === 'high' && <TriangleAlert className="size-3" />}
                      {item.severity} impact
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card.Content>
    </Card.Root>
  );
}
