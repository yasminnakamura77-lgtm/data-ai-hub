import { Badge, Modal, Muted } from '@/governance/ui';
import type { GlossaryTerm } from './types';

export function GlossaryModal({ open, onClose, terms }: { open: boolean; onClose: () => void; terms: GlossaryTerm[] }) {
  return (
    <Modal open={open} onClose={onClose} title="Glossary" description="Business terms linked to this source">
      {terms.length === 0 ? (
        <Muted className="text-sm">No glossary terms linked yet.</Muted>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {terms.map((term) => (
            <div key={term.id} className="py-3 first:pt-0 last:pb-0">
              <div className="font-medium">{term.name}</div>
              <p className="mt-0.5 text-sm text-muted-foreground">{term.definition}</p>
              {term.usedBy.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">Also used by:</span>
                  {term.usedBy.map((u) => (
                    <Badge key={u} variant="outline">
                      {u}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
