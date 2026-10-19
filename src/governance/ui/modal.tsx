import { X } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/governance/lib/utils';
import { Button } from './button';
import { H3 } from './typography';

const DURATION = 200;

const MODAL_CSS = `
[data-radix-popper-content-wrapper]{z-index:100 !important}
.hub-modal-panel{min-width:0}
.hub-modal-backdrop{background:rgba(15,23,42,.45);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.hub-modal-panel{background:#fff;color:#1e293b;border:1px solid #dbe3ee;box-shadow:0 24px 70px rgba(15,23,42,.28)}
.hub-modal-panel h3{color:#0f1f3d}
.hub-modal-panel p,.hub-modal-panel .text-muted-foreground{color:#64748b}
.hub-modal-panel>div:first-child{border-bottom:1px solid #e3e8ef}
.hub-modal-panel label{color:#1e293b;font-weight:500}
.hub-modal-panel input,.hub-modal-panel textarea,.hub-modal-panel select,.hub-modal-panel [role=combobox]{background:#fff;color:#1e293b;border:1px solid #cbd5e1;border-radius:8px;box-shadow:none;outline:none}
.hub-modal-panel input::placeholder,.hub-modal-panel textarea::placeholder{color:#94a3b8}
.hub-modal-panel input:focus,.hub-modal-panel textarea:focus,.hub-modal-panel [role=combobox]:focus{border-color:#2f80ed;box-shadow:0 0 0 3px rgba(47,128,237,.2)}
.hub-modal-panel button[class*="bg-transparent"]{background:#fff;color:#1e293b;border:1px solid #cbd5e1}
.hub-modal-panel button[class*="bg-transparent"]:hover{background:#f1f5f9}
.hub-modal-panel button[class*="bg-brand-600"]{background:#1f5fae;color:#fff}
.hub-modal-panel button[class*="bg-brand-600"]:hover{background:#184d90}
.hub-modal-panel button[class*="bg-surface-muted"]{background:#eef2f7;color:#1e293b}
html.dark .hub-modal-backdrop,.dark .hub-modal-backdrop{background:rgba(0,0,0,.62)}
html.dark .hub-modal-panel,.dark .hub-modal-panel{background:#131d30;color:#e6edf8;border-color:#2a3a54;box-shadow:0 24px 70px rgba(0,0,0,.6)}
.dark .hub-modal-panel h3{color:#f1f5fb}
.dark .hub-modal-panel p,.dark .hub-modal-panel .text-muted-foreground{color:#9aaac0}
.dark .hub-modal-panel>div:first-child{border-bottom-color:#263349}
.dark .hub-modal-panel label{color:#e6edf8}
.dark .hub-modal-panel input,.dark .hub-modal-panel textarea,.dark .hub-modal-panel select,.dark .hub-modal-panel [role=combobox]{background:#0c1524;color:#e6edf8;border-color:#344560}
.dark .hub-modal-panel input::placeholder,.dark .hub-modal-panel textarea::placeholder{color:#6b7c93}
.dark .hub-modal-panel input:focus,.dark .hub-modal-panel textarea:focus,.dark .hub-modal-panel [role=combobox]:focus{border-color:#5aa0f5;box-shadow:0 0 0 3px rgba(90,160,245,.25)}
.dark .hub-modal-panel button[class*="bg-transparent"]{background:#1a2740;color:#e6edf8;border-color:#344560}
.dark .hub-modal-panel button[class*="bg-transparent"]:hover{background:#22324f}
.dark .hub-modal-panel button[class*="bg-brand-600"]{background:#3b82d6;color:#fff}
.dark .hub-modal-panel button[class*="bg-brand-600"]:hover{background:#4f93e6}
.dark .hub-modal-panel button[class*="bg-surface-muted"]{background:#22324f;color:#e6edf8}
`;


/**
 * Centered dialog or right-side drawer. Plain div overlay.
 * Fades/slides in and dissolves out (stays mounted for DURATION ms on close).
 * Panel uses the opaque `bg-surface` token (defined in src/index.css for the
 * Hub, light + dark), so it is never see-through.
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
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const t = window.setTimeout(() => setShown(true), 16);
      return () => window.clearTimeout(t);
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), DURATION);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Lock page scroll behind the popup so nothing shifts or scrolls underneath.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  if (!mounted) return null;

  // Rendered in <body> so no ancestor (transform/animation/filter) can offset or clip it.
  return createPortal(
    <div
      className={cn('fixed inset-0 z-50 flex', variant === 'dialog' && 'items-center justify-center p-3 sm:p-6')}
      role="dialog" aria-modal="true" aria-label={title}>
      <style>{MODAL_CSS}</style>
      <div
        className={cn(
          'hub-modal-backdrop absolute inset-0 transition-opacity ease-out motion-reduce:transition-none',
          shown ? 'opacity-100' : 'opacity-0'
        )}
        style={{ transitionDuration: `${DURATION}ms` }}
        onClick={onClose}
      />
      <div
        style={{ transitionDuration: `${DURATION}ms` }}
        className={cn(
          'hub-modal-panel relative flex flex-col transition-all ease-out motion-reduce:transition-none',
          variant === 'drawer'
            ? 'ml-auto h-full w-full max-w-md'
            : 'max-h-[calc(100dvh-1.5rem)] w-full max-w-lg rounded-xl sm:max-h-[calc(100dvh-3rem)]',
          shown
            ? 'translate-x-0 translate-y-0 scale-100 opacity-100'
            : variant === 'drawer'
              ? 'translate-x-6 opacity-0'
              : 'translate-y-2 scale-[0.98] opacity-0',
          className
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-4">
          <div className="flex flex-col gap-1">
            <H3>{title}</H3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
