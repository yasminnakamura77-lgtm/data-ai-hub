// Fetch layer for the thin dev API (dev-api/serve.py, proxied at /api).
// Real data from the Flask app's portfolio.db: catalogue sources + dbt lineage.
// Metrics / applications / terms remain mock (src/mock.ts) — nothing real to
// pull for those yet.

export interface Readiness {
  raw: number;
  modeled: number;
  semantic: number;
}

export interface RealSource {
  id: string; // "di-<n>"
  name: string;
  kind: 'source';
  area: string;
  layerLabel: string;
  readiness: Readiness;
  owner: string;
  description: string;
  tags: string[];
  lifecycle: string;
  mappedCount: number;
  mappedNodes?: { unique_id: string; name: string; schema: string; confidence: number }[];
}

export interface RealLinNode {
  id: string;
  label: string;
  sub?: string;
  kind: 'source' | 'model' | 'metric' | 'app';
  layer: number;
  readiness?: Readiness;
  desc?: string;
  sql?: string;
}

export interface RealLineage {
  nodes: RealLinNode[];
  edges: { from: string; to: string }[];
  focusId: string;
  unmapped?: boolean;
  truncated?: boolean;
}

/** Real data ids from the backend are prefixed `di-` (data_integration). */
export const isRealId = (id: string) => id.startsWith('di-');
const numId = (id: string) => id.replace('di-', '');

export interface RealMetric {
  id: string; // "hm-<n>"
  name: string;
  area: string;
  lifecycle: 'draft' | 'hub-certified';
  definition: string;
  calculation: string;
  owner: string;
  sme: string;
  unit?: string | null;
  value?: string | null;
  sources: string[];
  updated: string;
}

/** Real, Hub-authored metric ids are prefixed `hm-` (hub_metrics). */
export const isRealMetricId = (id: string) => id.startsWith('hm-');
const numMetricId = (id: string) => id.replace('hm-', '');

export interface MetricPayload {
  name: string;
  area: string;
  definition: string;
  calculation: string;
  owner: string;
  sme: string;
  unit?: string;
  sources: string[];
  lifecycle?: 'draft' | 'hub-certified';
  updatedBy?: string;
}

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export const fetchDataSources = () => getJSON<RealSource[]>('/api/data-sources');
export const fetchDataSource = (id: string) => getJSON<RealSource>(`/api/data-sources/${numId(id)}`);
export const fetchLineage = (id: string) => getJSON<RealLineage>(`/api/lineage?source_id=${numId(id)}`);

export const fetchMetrics = () => getJSON<RealMetric[]>('/api/metrics');
export const fetchMetric = (id: string) => getJSON<RealMetric>(`/api/metrics/${numMetricId(id)}`);

export async function createMetric(payload: MetricPayload): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const r = await fetch('/api/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await r.json();
  if (r.ok) return { ok: true, id: body.id };
  return { ok: false, error: body.error || 'Something went wrong.' };
}

export async function updateMetric(
  id: string,
  payload: Partial<MetricPayload>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await fetch(`/api/metrics/${numMetricId(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await r.json();
  if (r.ok) return { ok: true };
  return { ok: false, error: body.error || 'Something went wrong.' };
}

export interface RequestPayload {
  source: string;
  area: string;
  content: string;
  justification: string;
  targetQuarter?: string;
  requestedBy: string;
}

export type RequestResult =
  | { ok: true; id: number }
  | { ok: false; duplicate: true; id: number }
  | { ok: false; duplicate: false; error: string };

export async function submitDataSourceRequest(payload: RequestPayload): Promise<RequestResult> {
  const r = await fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: payload.source,
      business_vertical: payload.area,
      content: payload.content,
      business_justification: payload.justification,
      target_quarter: payload.targetQuarter ?? '',
      requested_by: payload.requestedBy,
    }),
  });
  const body = await r.json();
  if (r.ok) return { ok: true, id: body.id };
  if (body.error === 'duplicate') return { ok: false, duplicate: true, id: body.id };
  return { ok: false, duplicate: false, error: body.error || 'Something went wrong.' };
}
