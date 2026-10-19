import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

import { Button, ErrorMessage, Footnote, Input, Label, Modal, Select } from '@/governance/ui';
import type { SourceSummary } from './types';

const REQUEST_KINDS = [
  { value: 'issue', label: 'Report an issue' },
  { value: 'access', label: 'Request access' },
  { value: 'question', label: 'Ask about this data' },
];

/**
 * Sends the report to the data team. Right now that means POSTing to a mock
 * backend endpoint that just logs it in memory — there is no real
 * email/ticketing integration behind this yet, on purpose (see catalogue.py).
 */
export function ReportIssueModal({
  source,
  open,
  onClose,
}: {
  source: SourceSummary;
  open: boolean;
  onClose: () => void;
}) {
  const [kind, setKind] = useState('issue');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function reset() {
    setKind('issue');
    setName('');
    setEmail('');
    setMessage('');
    setError(null);
    setSent(false);
  }

  async function submit() {
    if (!message.trim()) {
      setError('Add a short message for the data team.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/catalogue/sources/${source.id}/report-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          message,
          requester_name: name || null,
          requester_email: email || null,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail ?? `Request failed (${response.status})`);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        if (sent) reset();
      }}
      title={`Contact the data team — ${source.code}`}
      description="Requests go to the team that owns this source."
    >
      {sent ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="size-8 text-success" />
          <p className="font-medium">Sent to the data team</p>
          <Footnote>Prototype only — this is logged on the backend, not emailed yet.</Footnote>
          <Button className="mt-2" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>What do you need?</Label>
            <Select value={kind} onValueChange={setKind} options={REQUEST_KINDS} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Your name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Your email</Label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Message</Label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              placeholder="What do you need from the data team?"
              className="w-full min-h-24 resize-y rounded-md border border-input bg-transparent p-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>
          {error && <ErrorMessage message={error} />}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} loading={submitting}>
              Send
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
