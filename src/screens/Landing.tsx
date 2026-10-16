import { useEffect, useState } from 'react';
import { ArrowRight, Boxes, Database, Gauge, Search, Sparkles } from 'lucide-react';

import { Badge, Button, Card, H2, Input, Lead, Muted, Text } from '@pilgrims/ui';

import { fetchDataSources, fetchMetrics, isRealMetricId, type RealMetric, type RealSource } from '../api';
import type { Navigate } from '../App';
import { type Area, AREAS, applications, type Lifecycle, metrics, type Readiness, terms } from '../mock';
import { AreaChip, LifecycleBadge, ReadinessRing } from '../ui';

interface MetricCard {
  id: string;
  name: string;
  area: Area;
  lifecycle: Lifecycle;
  definition: string;
  value?: string;
  updated: string;
  readiness?: Readiness;
  delta?: { trend: 'up' | 'down' | 'flat'; sentiment: 'good' | 'bad' | 'neutral'; text: string };
}

type AreaFilter = Area | 'All';

/** Section header — border weight/size signals priority (Metrics > Sources > Apps > Terms), not just doc order. */
function SectionHead({
  icon,
  title,
  count,
  note,
  action,
  weight = 'secondary',
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  note?: string;
  action?: React.ReactNode;
  weight?: 'primary' | 'secondary' | 'tertiary';
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 pb-3 ${
        weight === 'primary' ? 'border-b-2 border-brand-navy/25' : weight === 'secondary' ? 'border-b border-border' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <H2 className={weight === 'primary' ? 'text-xl' : 'text-lg'}>{title}</H2>
        <Muted className="text-xs">{count}</Muted>
        {note && <Muted className="ml-1 text-xs italic">· {note}</Muted>}
      </div>
      {action}
    </div>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xl font-bold tabular-nums text-brand-navy">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function Landing({
  area,
  setArea,
  navigate,
}: {
  area: AreaFilter;
  setArea: (a: AreaFilter) => void;
  navigate: Navigate;
}) {
  const [q, setQ] = useState('');
  const [sources, setSources] = useState<RealSource[] | null>(null);
  const [srcErr, setSrcErr] = useState<string | null>(null);
  const [realMetrics, setRealMetrics] = useState<RealMetric[] | null>(null);
  useEffect(() => {
    fetchDataSources().then(setSources).catch((e) => setSrcErr(String(e)));
    fetchMetrics().then(setRealMetrics).catch(() => setRealMetrics([]));
  }, []);

  const query = q.trim().toLowerCase();
  const inArea = <T extends { area: string }>(x: T) => area === 'All' || x.area === area;
  const match = (...s: string[]) => !query || s.some((x) => x?.toLowerCase().includes(query));

  const allMetrics: MetricCard[] = [
    ...(realMetrics ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      area: m.area as Area,
      lifecycle: m.lifecycle,
      definition: m.definition,
      value: m.value ?? undefined,
      updated: m.updated,
    })),
    ...metrics.map((m) => ({
      id: m.id,
      name: m.name,
      area: m.area,
      lifecycle: m.lifecycle,
      definition: m.definition,
      value: m.value,
      updated: m.updated,
      readiness: m.readiness,
      delta: m.delta,
    })),
  ];
  const shownMetrics = allMetrics.filter(inArea).filter((m) => match(m.name, m.definition));
  const shownAssets = (sources ?? []).filter(inArea).filter((a) => match(a.name, a.description, ...a.tags));
  const shownApps = applications.filter(inArea).filter((a) => match(a.name, a.description));
  const shownTerms = terms.filter(inArea).filter((t) => match(t.name, t.definition));

  // Landing shows curated highlights, never the whole list (scale-safe). Metrics
  // gets fewer, bigger highlight cards (2-col) — the other sections get more,
  // smaller ones — so visual weight matches the doctrine's stated priority order.
  const LC_RANK: Record<string, number> = { 'governed-in-dbt': 0, 'hub-certified': 1, draft: 2 };
  const metricHighlights = [...shownMetrics]
    .sort((a, b) => (LC_RANK[a.lifecycle] ?? 9) - (LC_RANK[b.lifecycle] ?? 9))
    .slice(0, 4);
  const sourceHighlights = [...shownAssets]
    .sort(
      (a, b) =>
        (b.tags.includes('Certified') ? 1 : 0) - (a.tags.includes('Certified') ? 1 : 0) ||
        b.mappedCount - a.mappedCount,
    )
    .slice(0, 6);
  const appHighlights = shownApps.slice(0, 4);
  const termHighlights = shownTerms.slice(0, 6);
  const browseBtn = (kind: 'metrics' | 'sources' | 'apps' | 'terms', n: number) => (
    <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'browse', kind })}>
      Browse all {n} <ArrowRight className="size-3.5" />
    </Button>
  );

  return (
    <div className="flex flex-col gap-12">
      {/* Hero — search-first, closed out by a real stat rail (not decoration —
          the doctrine's own worry is "empty shelves"; this answers it with
          numbers pulled from the same data the sections below show). */}
      <section className="flex flex-col items-center gap-6 rounded-xl border border-border bg-brand-navy/[0.03] px-6 py-10 text-center">
        <div>
          <H2 className="text-3xl">What data &amp; AI do we already have?</H2>
          <Lead className="mt-2 max-w-2xl">
            Look up existing metrics, data and AI apps — what exists, how ready it is, and how it&apos;s used —
            before you build something new.
          </Lead>
        </div>
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search metrics, data, AI apps, terms…  (e.g. “egg cost”, “customer”)"
            className="h-11 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Muted className="mr-1 text-xs">Business Area</Muted>
          {(['All', ...AREAS] as AreaFilter[]).map((a) => (
            <Button key={a} size="sm" variant={a === area ? 'default' : 'outline'} onClick={() => setArea(a)}>
              {a}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-t border-border/70 pt-5">
          <Stat value={sources === null ? '…' : sources.length} label="data sources traced" />
          <Stat value={allMetrics.length} label="metrics catalogued" />
          <Stat value={applications.length} label="AI applications" />
          <Stat value={terms.length} label="business terms" />
        </div>
      </section>

      {/* 1 — Metrics (most important): fewer, bigger cards; a distinct built-from-Card
          layout instead of the generic KpiCard shape everything else uses. */}
      <section className="flex flex-col gap-3">
        <SectionHead
          icon={<Gauge className="size-4 text-brand-navy" />}
          title={`Metrics${area !== 'All' ? ` · ${area}` : ''}`}
          count={shownMetrics.length}
          weight="primary"
          note={realMetrics === null ? 'loading…' : undefined}
          action={
            <div className="flex items-center gap-1">
              {browseBtn('metrics', shownMetrics.length)}
              <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'metric-new' })}>
                Add a metric
              </Button>
            </div>
          }
        />
        {shownMetrics.length === 0 ? (
          <Muted>No metrics match “{q}”.</Muted>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {metricHighlights.map((m, i) => (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate({ name: 'metric', id: m.id })}
                onKeyDown={(e) => e.key === 'Enter' && navigate({ name: 'metric', id: m.id })}
                style={{ animationDelay: `${i * 60}ms` }}
                className="group animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both cursor-pointer rounded-xl outline-none duration-500 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Card.Root className="h-full border-l-2 border-l-brand-navy/25 p-5 transition-colors group-hover:border-brand-500">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold">{m.name}</span>
                        {!isRealMetricId(m.id) && <Badge variant="outline">Sample</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <LifecycleBadge lifecycle={m.lifecycle} />
                        <AreaChip area={m.area} />
                      </div>
                    </div>
                    {m.readiness ? (
                      <ReadinessRing r={m.readiness} size="md" showLabel />
                    ) : (
                      <span className="mt-1 text-right text-[10px] leading-tight text-muted-foreground">
                        Hub-
                        <br />
                        authored
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      {m.lifecycle === 'governed-in-dbt' ? (
                        m.value ? (
                          <div className="text-2xl font-bold tracking-tight tabular-nums">{m.value}</div>
                        ) : (
                          <Muted className="text-sm">Not yet computed</Muted>
                        )
                      ) : (
                        <Muted className="text-sm" title="No declared scope/filters to stand behind a number yet — see the calculation below.">
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
                    <span className="flex items-center gap-1 text-xs text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Open <ArrowRight className="size-3" />
                    </span>
                  </div>

                  {m.definition && (
                    <Text className="mt-2 line-clamp-2 text-xs text-muted-foreground">{m.definition}</Text>
                  )}
                  <Muted className="mt-2 block text-[11px]">Updated {m.updated}</Muted>
                </Card.Root>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2 — Data sources (live from portfolio.db) */}
      <section className="flex flex-col gap-3">
        <SectionHead
          icon={<Database className="size-4 text-brand-navy" />}
          title={`Data sources${area !== 'All' ? ` · ${area}` : ''}`}
          count={shownAssets.length}
          weight="secondary"
          note={sources === null ? 'loading…' : 'live · portfolio.db'}
          action={
            sources !== null ? (
              <div className="flex items-center gap-1">
                {browseBtn('sources', shownAssets.length)}
                <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'request-source' })}>
                  Request a source
                </Button>
              </div>
            ) : undefined
          }
        />
        {srcErr && (
          <Muted className="text-sm text-destructive">
            Couldn’t load sources ({srcErr}). Is the dev API running on :8099?
          </Muted>
        )}
        {sources === null && !srcErr ? (
          <Muted>Loading data sources…</Muted>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sourceHighlights.map((a, i) => (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate({ name: 'asset', id: a.id })}
                onKeyDown={(e) => e.key === 'Enter' && navigate({ name: 'asset', id: a.id })}
                style={{ animationDelay: `${i * 40}ms` }}
                className="group animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both cursor-pointer rounded-lg outline-none duration-500 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Card.Root className="h-full transition-colors group-hover:border-brand-500">
                  <Card.Content className="flex h-full flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="info-soft">Source</Badge>
                      <AreaChip area={a.area as Area} />
                    </div>
                    <div className="font-medium break-all">{a.name}</div>
                    <Text className="line-clamp-2 text-sm text-muted-foreground">{a.description || 'No description yet.'}</Text>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                      <ReadinessRing r={a.readiness} size="sm" />
                      <span className="text-xs text-muted-foreground">
                        {a.mappedCount > 0 ? `${a.mappedCount} dbt models mapped` : 'Not mapped to dbt yet'}
                      </span>
                    </div>
                    {a.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {a.tags.map((t) => (
                          <span key={t} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card.Content>
                </Card.Root>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3 — AI applications */}
      <section className="flex flex-col gap-3">
        <SectionHead
          icon={<Boxes className="size-4 text-brand-navy" />}
          title={`AI applications${area !== 'All' ? ` · ${area}` : ''}`}
          count={shownApps.length}
          weight="secondary"
          note="sample data"
          action={browseBtn('apps', shownApps.length)}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {appHighlights.map((app, i) => (
            <div
              key={app.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate({ name: 'app', id: app.id })}
              onKeyDown={(e) => e.key === 'Enter' && navigate({ name: 'app', id: app.id })}
              style={{ animationDelay: `${i * 40}ms` }}
              className="group animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both cursor-pointer rounded-lg outline-none duration-500 focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Card.Root className="h-full transition-colors group-hover:border-brand-500">
                <Card.Content className="flex h-full flex-col gap-1.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{app.name}</span>
                    <AreaChip area={app.area} />
                  </div>
                  <Muted className="text-xs">
                    {app.kind} · {app.stage}
                  </Muted>
                  <Text className="line-clamp-3 text-sm text-muted-foreground">{app.description}</Text>
                </Card.Content>
              </Card.Root>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — Business terms: a plain rule-separated list, not cards — the
          lowest-priority object gets the lightest visual weight, dictionary-style. */}
      <section className="flex flex-col gap-3">
        <SectionHead
          icon={<Sparkles className="size-4 text-brand-navy" />}
          title={`Business terms${area !== 'All' ? ` · ${area}` : ''}`}
          count={shownTerms.length}
          weight="tertiary"
          note="sample data"
          action={browseBtn('terms', shownTerms.length)}
        />
        <div className="divide-y divide-border">
          {termHighlights.map((t, i) => (
            <div
              key={t.id}
              style={{ animationDelay: `${i * 30}ms` }}
              className="animate-in fade-in-0 fill-mode-both flex flex-col gap-1 py-3 duration-500 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <div className="flex shrink-0 items-baseline gap-2 sm:w-48">
                <span className="font-medium">{t.name}</span>
                <AreaChip area={t.area} />
              </div>
              <Text className="text-sm text-muted-foreground">{t.definition}</Text>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
