import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, GitBranch } from 'lucide-react';

import { Badge, Button, Card, H1, Muted, Text } from '@pilgrims/ui';

import { fetchDataSource, isRealId, type RealSource } from '../api';
import type { Area } from '../mock';
import type { Navigate } from '../App';
import { assetById, assetUsage } from '../mock';
import { AreaChip, ReadinessDetail, ReadinessRing } from '../ui';

function Chip({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const cls = 'rounded-md border border-border bg-surface-muted px-2 py-0.5 text-xs';
  return onClick ? (
    <button onClick={onClick} className={`${cls} transition-colors hover:border-brand-500 hover:text-brand-600`}>
      {children}
    </button>
  ) : (
    <span className={cls}>{children}</span>
  );
}

/** Compact "you are here" lineage preview — real counts, not decoration —
    so position in the graph is visible without a click into the full DAG. */
function FlowStrip({
  upstreamCount,
  label,
  downstreamCount,
  onViewLineage,
}: {
  upstreamCount: number;
  label: string;
  downstreamCount: number;
  onViewLineage: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
      <span className="text-muted-foreground">
        {upstreamCount} upstream {upstreamCount === 1 ? 'input' : 'inputs'}
      </span>
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <span className="rounded-md bg-brand-navy px-2 py-0.5 text-xs font-medium text-white">{label}</span>
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{downstreamCount} downstream</span>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onViewLineage}>
        View full graph <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}

function Group({ label, children, empty }: { label: string; children?: React.ReactNode; empty?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      {empty ? <Muted className="text-sm">—</Muted> : <div className="flex flex-wrap gap-1.5">{children}</div>}
    </div>
  );
}

export function AssetDetail({ id, navigate }: { id: string; navigate: Navigate }) {
  if (isRealId(id)) return <RealSourceDetail id={id} navigate={navigate} />;

  const a = assetById(id);
  if (!a) return <Muted>Asset not found.</Muted>;
  const u = assetUsage(id);
  const isConsumed = u.apps.length + u.metrics.length + u.downstreamAssets.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button onClick={() => navigate({ name: 'landing' })} className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Hub
        </button>
        <ChevronRight className="size-3.5" />
        <span>Data assets</span>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground break-all">{a.name}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <H1 className="text-2xl break-all">{a.name}</H1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={a.kind === 'source' ? 'info-soft' : 'secondary'}>
              {a.kind === 'source' ? 'Source' : 'Model'} · {a.layerLabel}
            </Badge>
            <AreaChip area={a.area} />
            {a.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Readiness</span>
            <ReadinessRing r={a.readiness} size="sm" />
          </div>
          <Button onClick={() => navigate({ name: 'lineage', id: a.id })}>
            <GitBranch className="size-4" /> View lineage
          </Button>
        </div>
      </div>

      <FlowStrip
        upstreamCount={u.upstream.length}
        label={a.name}
        downstreamCount={u.metrics.length + u.apps.length + u.downstreamAssets.length}
        onViewLineage={() => navigate({ name: 'lineage', id: a.id })}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* How it's used — leads */}
        <Card.Root className="lg:col-span-2">
          <Card.Header>
            <Card.Title className="text-base">How it&apos;s used</Card.Title>
            <Card.Subtitle>Who and what depends on this asset today</Card.Subtitle>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            {!isConsumed && <Muted className="text-sm">Not consumed downstream yet — nothing is built on this.</Muted>}
            <Group label="Feeds metrics" empty={u.metrics.length === 0}>
              {u.metrics.map((m) => (
                <Chip key={m.id} onClick={() => navigate({ name: 'metric', id: m.id })}>
                  {m.name}
                </Chip>
              ))}
            </Group>
            <Group label="Used by applications" empty={u.apps.length === 0}>
              {u.apps.map((app) => (
                <Chip key={app.id} onClick={() => navigate({ name: 'app', id: app.id })}>
                  {app.name}
                </Chip>
              ))}
            </Group>
            <Group label="Downstream models" empty={u.downstreamAssets.length === 0}>
              {u.downstreamAssets.map((d) => (
                <Chip key={d.id} onClick={() => navigate({ name: 'asset', id: d.id })}>
                  {d.name}
                </Chip>
              ))}
            </Group>
          </Card.Content>
        </Card.Root>

        {/* Readiness & ownership */}
        <Card.Root>
          <Card.Header>
            <Card.Title className="text-base">Readiness &amp; ownership</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            <ReadinessDetail r={a.readiness} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">Owner</span>
              <span className="text-sm">{a.owner}</span>
            </div>
          </Card.Content>
        </Card.Root>

        {/* Built from */}
        <Card.Root className="lg:col-span-3">
          <Card.Header>
            <Card.Title className="text-base">Built from</Card.Title>
            <Card.Subtitle>{a.kind === 'source' ? 'Upstream source system' : 'Upstream inputs + transformation'}</Card.Subtitle>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            <Text className="text-sm text-muted-foreground">{a.description}</Text>
            <Group label="Upstream inputs" empty={u.upstream.length === 0}>
              {u.upstream.map((up) => (
                <Chip key={up.id} onClick={() => navigate({ name: 'asset', id: up.id })}>
                  {up.name}
                </Chip>
              ))}
            </Group>
            {u.upstream.length === 0 && <Muted className="text-xs">Raw upstream source — no dbt inputs.</Muted>}
            {a.sql && (
              <div>
                <span className="text-xs tracking-wide text-muted-foreground uppercase">Transformation (dbt)</span>
                <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-surface-muted p-3 text-xs leading-relaxed">
                  {a.sql}
                </pre>
              </div>
            )}
          </Card.Content>
        </Card.Root>
      </div>
    </div>
  );
}

/** Real catalogue source detail — live from portfolio.db via /api. */
function RealSourceDetail({ id, navigate }: { id: string; navigate: Navigate }) {
  const [s, setS] = useState<RealSource | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let ok = true;
    fetchDataSource(id)
      .then((d) => ok && setS(d))
      .catch((e) => ok && setErr(String(e)));
    return () => {
      ok = false;
    };
  }, [id]);

  if (err) return <Muted className="text-destructive">Couldn’t load source ({err}).</Muted>;
  if (!s) return <Muted>Loading…</Muted>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button onClick={() => navigate({ name: 'landing' })} className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Hub
        </button>
        <ChevronRight className="size-3.5" />
        <span>Data sources</span>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground break-all">{s.name}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <H1 className="text-2xl break-all">{s.name}</H1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info-soft">Source · Catalogue</Badge>
            <AreaChip area={s.area as Area} />
            {s.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Readiness</span>
            <ReadinessRing r={s.readiness} size="sm" />
          </div>
          <Button onClick={() => navigate({ name: 'lineage', id: s.id })}>
            <GitBranch className="size-4" /> View lineage
          </Button>
        </div>
      </div>

      <FlowStrip
        upstreamCount={0}
        label={s.name}
        downstreamCount={s.mappedCount}
        onViewLineage={() => navigate({ name: 'lineage', id: s.id })}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* How it's used — same structure as the mock AssetDetail, so the real
            path (86 live sources) doesn't read as more sparse than the demo. */}
        <Card.Root className="lg:col-span-2">
          <Card.Header>
            <Card.Title className="text-base">How it&apos;s used</Card.Title>
            <Card.Subtitle>Who and what depends on this source today</Card.Subtitle>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            <Group label="Feeds metrics">
              <Muted className="text-sm">Not linked yet — metrics are still sample data.</Muted>
            </Group>
            <Group label="Used by applications">
              <Muted className="text-sm">Not linked yet — AI applications are still sample data.</Muted>
            </Group>
            <Group label="Downstream dbt models">
              {!s.mappedNodes || s.mappedNodes.length === 0 ? (
                <Muted className="text-sm">Not mapped to dbt yet — nothing downstream is linked.</Muted>
              ) : (
                s.mappedNodes.map((n) => (
                  <Chip key={n.unique_id}>
                    <span title={`${n.schema ?? ''} · confidence ${n.confidence}`}>{n.name}</span>
                  </Chip>
                ))
              )}
            </Group>
            {s.mappedNodes && s.mappedNodes.length > 0 && (
              <Button variant="outline" onClick={() => navigate({ name: 'lineage', id: s.id })}>
                <GitBranch className="size-4" /> Explore full lineage
              </Button>
            )}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title className="text-base">Readiness &amp; ownership</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            <ReadinessDetail r={s.readiness} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">Owner</span>
              <span className="text-sm">{s.owner}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">Lifecycle</span>
              <span className="text-sm">{s.lifecycle || '—'}</span>
            </div>
          </Card.Content>
        </Card.Root>

        {/* Built from — mirrors the mock AssetDetail's card. Real sources are
            always raw (no dbt inputs), so the upstream group is always empty. */}
        <Card.Root className="lg:col-span-3">
          <Card.Header>
            <Card.Title className="text-base">Built from</Card.Title>
            <Card.Subtitle>Upstream source system</Card.Subtitle>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            <Text className="text-sm text-muted-foreground">
              {s.description || 'No description captured for this source yet.'}
            </Text>
            <Muted className="text-xs">Raw upstream source — no dbt inputs.</Muted>
          </Card.Content>
        </Card.Root>
      </div>
    </div>
  );
}
