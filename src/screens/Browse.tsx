import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from 'lucide-react';

import {
  Badge,
  Button,
  H1,
  Input,
  Muted,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pilgrims/ui';

import { fetchDataSources, fetchMetrics, isRealMetricId, type RealMetric, type RealSource } from '../api';
import type { Navigate, View } from '../App';
import {
  type Application,
  APP_STAGES,
  applications,
  type Area,
  AREAS,
  LIFECYCLE_LABEL,
  type Metric,
  metrics,
  type Term,
  terms,
} from '../mock';
import { AreaChip, LifecycleBadge, ReadinessRing, readinessPct } from '../ui';

export type BrowseKind = 'sources' | 'metrics' | 'apps' | 'terms';

const TITLE: Record<BrowseKind, string> = {
  sources: 'Data sources',
  metrics: 'Metrics',
  apps: 'AI applications',
  terms: 'Business terms',
};

const PAGE_SIZE = 12;

interface Col {
  key: string;
  label: string;
  render: (r: any) => ReactNode;
  sort?: (r: any) => string | number;
  className?: string;
}

export function Browse({ kind, navigate }: { kind: BrowseKind; navigate: Navigate }) {
  const [q, setQ] = useState('');
  const [area, setArea] = useState<Area | 'All'>('All');
  const [facet, setFacet] = useState('All');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);
  const [sources, setSources] = useState<RealSource[] | null>(null);
  const [realMetrics, setRealMetrics] = useState<RealMetric[] | null>(null);

  useEffect(() => {
    if (kind === 'sources') fetchDataSources().then(setSources).catch(() => setSources([]));
    if (kind === 'metrics') fetchMetrics().then(setRealMetrics).catch(() => setRealMetrics([]));
  }, [kind]);
  useEffect(() => setPage(0), [q, area, facet, kind]);

  const loading = (kind === 'sources' && sources === null) || (kind === 'metrics' && realMetrics === null);

  // ── rows, columns, facet, search fields, row navigation — per kind ──
  let rows: any[] = [];
  let cols: Col[] = [];
  let facetLabel = '';
  let facetOptions: string[] = [];
  let facetTest: (r: any) => string = () => '';
  let searchFields: (r: any) => string[] = () => [];
  let rowNav: ((r: any) => View) | null = null;

  if (kind === 'sources') {
    rows = sources ?? [];
    cols = [
      { key: 'name', label: 'Name', render: (r) => <span className="font-medium break-all">{r.name}</span>, sort: (r) => r.name },
      { key: 'area', label: 'Area', render: (r) => <AreaChip area={r.area as Area} />, sort: (r) => r.area },
      { key: 'readiness', label: 'Readiness', render: (r) => <ReadinessRing r={r.readiness} size="sm" />, sort: (r) => readinessPct(r.readiness) },
      { key: 'cert', label: 'Certification', render: (r) => (r.tags[0] ? <Badge variant="outline">{r.tags[0]}</Badge> : <Muted className="text-xs">—</Muted>), sort: (r) => r.tags[0] ?? '' },
      { key: 'mapped', label: 'dbt models', render: (r) => <span className="tabular-nums">{r.mappedCount || '—'}</span>, sort: (r) => r.mappedCount, className: 'text-right' },
      { key: 'owner', label: 'Owner', render: (r) => <span className="text-sm text-muted-foreground">{r.owner}</span>, sort: (r) => r.owner },
    ];
    facetLabel = 'Certification';
    facetOptions = ['All', 'Certified', 'In review', 'Draft', 'Deprecated'];
    facetTest = (r) => r.tags[0] ?? '';
    searchFields = (r) => [r.name, r.description, ...r.tags];
    rowNav = (r) => ({ name: 'asset', id: r.id });
  } else if (kind === 'metrics') {
    rows = [...(realMetrics ?? []), ...(metrics as Metric[])];
    cols = [
      {
        key: 'name',
        label: 'Name',
        render: (r) => (
          <span className="flex items-center gap-1.5">
            <span className="font-medium">{r.name}</span>
            {!isRealMetricId(r.id) && <Badge variant="outline">Sample</Badge>}
          </span>
        ),
        sort: (r) => r.name,
      },
      { key: 'area', label: 'Area', render: (r) => <AreaChip area={r.area} />, sort: (r) => r.area },
      { key: 'lifecycle', label: 'Lifecycle', render: (r) => <LifecycleBadge lifecycle={r.lifecycle} />, sort: (r) => r.lifecycle },
      {
        key: 'value',
        label: 'Value',
        render: (r) =>
          r.lifecycle !== 'governed-in-dbt' ? (
            <Muted className="text-xs">Calculation only</Muted>
          ) : r.value ? (
            <span className="font-semibold tabular-nums">{r.value}</span>
          ) : (
            <Muted className="text-xs">Not yet computed</Muted>
          ),
        sort: (r) => (r.lifecycle === 'governed-in-dbt' ? r.value ?? '' : ''),
        className: 'text-right',
      },
      { key: 'updated', label: 'Updated', render: (r) => <span className="text-sm text-muted-foreground">{r.updated}</span>, sort: (r) => r.updated },
    ];
    facetLabel = 'Lifecycle';
    facetOptions = ['All', ...Object.values(LIFECYCLE_LABEL)];
    facetTest = (r) => LIFECYCLE_LABEL[r.lifecycle as keyof typeof LIFECYCLE_LABEL];
    searchFields = (r) => [r.name, r.definition];
    rowNav = (r) => ({ name: 'metric', id: r.id });
  } else if (kind === 'apps') {
    rows = applications as Application[];
    cols = [
      { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span>, sort: (r) => r.name },
      { key: 'area', label: 'Area', render: (r) => <AreaChip area={r.area} />, sort: (r) => r.area },
      { key: 'kind', label: 'Type', render: (r) => <Badge variant="secondary">{r.kind}</Badge>, sort: (r) => r.kind },
      { key: 'stage', label: 'Stage', render: (r) => <span className="text-sm">{r.stage}</span>, sort: (r) => APP_STAGES.indexOf(r.stage) },
      { key: 'metrics', label: 'Metrics', render: (r) => <span className="tabular-nums">{r.metricIds.length}</span>, sort: (r) => r.metricIds.length, className: 'text-right' },
    ];
    facetLabel = 'Stage';
    facetOptions = ['All', ...APP_STAGES];
    facetTest = (r) => r.stage;
    searchFields = (r) => [r.name, r.description];
    rowNav = (r) => ({ name: 'app', id: r.id });
  } else {
    rows = terms as Term[];
    cols = [
      { key: 'name', label: 'Term', render: (r) => <span className="font-medium">{r.name}</span>, sort: (r) => r.name },
      { key: 'area', label: 'Area', render: (r) => <AreaChip area={r.area} />, sort: (r) => r.area },
      { key: 'definition', label: 'Definition', render: (r) => <span className="text-sm text-muted-foreground">{r.definition}</span> },
    ];
    facetLabel = '';
    searchFields = (r) => [r.name, r.definition];
    rowNav = null;
  }

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    let out = rows.filter((r) => area === 'All' || r.area === area);
    if (facetLabel && facet !== 'All') out = out.filter((r) => facetTest(r) === facet);
    if (query) out = out.filter((r) => searchFields(r).some((s) => (s || '').toLowerCase().includes(query)));
    const col = cols.find((c) => c.key === sortKey);
    if (col?.sort) {
      out = [...out].sort((a, b) => {
        const av = col.sort!(a);
        const bv = col.sort!(b);
        return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, area, facet, query, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button onClick={() => navigate({ name: 'landing' })} className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Hub
        </button>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{TITLE[kind]}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <H1 className="text-2xl">{TITLE[kind]}</H1>
          <Muted className="text-sm">
            {filtered.length} of {rows.length}
            {kind === 'sources' ? ' · live from portfolio.db' : kind === 'metrics' ? '' : ' · sample data'}
          </Muted>
        </div>
        {kind === 'sources' && (
          <Button variant="outline" size="sm" onClick={() => navigate({ name: 'request-source' })}>
            Can&apos;t find what you need? Request it
          </Button>
        )}
        {kind === 'metrics' && (
          <Button variant="outline" size="sm" onClick={() => navigate({ name: 'metric-new' })}>
            Add a metric
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${TITLE[kind].toLowerCase()}…`} className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Muted className="mr-1 text-xs">Area</Muted>
            {(['All', ...AREAS] as (Area | 'All')[]).map((a) => (
              <Button key={a} size="sm" variant={a === area ? 'default' : 'outline'} onClick={() => setArea(a)}>
                {a}
              </Button>
            ))}
          </div>
          {facetLabel && (
            <div className="flex items-center gap-2">
              <Muted className="text-xs">{facetLabel}</Muted>
              <select
                value={facet}
                onChange={(e) => setFacet(e.target.value)}
                className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
              >
                {facetOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Muted>Loading…</Muted>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {cols.map((c) => (
                  <TableHead key={c.key} className={c.className}>
                    {c.sort ? (
                      <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                        {c.label}
                        {sortKey === c.key ? (
                          sortDir === 1 ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
                        ) : null}
                      </button>
                    ) : (
                      c.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r, i) => (
                <TableRow
                  key={r.id ?? i}
                  onClick={rowNav ? () => navigate(rowNav!(r)) : undefined}
                  className={rowNav ? 'cursor-pointer' : ''}
                >
                  {cols.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.render(r)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={cols.length}>
                    <Muted className="text-sm">Nothing matches your filters.</Muted>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Muted>
            Page {page + 1} of {pageCount}
          </Muted>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
