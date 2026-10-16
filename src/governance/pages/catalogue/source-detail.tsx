import { AlertTriangle, ArrowLeft, Bot, BookOpen, CheckCircle2, GitBranch, Workflow } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';

import { useJson } from '@/governance/lib/use-json';
import { Badge, Button, Card, ErrorMessage, H1, Modal, Muted, ReportGrid, Skeleton } from '@/governance/ui';
import { AiApplicationsModal } from './ai-applications-modal';
import { AskAiPanel } from './ask-ai-panel';
import { ClassificationBadge, environmentLabel, readinessLabel, StatusDot, statusLabel, TagPill } from './badges';
import { ContactCard } from './contact-card';
import { DataImpactCard } from './data-impact-card';
import { DeploymentStatusCard } from './deployment-status-card';
import { FreshnessCard } from './freshness-card';
import { GlossaryModal } from './glossary-modal';
import { LineageModal } from './lineage-modal';
import { ReadinessStagesDetail } from './readiness-stages';
import { ReportIssueModal } from './report-issue-modal';
import { SimilarDataCard } from './similar-data-card';
import type { SourceDetail as SourceDetailData } from './types';

const EYEBROW = 'text-xs font-semibold tracking-wide text-muted-foreground uppercase';

/** Row of "label ....... value" used across the detail cards. */
function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/** Placeholder for "View details" — the linked report isn't built yet. */
function ComingSoonModal({ open, onClose, title, note }: { open: boolean; onClose: () => void; title: string; note: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <Muted>{note}</Muted>
    </Modal>
  );
}

