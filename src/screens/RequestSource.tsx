import { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

import { Button, Card, H1, Input, Label, Text, Textarea } from '@pilgrims/ui';

import { submitDataSourceRequest } from '../api';
import type { Navigate } from '../App';
import { AREAS, type Area } from '../mock';

type Status = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';

export function RequestSource({ navigate }: { navigate: Navigate }) {
  const [source, setSource] = useState('');
  const [area, setArea] = useState<Area>('Shared');
  const [content, setContent] = useState('');
  const [justification, setJustification] = useState('');
  const [targetQuarter, setTargetQuarter] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [dupId, setDupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      const res = await submitDataSourceRequest({
        source,
        area,
        content,
        justification,
        targetQuarter,
        requestedBy,
      });
      if (res.ok) {
        setStatus('success');
        return;
      }
      if (res.duplicate) {
        setStatus('duplicate');
        setDupId(`di-${res.id}`);
        return;
      }
      setStatus('error');
      setError(res.error);
    } catch (e) {
      setStatus('error');
      setError(String(e));
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <H1 className="text-2xl">Request submitted</H1>
        <Text className="max-w-md text-sm text-muted-foreground">
          The data team will review &ldquo;{source}&rdquo; and follow up. It now shows up on
          their Requested board.
        </Text>
        <Button onClick={() => navigate({ name: 'browse', kind: 'sources' })}>Back to Data sources</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          onClick={() => navigate({ name: 'browse', kind: 'sources' })}
          className="flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Data sources
        </button>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Request a data source</span>
      </div>

      <div>
        <H1 className="text-2xl">Request a data source</H1>
        <Text className="mt-1 text-sm text-muted-foreground">
          Can&apos;t find what you need? Tell us what it is and why — the data team reviews
          every request.
        </Text>
      </div>

      <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5">
        <Card.Root>
          <Card.Content className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rs-source">Source name</Label>
              <Input
                id="rs-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Regional Promo Tracker"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Business area</Label>
              <div className="flex flex-wrap gap-2">
                {AREAS.map((a) => (
                  <Button
                    key={a}
                    type="button"
                    size="sm"
                    variant={a === area ? 'default' : 'outline'}
                    onClick={() => setArea(a)}
                  >
                    {a}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rs-content">What is it?</Label>
              <Textarea
                id="rs-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What does this data cover, and where does it come from?"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rs-justification">Why do you need it?</Label>
              <Textarea
                id="rs-justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="What decision or work does this unblock?"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rs-quarter">Needed by (optional)</Label>
                <Input
                  id="rs-quarter"
                  value={targetQuarter}
                  onChange={(e) => setTargetQuarter(e.target.value)}
                  placeholder="e.g. 2026-Q4"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rs-by">Your name</Label>
                <Input
                  id="rs-by"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  placeholder="e.g. Jane Smith"
                />
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        {status === 'duplicate' && (
          <Text className="text-sm text-destructive">
            This already exists in the catalogue —{' '}
            <button
              type="button"
              className="underline"
              onClick={() => dupId && navigate({ name: 'asset', id: dupId })}
            >
              view it
            </button>
            .
          </Text>
        )}
        {status === 'error' && <Text className="text-sm text-destructive">{error}</Text>}

        <div>
          <Button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Submitting…' : 'Submit request'}
          </Button>
        </div>
      </form>
    </div>
  );
}
