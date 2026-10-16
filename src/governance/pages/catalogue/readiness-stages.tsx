import { useEffect, useState } from 'react';

import { cn } from '@/governance/lib/utils';
import type { ReadinessStages } from './types';

const STAGE_LABEL: [keyof ReadinessStages, string][] = [
  ['raw', 'Raw'],
  ['modeled', 'Modeled'],
  ['semantic', 'Semantic'],
];

/** Three-stage pipeline maturity: Raw in Snowflake → Data Modeled → Semantic Layer. Bars fill in on mount instead of just appearing. */
export function ReadinessStagesDetail({ r }: { r: ReadinessStages }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    setFilled(false);
    const t = setTimeout(() => setFilled(true), 50);
    return () => clearTimeout(t);
  }, [r]);

  return (
    <div className="flex flex-col gap-2">
      {STAGE_LABEL.map(([key, label]) => {
        const v = r[key];
        const width = filled ? `${Math.max(v * 100, v > 0 ? 12 : 0)}%` : '0%';
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-16 text-sm text-muted-foreground">{label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  'block h-full rounded-full transition-[width] duration-700 ease-out',
                  v >= 1 ? 'bg-success' : v > 0 ? 'bg-warning' : ''
                )}
                style={{ width }}
              />
            </span>
            <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
              {v >= 1 ? 'Complete' : v > 0 ? 'Partial' : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
