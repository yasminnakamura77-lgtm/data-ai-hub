import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, GitBranch, Pencil, ShieldCheck } from 'lucide-react';

import { Button, Card, H1, Muted, Tabs, TabsContent, TabsList, TabsTrigger, Text } from '@pilgrims/ui';

import { fetchMetric, isRealMetricId, type RealMetric } from '../api';
import type { Navigate } from '../App';
import { appById, type Area, LIFECYCLE_LABEL, metricById } from '../mock';
import { AreaChip, LifecycleBadge, ReadinessDetail, ReadinessRing } from '../ui';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

/** Small inline lineage preview for "what feeds this metric" — real source
    names flowing into the metric, not hidden behind a click into the DAG. */
function SourceFlow({ sources, metricName }: { sources: string[]; metricName: string }) {
  if (sources.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sources.map((s) => (
        <span key={s} className="rounded-md border border-border bg-surface-muted px-2 py-0.5 text-xs">
          {s}
        </span>
      ))}
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <span className="rounded-md bg-brand-navy px-2 py-0.5 text-xs font-medium text-white">{metricName}</span>
    </div>
  );
}

export function MetricDetail({ id, navigate }: { id: string; navigate: Navigate }) {
  if (isRealMetricId(id)) return <RealMetricDetail id={id} navigate={navigate} />;

  const m = metricById(id);
  if (!m) return <Muted>Metric not found.</Muted>;

  const governed = m.lifecycle === 'governed-in-dbt';

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button onClick={() => navigate({ name: 'landing' })} className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Hub
        </button>
        <ChevronRight className="size-3.5" />
        <span>Metrics</span>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{m.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <H1 className="text-2xl">{m.name}</H1>
          <div className="flex flex-wrap items-center gap-2">
            <AreaChip area={m.area} />
            <LifecycleBadge lifecycle={m.lifecycle} />
            <Muted className="text-xs">Updated {m.updated}</Muted>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            {m.lifecycle === 'governed-in-dbt' ? (
              m.value ? (
                <div className="text-3xl font-bold tracking-tight tabular-nums">{m.value}</div>
              ) : (
                <Muted className="text-sm">Not yet computed</Muted>
              )
            ) : (
              <Muted
                className="text-sm"
                title="No declared scope/filters to stand behind a number yet — see the calculation below."
              >
                Calculation only
              </Muted>
            )}
            {m.lifecycle === 'governed-in-dbt' && m.delta && (
              <div
                className={`text-xs font-medium ${
                  m.delta.sentiment === 'good'
                    ? 'text-success'
                    : m.delta.sentiment === 'bad'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                }`}
              >
                {m.delta.text}
              </div>
            )}
          </div>
          <ReadinessRing r={m.readiness} size="md" showLabel />
          <Button onClick={() => navigate({ name: 'lineage', id: m.id })}>
            <GitBranch className="size-4" /> View lineage
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="governance">Trust &amp; governance</TabsTrigger>
          <TabsTrigger value="usedby">Used by</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card.Root className="lg:col-span-2">
              <Card.Header>
                <Card.Title className="text-base">What it means</Card.Title>
              </Card.Header>
              <Card.Content className="flex flex-col gap-4">
                <Text className="text-sm">{m.definition}</Text>
                <div>
                  <span className="text-xs tracking-wide text-muted-foreground uppercase">Calculation</span>
                  <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-surface-muted p-3 text-sm">
                    {m.calculation}
                  </pre>
                  {m.unit && <Muted className="mt-1 text-xs">Unit: {m.unit}</Muted>}
                </div>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header>
                <Card.Title className="text-base">Data behind it</Card.Title>
                <Card.Subtitle>Sources feeding this metric</Card.Subtitle>
              </Card.Header>
              <Card.Content className="flex flex-col gap-3">
                <SourceFlow sources={m.sources} metricName={m.name} />
                <Button variant="outline" onClick={() => navigate({ name: 'lineage', id: m.id })}>
                  <GitBranch className="size-4" /> Explore full lineage
                </Button>
              </Card.Content>
            </Card.Root>
          </div>
        </TabsContent>

        {/* Governance */}
        <TabsContent value="governance" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card.Root className="lg:col-span-2">
              <Card.Header>
                <Card.Title className="text-base">Readiness</Card.Title>
                <Card.Subtitle>3-stage: Raw in Snowflake → Data Modeled → Semantic Layer</Card.Subtitle>
              </Card.Header>
              <Card.Content>
                <ReadinessDetail r={m.readiness} />
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header>
                <Card.Title className="text-base">Ownership</Card.Title>
              </Card.Header>
              <Card.Content className="flex flex-col gap-3">
                <Field label="Business owner">{m.owner}</Field>
                <Field label="SME (ask about the data)">{m.sme}</Field>
                <Field label="Freshness">{m.updated}</Field>
              </Card.Content>
            </Card.Root>

            <Card.Root className="lg:col-span-3">
              <Card.Content className="flex items-start gap-3 p-4">
                <ShieldCheck className={`mt-0.5 size-5 ${governed ? 'text-success' : 'text-info'}`} />
                <div>
                  <div className="text-sm font-medium">
                    {LIFECYCLE_LABEL[m.lifecycle]}
                  </div>
                  <Text className="text-sm text-muted-foreground">
                    {governed
                      ? 'This metric is defined as code in dbt — the calculation is governed there and shown read-only here, so every tower that uses it gets the same number. It cannot drift.'
                      : m.lifecycle === 'hub-certified'
                        ? 'Steward-approved and trustworthy for its scope. It lives in the Hub; it can be promoted to dbt when it goes cross-tower, feeds a tower/AI app, or is reused across teams.'
                        : 'Draft — proposed by a steward and awaiting review. Not yet certified for broad use.'}
                  </Text>
                </div>
              </Card.Content>
            </Card.Root>
          </div>
        </TabsContent>

        {/* Used by */}
        <TabsContent value="usedby" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {m.usedBy.map((aid) => {
              const app = appById(aid);
              if (!app) return null;
              return (
                <div
                  key={aid}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate({ name: 'app', id: app.id })}
                  onKeyDown={(e) => e.key === 'Enter' && navigate({ name: 'app', id: app.id })}
                  className="group cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <Card.Root className="h-full transition-colors group-hover:border-brand-500">
                    <Card.Header>
                      <div className="flex items-center justify-between gap-2">
                        <Card.Title className="text-base">{app.name}</Card.Title>
                        <AreaChip area={app.area} />
                      </div>
                      <Card.Subtitle>
                        {app.kind} · {app.stage}
                      </Card.Subtitle>
                    </Card.Header>
                    <Card.Content>
                      <Text className="text-sm text-muted-foreground">{app.description}</Text>
                    </Card.Content>
                  </Card.Root>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Real, Hub-authored metric detail — live from portfolio.db's hub_metrics table. */
function RealMetricDetail({ id, navigate }: { id: string; navigate: Navigate }) {
  const [m, setM] = useState<RealMetric | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let ok = true;
    fetchMetric(id)
      .then((d) => ok && setM(d))
      .catch((e) => ok && setErr(String(e)));
    return () => {
      ok = false;
    };
  }, [id]);

  if (err) return <Muted className="text-destructive">Couldn’t load metric ({err}).</Muted>;
  if (!m) return <Muted>Loading…</Muted>;

  const governed = false; // real hub_metrics never reaches governed-in-dbt

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button onClick={() => navigate({ name: 'landing' })} className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Hub
        </button>
        <ChevronRight className="size-3.5" />
        <span>Metrics</span>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{m.name}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <H1 className="text-2xl">{m.name}</H1>
          <div className="flex flex-wrap items-center gap-2">
            <AreaChip area={m.area as Area} />
            <LifecycleBadge lifecycle={m.lifecycle} />
            <Muted className="text-xs">Updated {m.updated}</Muted>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Muted
            className="text-sm"
            title="Hub-authored metrics are never dbt-governed, so there's no declared scope/filters to stand behind a number — see the calculation below."
          >
            Calculation only
          </Muted>
          <Button onClick={() => navigate({ name: 'metric-edit', id: m.id })}>
            <Pencil className="size-4" /> Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="governance">Trust &amp; governance</TabsTrigger>
          <TabsTrigger value="usedby">Used by</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card.Root className="lg:col-span-2">
              <Card.Header>
                <Card.Title className="text-base">What it means</Card.Title>
              </Card.Header>
              <Card.Content className="flex flex-col gap-4">
                <Text className="text-sm">{m.definition || 'No definition yet.'}</Text>
                <div>
                  <span className="text-xs tracking-wide text-muted-foreground uppercase">Calculation</span>
                  <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-surface-muted p-3 text-sm">
                    {m.calculation || 'Not documented yet.'}
                  </pre>
                  {m.unit && <Muted className="mt-1 text-xs">Unit: {m.unit}</Muted>}
                </div>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header>
                <Card.Title className="text-base">Data behind it</Card.Title>
                <Card.Subtitle>Sources feeding this metric</Card.Subtitle>
              </Card.Header>
              <Card.Content className="flex flex-col gap-3">
                {m.sources.length === 0 ? (
                  <Muted className="text-sm">No sources listed yet.</Muted>
                ) : (
                  <SourceFlow sources={m.sources} metricName={m.name} />
                )}
              </Card.Content>
            </Card.Root>
          </div>
        </TabsContent>

        <TabsContent value="governance" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card.Root className="lg:col-span-2">
              <Card.Header>
                <Card.Title className="text-base">Readiness</Card.Title>
              </Card.Header>
              <Card.Content>
                <Muted className="text-sm">
                  Manually authored in the Hub — no pipeline readiness tracked.
                </Muted>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header>
                <Card.Title className="text-base">Ownership</Card.Title>
              </Card.Header>
              <Card.Content className="flex flex-col gap-3">
                <Field label="Business owner">{m.owner || '—'}</Field>
                <Field label="SME (ask about the data)">{m.sme || '—'}</Field>
                <Field label="Freshness">{m.updated}</Field>
              </Card.Content>
            </Card.Root>

            <Card.Root className="lg:col-span-3">
              <Card.Content className="flex items-start gap-3 p-4">
                <ShieldCheck className={`mt-0.5 size-5 ${governed ? 'text-success' : 'text-info'}`} />
                <div>
                  <div className="text-sm font-medium">{LIFECYCLE_LABEL[m.lifecycle]}</div>
                  <Text className="text-sm text-muted-foreground">
                    {m.lifecycle === 'hub-certified'
                      ? 'Steward-approved and trustworthy for its scope. Can be promoted to dbt later if it goes cross-tower, feeds a tower/AI app, or is reused across teams — not built yet.'
                      : 'Draft — proposed by a steward and awaiting review. Not yet certified for broad use.'}
                  </Text>
                </div>
              </Card.Content>
            </Card.Root>
          </div>
        </TabsContent>

        <TabsContent value="usedby" className="mt-4">
          <Muted className="text-sm">Not linked to any applications yet.</Muted>
        </TabsContent>
      </Tabs>
    </div>
  );
}
