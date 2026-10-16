import type * as React from 'react';

import { cn } from '@/governance/lib/utils';

export function H1({ className, ...props }: React.ComponentProps<'h1'>) {
  return <h1 className={cn('text-3xl font-bold tracking-tight', className)} {...props} />;
}

export function H2({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={cn('text-2xl font-semibold tracking-tight', className)} {...props} />;
}

export function H3({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-base font-semibold tracking-tight', className)} {...props} />;
}

export function Text({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm', className)} {...props} />;
}

export function Muted({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function Footnote({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props} />;
}
