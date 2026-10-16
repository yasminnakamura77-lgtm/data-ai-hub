import { Badge } from '@pilgrims/ui';

import { type Area, type Lifecycle, LIFECYCLE_LABEL, type Readiness } from './mock';

/** Governed/certified/draft lifecycle badge — the trust signal. */
export function LifecycleBadge({ lifecycle }: { lifecycle: Lifecycle }) {
  const variant =
    lifecycle === 'governed-in-dbt' ? 'success' : lifecycle === 'hub-certified' ? 'info' : 'warning-soft';
  return <Badge variant={variant}>{LIFECYCLE_LABEL[lifecycle]}</Badge>;
}

export function AreaChip({ area }: { area: Area }) {
  return <Badge variant="outline">{area}</Badge>;
}

const STAGE_LABEL = ['Raw', 'Modeled', 'Semantic'] as const;

/** Three-segment readiness ramp (Raw → Modeled → Semantic). */
export function ReadinessBar({ r, className }: { r: Readiness; className?: string }) {
  const stages = [r.raw, r.modeled, r.semantic];
  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      {stages.map((v, i) => (
        <span
          key={i}
          title={`${STAGE_LABEL[i]}: ${v >= 1 ? 'complete' : v > 0 ? 'partial' : 'not started'}`}
          className={`h-1.5 w-6 rounded-full ${v >= 1 ? 'bg-success' : v > 0 ? 'bg-warning' : 'bg-muted'}`}
        />
      ))}
    </div>
  );
}

/** Labeled readiness ramp for detail pages. */
export function ReadinessDetail({ r }: { r: Readiness }) {
  const stages: Array<[string, number]> = [
    ['Raw in Snowflake', r.raw],
    ['Data Modeled', r.modeled],
    ['Semantic Layer', r.semantic],
  ];
  return (
    <div className="flex flex-col gap-2">
      {stages.map(([label, v]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-36 text-sm text-muted-foreground">{label}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={`block h-full rounded-full ${v >= 1 ? 'bg-success' : v > 0 ? 'bg-warning' : 'bg-transparent'}`}
              style={{ width: `${Math.max(v * 100, v > 0 ? 12 : 0)}%` }}
            />
          </span>
          <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
            {v >= 1 ? 'Complete' : v > 0 ? 'Partial' : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function readinessPct(r: Readiness) {
  return Math.round(((r.raw + r.modeled + r.semantic) / 3) * 100);
}

const RING_STAGE_LABEL = ['Raw in Snowflake', 'Data Modeled', 'Semantic Layer'] as const;
const RING_DIMS = {
  sm: { box: 26, stroke: 3, font: 0 },
  md: { box: 44, stroke: 4, font: 10 },
  lg: { box: 72, stroke: 6, font: 15 },
} as const;

/**
 * Segmented trust ring — the app's signature device. Same three readiness
 * stages as ReadinessBar/ReadinessDetail, drawn as a ring instead of a bar so
 * it reads at a glance and scales from a list-row dot up to a hero number.
 * Kept separate from ReadinessBar (still used inside Lineage.tsx's compact
 * pill nodes, where there isn't room for a ring).
 */
export function ReadinessRing({
  r,
  size = 'md',
  showLabel = false,
  className,
}: {
  r: Readiness;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}) {
  const { box, stroke, font } = RING_DIMS[size];
  const cx = box / 2;
  const cy = box / 2;
  const radius = box / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  const gapDeg = 10;
  const dashLen = circumference * ((120 - gapDeg) / 360);
  const stages = [r.raw, r.modeled, r.semantic];
  const colorFor = (v: number) => (v >= 1 ? 'var(--success)' : v > 0 ? 'var(--warning)' : 'var(--border)');
  const pct = readinessPct(r);

  return (
    <div
      role="img"
      aria-label={stages.map((v, i) => `${RING_STAGE_LABEL[i]}: ${v >= 1 ? 'complete' : v > 0 ? 'partial' : 'not started'}`).join(', ')}
      className={`relative inline-flex shrink-0 items-center justify-center ${className ?? ''}`}
      style={{ width: box, height: box }}
    >
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        {stages.map((v, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={colorFor(v)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            transform={`rotate(${i * 120 + gapDeg / 2 - 90}, ${cx}, ${cy})`}
          />
        ))}
      </svg>
      {showLabel && font > 0 && (
        <span className="absolute font-semibold tabular-nums text-foreground" style={{ fontSize: font }}>
          {pct}%
        </span>
      )}
    </div>
  );
}
