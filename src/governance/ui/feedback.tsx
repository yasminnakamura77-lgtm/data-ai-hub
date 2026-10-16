import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type * as React from 'react';

import type { AsyncStatus } from '@/governance/lib/use-sql';
import { cn } from '@/governance/lib/utils';

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2>) {
  return <Loader2 role="status" aria-label="Loading" className={cn('size-4 animate-spin', className)} {...props} />;
}

/** Small spinner for a card corner: visible only while a loaded card refetches. */
export function StatusSpinner({ status }: { status: AsyncStatus }) {
  if (status !== 'updating') return null;
  return <Spinner className="size-3.5 text-muted-foreground" />;
}

export function ErrorMessage({
  message = "Couldn't load this.",
  detail,
  className,
}: {
  message?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-2 text-sm text-destructive', className)}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <div className="font-medium">{message}</div>
        {detail && <div className="mt-0.5 text-xs break-words opacity-80">{detail}</div>}
      </div>
    </div>
  );
}

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-brand-100 text-brand-700',
        secondary: 'bg-surface-muted text-muted-foreground',
        outline: 'border border-border',
        success: 'bg-success/15 text-success',
        warning: 'bg-warning/20 text-warning-foreground',
        danger: 'bg-danger/15 text-danger',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-1 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6">
          {icon}
        </div>
      )}
      <div className="text-sm font-semibold">{title}</div>
      {description && <div className="max-w-sm text-sm text-muted-foreground">{description}</div>}
      {action && <div className="mt-3 flex items-center gap-2">{action}</div>}
    </div>
  );
}
