import { Check } from 'lucide-react';

import { Badge, Card, Muted } from '@/governance/ui';
import type { SimilarSource, Similarity } from './types';

const EYEBROW = 'text-xs font-semibold tracking-wide text-muted-foreground uppercase';

const SIMILARITY_VARIANT: Record<Similarity, 'success' | 'secondary'> = {
  'High similarity': 'success',
  Related: 'secondary',
};

export function SimilarDataCard({ items }: { items: SimilarSource[] }) {
  return (
    <Card.Root className="mb-4">
      <Card.Header>
        <span className={EYEBROW}>Similar data</span>
        <Card.Subtitle>Similar or related data</Card.Subtitle>
      </Card.Header>
      <Card.Content>
        {items.length === 0 ? (
          <Muted className="text-sm">Nothing similar found yet.</Muted>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.name}
                className="rounded-md border border-border p-3 transition-colors hover:border-brand-500/40 hover:bg-surface-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant={SIMILARITY_VARIANT[item.similarity]}>{item.similarity}</Badge>
                </div>
                <ul className="mt-2 flex flex-col gap-1">
                  {item.sharedAttributes.map((attr) => (
                    <li key={attr} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-success" /> {attr}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card.Content>
    </Card.Root>
  );
}