/** Slow-shifting accent strip — a small sign the page is alive, not a screenshot. */
function AmbientBar() {
  return (
    <>
      <style>{`
        @keyframes catalogue-ambient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
      <div
        aria-hidden
        className="mb-4 h-1 w-full rounded-full bg-gradient-to-r from-brand-navy via-brand-red to-brand-navy bg-[length:200%_100%]"
        style={{ animation: 'catalogue-ambient-shift 6s ease-in-out infinite' }}
      />
    </>
  );
}

export function SourceDetail({ sourceId, onBack }: { sourceId: string; onBack: () => void }) {
  const { data: source, status, error } = useJson<SourceDetailData>(`/api/catalogue/sources/${sourceId}`);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [aiAppsOpen, setAiAppsOpen] = useState(false);
  const [lineageOpen, setLineageOpen] = useState(false);
  const [comingSoon, setComingSoon] = useState<{ title: string; note: string } | null>(null);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-3">
        <ArrowLeft className="size-4" />
        Catalogue
      </Button>

      {status === 'initial' && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="mt-4 h-64 w-full" />
        </div>
      )}

      {status === 'error' && (
        <Card.Root className="p-4">
          <ErrorMessage message="Couldn't load this source." detail={error instanceof Error ? error.message : undefined} />
        </Card.Root>
      )}

      {source && (
        <>
          <AmbientBar />

          <div className="mb-4 flex flex-col gap-3">
            <div>
              <H1 className="font-mono text-2xl">{source.code}</H1>
              <Muted>{source.description}</Muted>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <StatusDot label={statusLabel(source.status)} />
              <StatusDot label={environmentLabel(source.environment)} />
              <StatusDot label={readinessLabel(source.readiness)} />
            </div>

            <Muted className="text-xs">
              {source.domain} · {source.system}
            </Muted>

            <div className="flex flex-wrap gap-1.5">
              {source.tags.map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
            </div>
          </div>

          <ContactCard onAskAi={() => setAskAiOpen(true)} onReportIssue={() => setReportOpen(true)} />

          <DeploymentStatusCard
            pipelineHealth={source.ownership.pipelineHealth}
            lastDeployment={source.ownership.lastDeployment}
            schemaChange={source.ownership.schemaChange}
          />

          <DataImpactCard impact={source.impact} />

          <div className="mb-4">
            <span className={EYEBROW}>Related</span>
            <ReportGrid columns={4} className="mt-2">
              <RelatedCard
                icon={<Workflow className="size-4" />}
                title="Pipeline"
                value={`${source.related.pipeline.readyPct}%`}
                caption={source.related.pipeline.label}
                onOpen={() =>
                  setComingSoon({
                    title: 'Pipeline',
                    note: 'Would open the pipeline that feeds this source — runs, schedule, upstream/downstream steps.',
                  })
                }
              />
              <RelatedCard
                icon={<BookOpen className="size-4" />}
                title="Glossary"
                value={String(source.related.glossary.termCount)}
                caption={`term${source.related.glossary.termCount === 1 ? '' : 's'}`}
                onOpen={() => setGlossaryOpen(true)}
              />
              <RelatedCard
                icon={<Bot className="size-4" />}
                title="AI Applications"
                value={String(source.related.aiApplications.count)}
                caption={`app${source.related.aiApplications.count === 1 ? '' : 's'}`}
                onOpen={() => setAiAppsOpen(true)}
              />
              <RelatedCard
                icon={<GitBranch className="size-4" />}
                title="Lineage"
                value={String(source.related.lineage.upstreamCount)}
                caption={`upstream · ${source.related.lineage.downstreamCount} downstream`}
                onOpen={() => setLineageOpen(true)}
              />
            </ReportGrid>
          </div>

          <ReportGrid columns={2} className="mb-4">
            <Card.Root>
              <Card.Header>
                <span className={EYEBROW}>Data quality</span>
              </Card.Header>
              <Card.Content className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">{source.dataQuality.score}%</span>
                  <Badge variant={source.dataQuality.score >= 90 ? 'success' : 'warning'}>
                    {source.dataQuality.label}
                  </Badge>
                </div>

                <div className="flex flex-col">
                  {source.dataQuality.metrics.map((metric) => (
                    <FieldRow key={metric.label} label={metric.label} value={`${metric.value}%`} />
                  ))}
                </div>

                <div className="flex flex-col gap-1 border-t border-border pt-2 text-sm">
                  <span className="flex items-center gap-1.5 text-success">
                    <CheckCircle2 className="size-4" /> {source.dataQuality.checksPassed} checks passed
                  </span>
                  {source.dataQuality.warnings > 0 && (
                    <span className="flex items-center gap-1.5 text-warning-foreground">
                      <AlertTriangle className="size-4" /> {source.dataQuality.warnings} warning
                      {source.dataQuality.warnings === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </Card.Content>
              <Card.Footer>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setComingSoon({
                      title: 'Data quality details',
                      note: 'Would open the full quality report for this source — check history, failing rows, rule definitions.',
                    })
                  }
                >
                  View details
                </Button>
              </Card.Footer>
            </Card.Root>

            <Card.Root>
              <Card.Header>
                <span className={EYEBROW}>Trust & governance</span>
              </Card.Header>
              <Card.Content className="flex flex-col gap-3">
                <ReadinessStagesDetail r={source.dataReadiness} />

                <div className="flex flex-col border-t border-border pt-2">
                  <StatusDot label={source.governance.status} className="mb-1 text-base font-medium" />
                  <FieldRow label="Classification" value={<ClassificationBadge classification={source.governance.classification} />} />
                  <FieldRow label="Data Owner" value={source.governance.dataOwner} />
                  <FieldRow label="Access" value={source.governance.access} />
                  <FieldRow label="Retention" value={source.governance.retention} />
                </div>

                <div className="flex items-center gap-1.5 border-t border-border pt-2 text-sm text-success">
                  <CheckCircle2 className="size-4" />
                  {source.governance.controlsComplete}/{source.governance.controlsTotal} controls complete
                </div>
              </Card.Content>
              <Card.Footer>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setComingSoon({
                      title: 'Trust & governance details',
                      note: 'Would open the full governance record — policy links, approval history, control evidence.',
                    })
                  }
                >
                  View details
                </Button>
              </Card.Footer>
            </Card.Root>
          </ReportGrid>

          <FreshnessCard freshness={source.freshness} />

          <SimilarDataCard items={source.similarData} />

          <Card.Root className="mb-4">
            <Card.Header>
              <span className={EYEBROW}>Developer & technical ownership</span>
            </Card.Header>
            <Card.Content className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <div className="font-medium">{source.ownership.technicalOwner}</div>
                  <Muted className="text-xs">{source.ownership.role}</Muted>
                </div>
                <div className="text-sm">{source.ownership.team}</div>
                <div className="text-sm">{source.ownership.domain}</div>
              </div>

              <div className="border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">Open issues:</span>{' '}
                <span className="font-medium">{source.ownership.openIssues}</span>
              </div>

              <Muted className="border-t border-border pt-3 text-xs">
                Responsibilities: {source.ownership.responsibilities.join(' · ')}
              </Muted>
            </Card.Content>
            <Card.Footer>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setComingSoon({
                    title: 'Developer details',
                    note: 'Would open the technical owner\u2019s full profile — deployment history, on-call rotation, related sources.',
                  })
                }
              >
                View developer details
              </Button>
            </Card.Footer>
          </Card.Root>

          <AskAiPanel source={source} open={askAiOpen} onClose={() => setAskAiOpen(false)} />
          <ReportIssueModal source={source} open={reportOpen} onClose={() => setReportOpen(false)} />
          <GlossaryModal open={glossaryOpen} onClose={() => setGlossaryOpen(false)} terms={source.glossaryTerms} />
          <AiApplicationsModal open={aiAppsOpen} onClose={() => setAiAppsOpen(false)} apps={source.aiApplications} />
          <LineageModal
            open={lineageOpen}
            onClose={() => setLineageOpen(false)}
            sourceCode={source.code}
            upstream={source.upstream}
            downstream={source.impact}
          />
          {comingSoon && (
            <ComingSoonModal
              open
              onClose={() => setComingSoon(null)}
              title={comingSoon.title}
              note={comingSoon.note}
            />
          )}
        </>
      )}
    </main>
  );
}

function RelatedCard({
  icon,
  title,
  value,
  caption,
  onOpen,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  caption: string;
  onOpen: () => void;
}) {
  return (
    <Card.Root className="transition-shadow hover:shadow-md">
      <Card.Content className="flex flex-col gap-2 pt-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Card.Icon>{icon}</Card.Icon>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="text-sm">
          <span className="font-semibold">{value}</span> <span className="text-muted-foreground">{caption}</span>
        </div>
        <Button variant="link" size="sm" className="h-auto justify-start px-0" onClick={onOpen}>
          Open →
        </Button>
      </Card.Content>
    </Card.Root>
  );
}
