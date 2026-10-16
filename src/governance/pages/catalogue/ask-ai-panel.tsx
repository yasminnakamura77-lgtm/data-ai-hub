import { Bot, Send, User } from 'lucide-react';
import { useState } from 'react';

import { Badge, Button, Footnote, Modal, Spinner } from '@/governance/ui';
import type { SourceSummary } from './types';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  connected?: boolean;
}

/**
 * Talks to POST /api/catalogue/sources/:id/ask-ai, which either forwards to
 * AI_ASSISTANT_URL (the data team's assistant, a separate prototype) or
 * returns a placeholder answer if that isn't configured yet. Either way this
 * panel doesn't change — it's the wiring point for that other prototype.
 */
export function AskAiPanel({
  source,
  open,
  onClose,
}: {
  source: SourceSummary;
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    const question = draft.trim();
    if (!question || sending) return;
    setDraft('');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setSending(true);
    try {
      const response = await fetch(`/api/catalogue/sources/${source.id}/ask-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail ?? `Request failed (${response.status})`);
      setMessages((prev) => [...prev, { role: 'assistant', text: body.answer, connected: body.connected }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: error instanceof Error ? error.message : 'Something went wrong.' },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="drawer"
      title={`Ask AI — ${source.code}`}
      description="Questions here go through the data team's AI assistant."
    >
      <div className="flex h-full flex-col gap-3">
        {messages.length === 0 && (
          <Footnote>
            Try "What does this source contain?" or "Who do I ask for access?" — this is wired to a placeholder
            answer until the assistant prototype is connected.
          </Footnote>
        )}

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {messages.map((message, i) => (
            <div key={i} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  message.role === 'user'
                    ? 'max-w-[85%] rounded-lg bg-brand-600 px-3 py-2 text-sm text-white'
                    : 'max-w-[85%] rounded-lg bg-surface-muted px-3 py-2 text-sm'
                }
              >
                <div className="mb-1 flex items-center gap-1.5 text-xs opacity-70">
                  {message.role === 'user' ? <User className="size-3" /> : <Bot className="size-3" />}
                  {message.role === 'user' ? 'You' : 'AI assistant'}
                  {message.connected === false && (
                    <Badge variant="warning" className="ml-1">
                      demo answer
                    </Badge>
                  )}
                </div>
                {message.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner className="size-3.5" /> Thinking…
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Ask about this source…"
            className="w-full resize-none rounded-md border border-input bg-transparent p-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <Button size="icon" aria-label="Send" onClick={send} loading={sending}>
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
