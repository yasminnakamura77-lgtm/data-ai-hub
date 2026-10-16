import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/governance/lib/utils';
import { Spinner } from './feedback';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'transition-colors not-disabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-brand-600 text-white not-disabled:hover:bg-brand-700',
        secondary: 'bg-surface-muted text-foreground not-disabled:hover:bg-border',
        outline: 'border border-border bg-transparent not-disabled:hover:bg-surface-muted',
        ghost: 'not-disabled:hover:bg-surface-muted',
        link: 'text-brand-600 underline-offset-4 not-disabled:hover:underline',
        destructive: 'bg-danger text-white not-disabled:hover:opacity-90',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {!asChild && loading ? (
        <>
          <Spinner className="size-4" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
