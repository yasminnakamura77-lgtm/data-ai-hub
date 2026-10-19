import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type * as React from 'react';

import { cn } from '@/governance/lib/utils';

const SELECT_CSS = `
.hub-select-content{z-index:200;background:#fff;color:#1e293b;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 14px 40px rgba(15,23,42,.22);overflow:hidden}
.hub-select-item{color:#1e293b;border-radius:6px}
.hub-select-item[data-highlighted]{background:#eaf1fb;color:#0f1f3d}
html.dark .hub-select-content,.dark .hub-select-content{background:#17233a;color:#e6edf8;border-color:#344560;box-shadow:0 14px 40px rgba(0,0,0,.55)}
.dark .hub-select-item{color:#e6edf8}
.dark .hub-select-item[data-highlighted]{background:#26385a;color:#fff}
`;

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
        'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium', className)} {...props} />;
}

/**
 * Dropdown built on Radix.
 *
 *   <Select value={region} onValueChange={setRegion} options={['North', 'South']} />
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  className,
}: {
  value?: string;
  onValueChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
  placeholder?: string;
  className?: string;
}) {
  const items = options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          'inline-flex h-9 min-w-40 cursor-pointer items-center justify-between gap-2 rounded-md border border-input',
          'bg-transparent px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="hub-select-content max-h-72 min-w-[var(--radix-select-trigger-width)]"
        >
          <style>{SELECT_CSS}</style>
          <SelectPrimitive.Viewport className="p-1">
            {items.map((item) => (
              <SelectPrimitive.Item
                key={item.value}
                value={item.value}
                className="hub-select-item relative flex cursor-pointer items-center py-1.5 pr-8 pl-2 text-sm outline-none select-none"
              >
                <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2">
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
