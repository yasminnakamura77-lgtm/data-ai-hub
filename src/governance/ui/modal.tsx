import { X } from 'lucide-react';
import type * as React from 'react';
import { useEffect } from 'react';

import { cn } from '@/governance/lib/utils';
import { Button } from './button';
import { H3 } from './typography';

/**
 * Centered dialog or right-side drawer. Plain div overlay — the kit has no
 * @radix-ui/react-dialog yet, and one popup component isn't worth adding it.
 *
 *   <Modal open={open} onClose={() => setOpen(false)} title="Report an issue">
 *     ...
 *   </Modal>
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  variant = 'dialog',
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  variant?: 'dialog' | 'drawer';
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className={cn(
          'relative flex flex-col bg-surface shadow-lg',
          variant === 'drawer'
            ? 'ml-auto h-full w-full max-w-md border-l border-border'
            : 'm-auto max-h-[85vh] w-full max-w-lg rounded-lg border border-border',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="flex flex-col gap-1">
            <H3>{title}</H3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
