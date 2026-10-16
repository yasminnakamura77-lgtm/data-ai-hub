import { Bot } from 'lucide-react';

import { Badge, Modal, Muted } from '@/governance/ui';
import type { AiApplication } from './types';

export function AiApplicationsModal({
  open,
  onClose,
  apps,
}: {
  open: boolean;
  onClose: () => void;
  apps: AiApplication[];
}) {
  return (
    <Modal open={open} onClose={onClose} title="AI Applications" description="AI apps built on this source">
      {apps.length === 0 ? (
        <Muted className="text-sm">No AI applications use this source yet.</Muted>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {apps.map((app) => (
            <div key={app.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Bot className="size-4 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{app.name}</span>
              <Badge variant="secondary">{app.stage}</Badge>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
