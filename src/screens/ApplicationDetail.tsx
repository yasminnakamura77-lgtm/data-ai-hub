import { ArrowLeft, ChevronRight, GitBranch, Sparkles } from 'lucide-react';

import { Badge, Button, Card, H1, Muted, Text } from '@pilgrims/ui';

import type { Navigate } from '../App';
import { APP_STAGES, appById, appUsage } from '../mock';
import { AreaChip, LifecycleBadge, ReadinessRing } from '../ui';

function StageStrip({ current }: { current: string }) {
  const idx = APP_STAGES.indexOf(current as (typeof APP_STAGES)[number]);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {APP_STAGES.map((s, i) => (
        <span
          key={s}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            i < idx
              ? 'bg-success/15 text-success'
              : i === idx
                ? 'bg-brand-navy text-white'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

export function ApplicationDetail({ id, navigate }: { id: string; navigate: Navigate }) {
  const app = appById(id);
  if (!app) return <Muted>Application not found.</Muted>;
  const u = appUsage(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button onClick={() => navigate({ name: 'landing' })} className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Hub
        </button>
        <ChevronRight className="size-3.5" />
        <span>AI applications</span>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{app.name}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <H1 className="text-2xl">{app.name}</H1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{app.kind}</Badge>
            <AreaChip area={app.area} />
            <StageStrip current={app.stage} />
          </div>
        </div>
        <Button onClick={() => navigate({ name: 'lineage', id: app.id })}>
          <GitBranch className="size-4" /> View data lineage
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Vision — leads */}
        <Card.Root className="lg:col-span-2">
          <Card.Header>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand-navy" />
              <Card.Title className="text-base">Vision</Card.Title>
            </div>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            <Text className="text-sm">{app.vision}</Text>
            <Field label="Expected value">{app.expectedValue}</Field>
          </Card.Content>
        </Card.Root>

        {/* At a glance */}
        <Card.Root>
          <Card.Header>
            <Card.Title className="text-base">At a glance</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-3">
            <Field label="Lifecycle stage">{app.stage}</Field>
            <Field label="Business sponsor">{app.sponsor}</Field>
            <Field label="Business area">{app.area}</Field>
            <Field label="Type">{app.kind}</Field>
          </Card.Content>
        </Card.Root>

        {/* Data used */}
        <Card.Root className="lg:col-span-2">
          <Card.Header>
            <Card.Title className="text-base">Data it uses</Card.Title>
            <Card.Subtitle>Models consumed directly, and the source systems behind them</Card.Subtitle>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">Models used</span>
              {u.direct.length === 0 ? (
                <Muted className="text-sm">None mapped yet.</Muted>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {u.direct.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => navigate({ name: 'asset', id: a.id })}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-muted px-3 py-1.5 text-left text-sm transition-colors hover:border-brand-500"
                    >
                      <span className="break-all">{a.name}</span>
                      <ReadinessRing r={a.readiness} size="sm" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">Upstream source systems</span>
              <div className="flex flex-wrap gap-1.5">
                {u.sources.length === 0 ? (
                  <Muted className="text-sm">—</Muted>
                ) : (
                  u.sources.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigate({ name: 'asset', id: s.id })}
                      className="rounded-md border border-border bg-surface-muted px-2 py-0.5 text-xs transition-colors hover:border-brand-500 hover:text-brand-600"
                    >
                      {s.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        {/* Metrics */}
        <Card.Root>
          <Card.Header>
            <Card.Title className="text-base">Metrics it exposes</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-2">
            {u.metrics.length === 0 ? (
              <Muted className="text-sm">No metrics defined yet.</Muted>
            ) : (
              u.metrics.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate({ name: 'metric', id: m.id })}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface p-2 text-left transition-colors hover:border-brand-500"
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{m.name}</span>
                    <LifecycleBadge lifecycle={m.lifecycle} />
                  </span>
                  {m.lifecycle !== 'governed-in-dbt' ? (
                    <Muted className="text-xs">Calculation only</Muted>
                  ) : m.value ? (
                    <span className="text-sm font-bold tabular-nums">{m.value}</span>
                  ) : (
                    <Muted className="text-xs">Not yet computed</Muted>
                  )}
                </button>
              ))
            )}
          </Card.Content>
        </Card.Root>
      </div>
    </div>
  );
}
