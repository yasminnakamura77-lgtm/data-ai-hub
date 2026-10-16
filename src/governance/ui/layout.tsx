import { Moon, Sun } from 'lucide-react';
import type * as React from 'react';
import { type ReactNode, useEffect, useState } from 'react';

import { cn } from '@/governance/lib/utils';
import { Button } from './button';
import { H2, Text } from './typography';

/** Sticky header with the Pilgrim's navy/red rail. */
export function AppHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div aria-hidden className="h-0.5 w-full bg-brand-navy">
        <div className="h-full w-16 bg-brand-red" />
      </div>
      <div className="flex h-14 w-full items-center gap-3 px-4 sm:px-6">
        <span className="font-semibold tracking-tight">{title}</span>
        <nav className="ml-auto flex items-center gap-1">
          {children}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

/** Short nav bar under the header. */
export function AppNav({ children }: { children: ReactNode }) {
  return (
    <div className="border-b bg-surface-muted/50">
      <div className="mx-auto flex h-10 w-full max-w-7xl items-center gap-1 px-4 sm:px-6">{children}</div>
    </div>
  );
}

export function AppNavLink({
  active,
  className,
  ...props
}: React.ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button
      className={cn(
        'h-full cursor-pointer border-b-2 px-3 text-sm font-medium transition-colors',
        active
          ? 'border-brand-red text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
        className
      )}
      {...props}
    />
  );
}

/** Page frame: centered column, heading, optional toolbar. */
export function ReportShell({
  title,
  description,
  toolbar,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn('mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6', className)}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <H2>{title}</H2>
          {description && <Text className="text-muted-foreground">{description}</Text>}
        </div>
        {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
      </div>
      {children}
    </main>
  );
}

/** Responsive grid for KPI tiles and chart cards. */
export function ReportGrid({
  children,
  columns = 3,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns];
  return <div className={cn('grid grid-cols-1 gap-4', cols, className)}>{children}</div>;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setDark((d) => !d)}>
      {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
}
