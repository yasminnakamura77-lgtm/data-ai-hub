import { Bot, LifeBuoy } from 'lucide-react';

import { Button, Card } from '@/governance/ui';

/**
 * The team behind this source used to be easy to spot in the ownership
 * card. Now that ownership moved to the bottom, this is the stand-in —
 * deliberately louder than a plain button row.
 */
export function ContactCard({ onAskAi, onReportIssue }: { onAskAi: () => void; onReportIssue: () => void }) {
  return (
    <Card.Root className="mb-4 overflow-hidden border-brand-red/25 bg-gradient-to-br from-brand-50 to-surface dark:from-brand-700/15">
      <Card.Content className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
            <LifeBuoy className="size-5" />
          </span>
          <div>
            <p className="font-medium">Need something from the data team?</p>
            <p className="text-sm text-muted-foreground">
              Ask the AI assistant for a quick answer, or reach the people behind this source directly.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onAskAi}>
            <Bot className="size-4" />
            Ask AI
          </Button>
          <Button onClick={onReportIssue}>
            <LifeBuoy className="size-4" />
            Report issue
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  );
}
