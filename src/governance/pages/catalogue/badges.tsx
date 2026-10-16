import { cn } from '@/governance/lib/utils';
import { Badge } from '@/governance/ui';
import type { Classification, Environment, Readiness, SourceStatus } from './types';

const STATUS_DOT: Record<string, string> = {
  active: 'bg-success',
  ready: 'bg-success',
  compliant: 'bg-success',
  healthy: 'bg-success',
  inactive: 'bg-muted-foreground',
  paused: 'bg-muted-foreground',
  pending: 'bg-warning',
  degraded: 'bg-warning',
  'in review': 'bg-warning',
  blocked: 'bg-destructive',
};

/** Small colored dot + label, e.g. "● Active". Matches any status-ish string. Pulses gently when the status is a "good" one — a small sign the page isn't frozen. */
export function StatusDot({ label, className }: { label: string; className?: string }) {
  const dot = STATUS_DOT[label.toLowerCase()] ?? 'bg-muted-foreground';
  const isLive = dot === 'bg-success';
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <span className="relative inline-flex size-2">
        {isLive && <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', dot)} aria-hidden />}
        <span className={cn('relative inline-flex size-2 rounded-full', dot)} aria-hidden />
      </span>
      {label}
    </span>
  );
}

const CLASSIFICATION_VARIANT: Record<Classification, 'success' | 'secondary' | 'warning' | 'danger'> = {
  Public: 'success',
  Internal: 'secondary',
  Confidential: 'warning',
  Restricted: 'danger',
};

export function ClassificationBadge({ classification }: { classification: Classification }) {
  return <Badge variant={CLASSIFICATION_VARIANT[classification]}>{classification}</Badge>;
}

export function statusLabel(status: SourceStatus) {
  return status === 'active' ? 'Active' : 'Inactive';
}

export function environmentLabel(environment: Environment) {
  return environment[0].toUpperCase() + environment.slice(1);
}

export function readinessLabel(readiness: Readiness) {
  return readiness[0].toUpperCase() + readiness.slice(1);
}

/** Small lowercase pill for freeform tags, e.g. "production", "critical". */
export function TagPill({ tag }: { tag: string }) {
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      {tag}
    </Badge>
  );
}
