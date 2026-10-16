import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

import { Button, Card, H1, Input, Label, Text, Textarea } from '@pilgrims/ui';

import { createMetric, fetchMetric, updateMetric, type MetricPayload } from '../api';
import type { Navigate } from '../App';
import { AREAS, type Area } from '../mock';

type Status = 'idle' | 'loading' | 'submitting' | 'error';

const EMPTY = {
  name: '',
  area: 'Shared' as Area,
  definition: '',
  calculation: '',
  owner: '',
  sme: '',
  unit: '',
  sourcesText: '',
};

export function MetricForm({
  mode,
  metricId,
  navigate,
}: {
  mode: 'create' | 'edit';
  metricId?: string;
  navigate: Navigate;
}) {
  const [fields, setFields] = useState(EMPTY);
  const [lifecycle, setLifecycle] = useState<'draft' | 'hub-certified'>('draft');
  const [status, setStatus] = useState<Status>(mode === 'edit' ? 'loading' : 'idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !metricId) return;
    let ok = true;
    fetchMetric(metricId)
      .then((m) => {
        if (!ok) return;
        setFields({
          name: m.name,
          area: m.area as Area,
          definition: m.definition,
          calculation: m.calculation,
          owner: m.owner,
          sme: m.sme,
          unit: m.unit ?? '',
          sourcesText: m.sources.join(', '),
        });
        setLifecycle(m.lifecycle);
        setStatus('idle');
      })
      .catch((e) => {
        if (ok) {
          setStatus('error');
          setError(String(e));
        }
      });
    return () => {
      ok = false;
    };
  }, [mode, metricId]);

  const set = <K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) =>
    setFields((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const payload: MetricPayload = {
      name: fields.name,
      area: fields.area,
      definition: fields.definition,
      calculation: fields.calculation,
      owner: fields.owner,
      sme: fields.sme,
      unit: fields.unit || undefined,
      sources: fields.sourcesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    if (mode === 'edit' && metricId) {
      const res = await updateMetric(metricId, { ...payload, lifecycle, updatedBy: 'Hub steward' });
      if (res.ok) return navigate({ name: 'metric', id: metricId });
      setStatus('error');
      setError(res.error);
      return;
    }
    const res = await createMetric(payload);
    if (res.ok) return navigate({ name: 'metric', id: `hm-${res.id}` });
    setStatus('error');
    setError(res.error);
  };

  if (status === 'loading') return <Text className="text-sm text-muted-foreground">Loading…</Text>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          onClick={() => navigate({ name: 'browse', kind: 'metrics' })}
          className="flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Metrics
        </button>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{mode === 'create' ? 'Add a metric' : 'Edit metric'}</span>
      </div>

      <div>
        <H1 className="text-2xl">{mode === 'create' ? 'Add a metric' : 'Edit metric'}</H1>
        <Text className="mt-1 text-sm text-muted-foreground">
          {mode === 'create'
            ? 'Author a business measure directly in the Hub — no dbt required to get started.'
            : 'Update this metric, or promote it once it’s trustworthy for broad use.'}
        </Text>
      </div>

      <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5">
        <Card.Root>
          <Card.Content className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mf-name">Metric name</Label>
              <Input
                id="mf-name"
                value={fields.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Promo Margin"
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
                    variant={a === fields.area ? 'default' : 'outline'}
                    onClick={() => set('area', a)}
                  >
                    {a}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mf-definition">What it means</Label>
              <Textarea
                id="mf-definition"
                value={fields.definition}
                onChange={(e) => set('definition', e.target.value)}
                placeholder="Plain-language definition a business user would recognize."
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mf-calculation">Calculation</Label>
              <Textarea
                id="mf-calculation"
                value={fields.calculation}
                onChange={(e) => set('calculation', e.target.value)}
                placeholder="How is it computed, in plain language or pseudo-formula?"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mf-owner">Business owner</Label>
                <Input id="mf-owner" value={fields.owner} onChange={(e) => set('owner', e.target.value)} placeholder="e.g. Jane Smith" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mf-sme">SME (ask about the data)</Label>
                <Input id="mf-sme" value={fields.sme} onChange={(e) => set('sme', e.target.value)} placeholder="e.g. John Doe" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mf-unit">Unit (optional)</Label>
              <Input id="mf-unit" value={fields.unit} onChange={(e) => set('unit', e.target.value)} placeholder="e.g. $/dozen" />
              <Text className="text-xs text-muted-foreground">
                No current-value field here on purpose — a Hub-authored metric has no declared
                scope/filters to stand behind a specific number. Once it&apos;s governed in dbt, the
                dbt harvest supplies a real, scoped value.
              </Text>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mf-sources">Sources feeding this metric</Label>
              <Input
                id="mf-sources"
                value={fields.sourcesText}
                onChange={(e) => set('sourcesText', e.target.value)}
                placeholder="Comma-separated, e.g. SAP FI/CO, MTech"
              />
            </div>

            {mode === 'edit' && (
              <div className="flex flex-col gap-1.5 border-t border-border pt-4">
                <Label>Lifecycle</Label>
                <div className="flex flex-wrap gap-2">
                  {(['draft', 'hub-certified'] as const).map((l) => (
                    <Button
                      key={l}
                      type="button"
                      size="sm"
                      variant={l === lifecycle ? 'default' : 'outline'}
                      onClick={() => setLifecycle(l)}
                    >
                      {l === 'draft' ? 'Draft' : 'Hub-certified'}
                    </Button>
                  ))}
                </div>
                <Text className="text-xs text-muted-foreground">
                  Hub-certified means steward-approved and trustworthy for its scope. Governed-in-dbt
                  is a separate, dbt-harvested tier not settable here.
                </Text>
              </div>
            )}
          </Card.Content>
        </Card.Root>

        {status === 'error' && <Text className="text-sm text-destructive">{error}</Text>}

        <div>
          <Button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Saving…' : mode === 'create' ? 'Create metric' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
