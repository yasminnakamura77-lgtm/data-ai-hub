import type * as React from 'react';
import { createContext, useContext } from 'react';

import type { AsyncStatus } from '@/governance/lib/use-sql';
import { cn } from '@/governance/lib/utils';
import { ErrorMessage, Skeleton, StatusSpinner } from './feedback';
import { H3, Muted } from './typography';

/*
 * Pass a useSql() result's `status` and `error` to Card.Root / KpiCard.Root /
 * ChartCard.Root and the pieces inside draw their own loading and error states.
 *
 *   <ChartCard.Root status={sales.status} error={sales.error}>
 */
const CardContext = createContext<{ status: AsyncStatus; error?: unknown }>({ status: 'ready' });

export function useCardStatus() {
  return useContext(CardContext);
}

function CardRoot({
  className,
  status = 'ready',
  error,
  ...props
}: React.ComponentProps<'div'> & { status?: AsyncStatus; error?: unknown }) {
  return (
    <CardContext.Provider value={{ status, error }}>
      <div
        className={cn(
          'rounded-lg border border-border bg-surface text-foreground shadow-sm',
          status === 'error' && 'border-destructive/30 bg-destructive/5',
          className
        )}
        {...props}
      />
    </CardContext.Provider>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />;
}

function CardTitle(props: React.ComponentProps<typeof H3>) {
  return <H3 {...props} />;
}

function CardSubtitle(props: React.ComponentProps<typeof Muted>) {
  return <Muted {...props} />;
}

function CardIcon({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary [&_svg]:size-4',
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-4 pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center p-4 pt-0', className)} {...props} />;
}

export const Card = {
  Root: CardRoot,
  Header: CardHeader,
  Title: CardTitle,
  Subtitle: CardSubtitle,
  Icon: CardIcon,
  Content: CardContent,
  Footer: CardFooter,
} as const;

/* --- KPI tile ------------------------------------------------------------ */

function KpiRoot({ className, ...props }: React.ComponentProps<typeof CardRoot>) {
  return <CardRoot className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />;
}

function KpiHeader({ className, icon, children, ...props }: React.ComponentProps<'div'> & { icon?: React.ReactNode }) {
  const { status } = useCardStatus();
  return (
    <div className={cn('flex items-center justify-between gap-2', className)} {...props}>
      {children}
      <div className="flex items-center gap-2">
        <StatusSpinner status={status} />
        {icon && <CardIcon>{icon}</CardIcon>}
      </div>
    </div>
  );
}

function KpiLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-xs font-medium tracking-wide text-muted-foreground uppercase', className)} {...props} />;
}

function KpiValue({ className, ...props }: React.ComponentProps<'div'>) {
  const { status, error } = useCardStatus();
  if (status === 'initial') return <Skeleton className={cn('h-8 w-24', className)} />;
  if (status === 'error') {
    return <ErrorMessage message="No value" detail={error instanceof Error ? error.message : undefined} />;
  }
  return <div className={cn('text-2xl font-bold tracking-tight tabular-nums', className)} {...props} />;
}

function KpiDelta({
  className,
  sentiment = 'neutral',
  ...props
}: React.ComponentProps<'div'> & { sentiment?: 'good' | 'bad' | 'neutral' }) {
  const { status } = useCardStatus();
  if (status === 'initial') return <Skeleton className={cn('h-4 w-32', className)} />;
  if (status === 'error') return null;
  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs font-medium tabular-nums',
        sentiment === 'good' && 'text-success',
        sentiment === 'bad' && 'text-destructive',
        sentiment === 'neutral' && 'text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export const KpiCard = {
  Root: KpiRoot,
  Header: KpiHeader,
  Label: KpiLabel,
  Value: KpiValue,
  Delta: KpiDelta,
} as const;

/* --- Chart panel --------------------------------------------------------- */

function ChartRoot({ className, ...props }: React.ComponentProps<typeof CardRoot>) {
  return <CardRoot className={cn('flex flex-col gap-3', className)} {...props} />;
}

function ChartHeader({ className, action, children, ...props }: React.ComponentProps<'div'> & { action?: React.ReactNode }) {
  const { status } = useCardStatus();
  return (
    <CardHeader className={cn('flex-row items-start justify-between gap-2', className)} {...props}>
      <div className="flex flex-col gap-1">{children}</div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusSpinner status={status} />
        {action}
      </div>
    </CardHeader>
  );
}

function ChartContent({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { status, error } = useCardStatus();
  return (
    <CardContent className={cn('min-h-[240px]', className)} {...props}>
      {status === 'initial' ? (
        <Skeleton className="h-full min-h-[240px] w-full" />
      ) : status === 'error' ? (
        <div className="flex h-full min-h-[240px] items-center justify-center">
          <ErrorMessage
            message="Couldn't load this chart."
            detail={error instanceof Error ? error.message : undefined}
          />
        </div>
      ) : (
        children
      )}
    </CardContent>
  );
}

function ChartFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <CardFooter className={cn('justify-between gap-2 border-t pt-3 text-xs text-muted-foreground', className)} {...props} />;
}

export const ChartCard = {
  Root: ChartRoot,
  Header: ChartHeader,
  Title: CardTitle,
  Subtitle: CardSubtitle,
  Content: ChartContent,
  Footer: ChartFooter,
} as const;
