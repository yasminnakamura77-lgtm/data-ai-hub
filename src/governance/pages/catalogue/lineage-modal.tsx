import { ArrowRight, Database } from 'lucide-react';

import { Badge, Modal, Muted } from '@/governance/ui';
import type { ImpactItem, ImpactSeverity } from './types';

const SEVERITY_VARIANT: Record<ImpactSeverity, 'danger' | 'warning' | 'secondary'> = {
  high: 'danger',
  medium: 'warning',
  low: 'secondary',
};

export function LineageModal({
  open,
  onClose,
  sourceCode,
  upstream,
  downstream,
}: {
  open: boolean;
  onClose: () => void;
  sourceCode: string;
  upstream: string[];
  downstream: ImpactItem[];
}) {
  return (
    <Modal open={open} onClose={onClose} title="Lineage" description={`What feeds ${sourceCode}, and what it feeds`}>
      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Upstream <ArrowRight className="size-3" /> {sourceCode}
          </div>
          {upstream.length === 0 ? (
            <Muted className="text-sm">No upstream sources recorded.</Muted>
          ) : (
            <div className="flex flex-col gap-1.5">
              {upstream.map((name) => (
                <div key={name} className="flex items-center gap-2 text-sm">
                  <Database className="size-3.5 text-muted-foreground" />
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {sourceCode} <ArrowRight className="size-3" /> Downstream
          </div>
          {downstream.length === 0 ? (
            <Muted className="text-sm">Nothing downstream yet.</Muted>
          ) : (
            <div className="flex flex-col gap-2">
              {downstream.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-2 text-sm">
                  <span>{item.name}</span>
                  <Badge variant={SEVERITY_VARIANT[item.severity]}>{item.severity}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
