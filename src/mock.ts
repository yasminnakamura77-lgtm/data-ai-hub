// Mock domain data for the Data & AI Hub prototype. Stands in for what will
// later come from the FastAPI backend (business overlay in Postgres) + the dbt
// lineage harvest. v1 is a discovery/reuse tool for analyst-builders: the
// primary objects are DATA ASSETS (sources + dbt models) and AI APPLICATIONS,
// connected by usage + lineage. Curated METRICS are a growing layer on top.

export type Lifecycle = 'draft' | 'hub-certified' | 'governed-in-dbt';
export type Area = 'Sales' | 'Live' | 'Plant' | 'Supply Chain' | 'Shared';

export const AREAS: Area[] = ['Sales', 'Live', 'Plant', 'Supply Chain', 'Shared'];

export interface Readiness {
  raw: number;
  modeled: number;
  semantic: number;
} // each 0..1

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  draft: 'Draft',
  'hub-certified': 'Hub-certified',
  'governed-in-dbt': 'Governed in dbt',
};

// ── Data assets (the primary, populated object for builders) ─────────────────
export type AssetKind = 'source' | 'model';

export interface DataAsset {
  id: string;
  name: string;
  kind: AssetKind;
  area: Area;
  layerLabel: string; // 'Source system' | 'Staging model' | 'Intermediate model' | 'Mart model'
  readiness: Readiness;
  owner: string;
  description: string;
  tags: string[];
  upstream: string[]; // asset ids feeding this one
  usedByApps: string[]; // application ids
  feedsMetrics: string[]; // metric ids
  sql?: string;
}

export const dataAssets: DataAsset[] = [
  // Sources
  { id: 'sap_fico', name: 'SAP FI/CO', kind: 'source', area: 'Shared', layerLabel: 'Source system', readiness: { raw: 1, modeled: 1, semantic: 0.5 }, owner: 'Finance Systems', description: 'General-ledger cost postings — feed, labor and overhead cost centers.', tags: ['Finance'], upstream: [], usedByApps: [], feedsMetrics: [] },
  { id: 'sap_sd', name: 'SAP SD', kind: 'source', area: 'Sales', layerLabel: 'Source system', readiness: { raw: 1, modeled: 1, semantic: 0.5 }, owner: 'Commercial Systems', description: 'Sales & distribution — orders, deliveries, billing.', tags: ['Operational'], upstream: [], usedByApps: [], feedsMetrics: [] },
  { id: 'mtech', name: 'MTech', kind: 'source', area: 'Live', layerLabel: 'Source system', readiness: { raw: 1, modeled: 1, semantic: 0 }, owner: 'Live Ops IT', description: 'Hatchery/farm operational system — placements, production, mortality.', tags: ['Operational'], upstream: [], usedByApps: [], feedsMetrics: [] },
  { id: 'feedmill', name: 'Feed Mill System', kind: 'source', area: 'Live', layerLabel: 'Source system', readiness: { raw: 1, modeled: 0.5, semantic: 0 }, owner: 'Live Ops IT', description: 'Feed manufacturing + delivery tonnage and cost per ton.', tags: ['Operational'], upstream: [], usedByApps: [], feedsMetrics: [] },
  { id: 'stone', name: 'ST-One', kind: 'source', area: 'Plant', layerLabel: 'Source system', readiness: { raw: 1, modeled: 0.5, semantic: 0 }, owner: 'Plant Ops IT', description: 'Line-level OEE / downtime telemetry from processing plants.', tags: ['Operational'], upstream: [], usedByApps: [], feedsMetrics: [] },
  { id: 'blacksmith', name: 'Blacksmith', kind: 'source', area: 'Sales', layerLabel: 'Source system', readiness: { raw: 1, modeled: 0.5, semantic: 0 }, owner: 'Commercial Systems', description: 'Trade-promotion planning & spend.', tags: ['Operational'], upstream: [], usedByApps: [], feedsMetrics: [] },
  { id: 'mdm_cust', name: 'MDM Customer Master', kind: 'source', area: 'Shared', layerLabel: 'Source system', readiness: { raw: 1, modeled: 1, semantic: 1 }, owner: 'MDM Team', description: 'Governed master data for sold-to / ship-to customers.', tags: ['Reference', 'PII'], upstream: [], usedByApps: [], feedsMetrics: [] },

  // Models (dbt)
  { id: 'stg_gl', name: 'stg_sap__gl_costs', kind: 'model', area: 'Shared', layerLabel: 'Staging model', readiness: { raw: 1, modeled: 1, semantic: 1 }, owner: 'Data Eng', description: 'Typed + renamed GL cost lines, one row per posting.', tags: ['Finance'], upstream: ['sap_fico'], usedByApps: [], feedsMetrics: [], sql: "select gl_account, cost_center, posting_date, amount_usd\nfrom {{ source('sap','faglflexa') }}\nwhere ledger = '0L'" },
  { id: 'stg_prod', name: 'stg_mtech__production', kind: 'model', area: 'Live', layerLabel: 'Staging model', readiness: { raw: 1, modeled: 1, semantic: 0.5 }, owner: 'Data Eng', description: 'Daily dozens produced per house, cleaned.', tags: ['Operational'], upstream: ['mtech'], usedByApps: [], feedsMetrics: [], sql: "select house_id, production_date, dozens_produced\nfrom {{ source('mtech','daily_prod') }}" },
  { id: 'stg_feed', name: 'stg_feedmill__deliveries', kind: 'model', area: 'Live', layerLabel: 'Staging model', readiness: { raw: 1, modeled: 0.5, semantic: 0 }, owner: 'Data Eng', description: 'Feed tonnage + cost delivered per farm.', tags: ['Operational'], upstream: ['feedmill'], usedByApps: [], feedsMetrics: [], sql: "select farm_id, delivery_date, tons, cost_usd\nfrom {{ source('feedmill','deliveries') }}" },
  { id: 'stg_sd', name: 'stg_sap__sales', kind: 'model', area: 'Sales', layerLabel: 'Staging model', readiness: { raw: 1, modeled: 1, semantic: 0.5 }, owner: 'Data Eng', description: 'Cleaned sales order/billing lines.', tags: ['Operational'], upstream: ['sap_sd'], usedByApps: [], feedsMetrics: [], sql: "select billing_doc, sold_to, material, net_value_usd, billing_date\nfrom {{ source('sap','vbrk') }}" },
  { id: 'int_cost', name: 'int_live__cost_components', kind: 'model', area: 'Live', layerLabel: 'Intermediate model', readiness: { raw: 1, modeled: 1, semantic: 0.5 }, owner: 'Data Eng', description: 'Feed + labor + depreciation + overhead unioned to farm × month.', tags: ['Finance'], upstream: ['stg_gl', 'stg_feed'], usedByApps: [], feedsMetrics: [], sql: "select farm_id, month, feed_cost, labor_cost,\n       flock_depreciation, plant_overhead\nfrom feed full join labor using (farm_id, month)\n          full join overhead using (farm_id, month)" },
  { id: 'fct_egg', name: 'fct_live__egg_cost', kind: 'model', area: 'Live', layerLabel: 'Mart model', readiness: { raw: 1, modeled: 1, semantic: 1 }, owner: 'Data Eng', description: 'One row per farm × month with fully-loaded cost per dozen.', tags: ['Finance', 'Certified'], upstream: ['int_cost', 'stg_prod'], usedByApps: ['live-ct', 'sales-ct', 'plant-ct'], feedsMetrics: ['prod-egg-cost'], sql: "select farm_id, month,\n  (feed_cost + labor_cost + flock_depreciation + plant_overhead)\n   / nullif(dozens_produced, 0) as cost_per_dozen\nfrom {{ ref('int_live__cost_components') }}\njoin {{ ref('stg_mtech__production') }} using (farm_id, month)" },
  { id: 'dim_customer', name: 'dim_customer', kind: 'model', area: 'Shared', layerLabel: 'Mart model', readiness: { raw: 1, modeled: 1, semantic: 1 }, owner: 'Data Eng', description: 'Conformed customer dimension (sold-to grain).', tags: ['Reference', 'PII'], upstream: ['mdm_cust', 'stg_sd'], usedByApps: ['sales-ct', 'mdm'], feedsMetrics: ['customer-count'], sql: "select customer_code, customer_name, channel, region\nfrom {{ ref('stg_sap__sales') }}\njoin {{ source('mdm','customer') }} using (customer_code)" },
  { id: 'fct_sales', name: 'fct_sales', kind: 'model', area: 'Sales', layerLabel: 'Mart model', readiness: { raw: 1, modeled: 1, semantic: 1 }, owner: 'Data Eng', description: 'Net sales fact at billing-line grain, customer-conformed.', tags: ['Operational'], upstream: ['stg_sd', 'dim_customer'], usedByApps: ['sales-ct'], feedsMetrics: ['net-sales', 'promo-margin'], sql: "select b.billing_doc, c.customer_code,\n  b.net_value_usd - coalesce(d.deductions,0) as net_sales\nfrom {{ ref('stg_sap__sales') }} b\njoin {{ ref('dim_customer') }} c using (sold_to)" },
  { id: 'fct_oee', name: 'fct_plant__oee', kind: 'model', area: 'Plant', layerLabel: 'Mart model', readiness: { raw: 1, modeled: 1, semantic: 0.5 }, owner: 'Data Eng', description: 'Availability × performance × quality per line × shift.', tags: ['Operational'], upstream: ['stone'], usedByApps: ['plant-ct'], feedsMetrics: ['plant-oee'], sql: "select line_id, shift_date,\n  availability * performance * quality as oee\nfrom {{ ref('stg_stone__telemetry') }}" },
];

export const assetById = (id: string) => dataAssets.find((a) => a.id === id);
export const ALL_TAGS = ['Finance', 'Operational', 'Reference', 'PII', 'Certified'];

// ── Applications ─────────────────────────────────────────────────────────────
export type AppStage = 'Idea' | 'Prototype' | 'In handover' | 'In development' | 'Production';
export const APP_STAGES: AppStage[] = ['Idea', 'Prototype', 'In handover', 'In development', 'Production'];

export interface Application {
  id: string;
  name: string;
  area: Area;
  kind: 'Control Tower' | 'Platform';
  stage: AppStage;
  description: string;
  vision: string;
  sponsor: string;
  expectedValue: string;
  metricIds: string[];
}

export const applications: Application[] = [
  {
    id: 'live-ct', name: 'Live Control Tower', area: 'Live', kind: 'Control Tower', stage: 'In development',
    description: 'All-encompassing command center for the Live business — data, forecasts, dashboards, alerts and recommended corrective actions.',
    vision: 'Give every Live operator one place to see cost, performance and risk across hatcheries, farms and feed — with forecasts and recommended actions — so corrective decisions happen in hours, not weeks.',
    sponsor: 'VP Live Operations', expectedValue: 'Faster action on feed cost + livability; target 1–2% reduction in cost per dozen.',
    metricIds: ['prod-egg-cost', 'feed-conversion', 'livability'],
  },
  {
    id: 'sales-ct', name: 'Sales Control Tower', area: 'Sales', kind: 'Control Tower', stage: 'In development',
    description: 'Sales command center — demand, pricing and promo. Inherits cost from Live/Plant, so it sits over the other two towers.',
    vision: 'Put demand, price, promo and true cost-to-serve in one view for commercial teams, so pricing and promo decisions are made against a cost figure that reconciles with Live and Plant.',
    sponsor: 'VP Commercial', expectedValue: 'Better promo ROI + margin protection; fewer reconciliation disputes on cost.',
    metricIds: ['net-sales', 'promo-margin', 'prod-egg-cost'],
  },
  {
    id: 'plant-ct', name: 'Plant Control Tower', area: 'Plant', kind: 'Control Tower', stage: 'Prototype',
    description: 'Plant operations command center — throughput, yield, OEE and cost of production.',
    vision: 'Real-time line-level visibility of throughput, yield and OEE with downtime root-cause and recommended interventions, so plant managers cut loss before a shift ends.',
    sponsor: 'VP Plant Operations', expectedValue: 'OEE uplift + yield-loss reduction across processing lines.',
    metricIds: ['plant-oee', 'prod-egg-cost'],
  },
  {
    id: 'mdm', name: 'MDM Platform', area: 'Shared', kind: 'Platform', stage: 'Production',
    description: 'Master Data Management — the governed source of shared reference data every tower depends on.',
    vision: 'One governed source of truth for customers, materials and plants that every tower and metric trusts, so numbers agree no matter which app you open.',
    sponsor: 'Data Governance Lead', expectedValue: 'Eliminate reconciliation disputes caused by mismatched master data.',
    metricIds: ['customer-count'],
  },
];

// ── Metrics (curated layer — grows over time) ────────────────────────────────
export interface Metric {
  id: string;
  name: string;
  area: Area;
  lifecycle: Lifecycle;
  definition: string;
  calculation: string;
  owner: string;
  sme: string;
  unit?: string;
  updated: string;
  readiness: Readiness;
  sources: string[];
  usedBy: string[];
  value?: string;
  delta?: { trend: 'up' | 'down' | 'flat'; sentiment: 'good' | 'bad' | 'neutral'; text: string };
}

export const metrics: Metric[] = [
  { id: 'prod-egg-cost', name: 'Production Egg Cost', area: 'Live', lifecycle: 'governed-in-dbt', definition: 'Fully-loaded cost to produce one dozen eggs — feed, labor, flock depreciation and plant overhead. The cross-tower cost metric; Sales inherits this exact figure so numbers reconcile.', calculation: '(feed cost + labor cost + flock depreciation + plant overhead) ÷ dozens produced', owner: 'Dana Whitfield (Live Finance)', sme: 'Marcus Lee (Live data engineer)', unit: '$ / dozen', updated: '2 hours ago', readiness: { raw: 1, modeled: 1, semantic: 1 }, sources: ['SAP FI/CO', 'MTech', 'Feed Mill System'], usedBy: ['live-ct', 'sales-ct', 'plant-ct'], value: '$0.74', delta: { trend: 'down', sentiment: 'good', text: '-2.1% vs last month' } },
  { id: 'net-sales', name: 'Net Sales', area: 'Sales', lifecycle: 'governed-in-dbt', definition: 'Gross sales less returns, allowances and trade deductions.', calculation: 'gross sales − returns − allowances − trade deductions', owner: 'Sofia Ramos (Commercial Finance)', sme: 'Alex Kim (Sales data steward)', unit: '$', updated: '1 hour ago', readiness: { raw: 1, modeled: 1, semantic: 1 }, sources: ['SAP SD', 'Blacksmith'], usedBy: ['sales-ct'], value: '$48.2M', delta: { trend: 'up', sentiment: 'good', text: '+3.8% vs plan' } },
  { id: 'promo-margin', name: 'Promo Margin', area: 'Sales', lifecycle: 'hub-certified', definition: 'Contribution margin on promoted volume after promotional spend — the pricing/promo team’s working measure, curated in the Hub, not yet promoted to dbt.', calculation: '(promoted net sales − promoted COGS − promo spend) ÷ promoted net sales', owner: 'Sofia Ramos (Commercial Finance)', sme: 'Alex Kim (Sales data steward)', unit: '%', updated: '3 days ago', readiness: { raw: 1, modeled: 0.5, semantic: 0 }, sources: ['SAP SD', 'Blacksmith'], usedBy: ['sales-ct'], value: '11.6%', delta: { trend: 'down', sentiment: 'bad', text: '-1.4 pts vs last promo' } },
  { id: 'plant-oee', name: 'Plant OEE', area: 'Plant', lifecycle: 'governed-in-dbt', definition: 'Overall Equipment Effectiveness — availability × performance × quality on the processing line.', calculation: 'availability × performance × quality', owner: 'Ben Carter (Plant Ops)', sme: 'Wei Zhang (Plant data engineer)', unit: '%', updated: '4 hours ago', readiness: { raw: 1, modeled: 1, semantic: 0.5 }, sources: ['ST-One'], usedBy: ['plant-ct'], value: '78.3%', delta: { trend: 'up', sentiment: 'good', text: '+1.2 pts vs last week' } },
  { id: 'customer-count', name: 'Active Sold-to Customers', area: 'Shared', lifecycle: 'governed-in-dbt', definition: 'Distinct sold-to customers with at least one shipment in the trailing 90 days.', calculation: 'distinct count of sold-to customers with shipment in last 90 days', owner: 'Jordan Blake (MDM)', sme: 'Wei Zhang (Plant data engineer)', unit: 'count', updated: '12 hours ago', readiness: { raw: 1, modeled: 1, semantic: 1 }, sources: ['SAP SD', 'MDM'], usedBy: ['mdm', 'sales-ct'], value: '3,412', delta: { trend: 'up', sentiment: 'good', text: '+41 vs last month' } },
  { id: 'feed-conversion', name: 'Feed Conversion Ratio', area: 'Live', lifecycle: 'hub-certified', definition: 'Pounds of feed consumed per pound of body-weight gain across a flock cycle.', calculation: 'total feed consumed (lb) ÷ total weight gain (lb)', owner: 'Dana Whitfield (Live Finance)', sme: 'Marcus Lee (Live data engineer)', unit: 'ratio', updated: '5 hours ago', readiness: { raw: 1, modeled: 1, semantic: 0.5 }, sources: ['MTech', 'Feed Mill System'], usedBy: ['live-ct'], value: '1.82', delta: { trend: 'flat', sentiment: 'neutral', text: 'flat vs last week' } },
  { id: 'livability', name: 'Flock Livability', area: 'Live', lifecycle: 'draft', definition: 'Percentage of birds surviving to end of the production cycle. Draft — pending steward review.', calculation: '1 − (mortality count ÷ placed count)', owner: 'Priya Nair (Live Ops)', sme: 'Marcus Lee (Live data engineer)', unit: '%', updated: '6 days ago', readiness: { raw: 1, modeled: 0.5, semantic: 0 }, sources: ['MTech'], usedBy: ['live-ct'], value: '96.4%', delta: { trend: 'up', sentiment: 'good', text: '+0.3 pts vs last cycle' } },
];

export const metricById = (id: string) => metrics.find((m) => m.id === id);
export const appById = (id: string) => applications.find((a) => a.id === id);

// ── Glossary terms ───────────────────────────────────────────────────────────
export interface Term {
  id: string;
  name: string;
  area: Area;
  definition: string;
}

export const terms: Term[] = [
  { id: 'sold-to', name: 'Sold-to Customer', area: 'Shared', definition: 'The legal entity that places an order and is billed for it — the SAP sold-to party. Distinct from ship-to and payer.' },
  { id: 'dozen', name: 'Dozen', area: 'Live', definition: 'The standard selling unit for shell eggs — 12 eggs. All egg cost and volume metrics are per dozen.' },
  { id: 'trade-deduction', name: 'Trade Deduction', area: 'Sales', definition: 'Customer-claimed reductions to invoice value (promotions, shortages, price protection) netted against gross sales.' },
  { id: 'oee', name: 'OEE', area: 'Plant', definition: 'Overall Equipment Effectiveness — availability × performance × quality for a processing asset.' },
];

// ── Lineage graph (unified: sources → models → metric/app) ───────────────────
export type NodeKind = 'source' | 'model' | 'metric' | 'app';

export interface LinNode {
  id: string;
  label: string;
  sub?: string;
  kind: NodeKind;
  layer: number;
  readiness?: Readiness;
  desc?: string;
  sql?: string;
}
export interface LinEdge {
  from: string;
  to: string;
}
export interface Lineage {
  nodes: LinNode[];
  edges: LinEdge[];
  focusId: string;
}

interface RNode {
  id: string;
  label: string;
  sub?: string;
  kind: NodeKind;
  readiness?: Readiness;
  desc?: string;
  sql?: string;
}

function buildRegistry() {
  const nodes: Record<string, RNode> = {};
  const fwd: Record<string, string[]> = {};
  const rev: Record<string, string[]> = {};
  const add = (n: RNode) => {
    nodes[n.id] = n;
    fwd[n.id] ??= [];
    rev[n.id] ??= [];
  };
  const link = (from: string, to: string) => {
    (fwd[from] ??= []).push(to);
    (rev[to] ??= []).push(from);
  };

  dataAssets.forEach((a) =>
    add({ id: a.id, label: a.name, sub: a.layerLabel, kind: a.kind, readiness: a.readiness, desc: a.description, sql: a.sql }),
  );
  metrics.forEach((m) => add({ id: `m:${m.id}`, label: m.name, sub: 'metric', kind: 'metric', readiness: m.readiness, desc: m.definition }));
  applications.forEach((a) => add({ id: `a:${a.id}`, label: a.name, sub: a.kind, kind: 'app', desc: a.description }));

  dataAssets.forEach((a) => {
    a.upstream.forEach((u) => link(u, a.id));
    a.feedsMetrics.forEach((mid) => link(a.id, `m:${mid}`));
    a.usedByApps.forEach((aid) => link(a.id, `a:${aid}`));
  });
  return { nodes, fwd, rev };
}

function longestLayers(nodes: Record<string, RNode>, fwd: Record<string, string[]>) {
  const indeg: Record<string, number> = {};
  Object.keys(nodes).forEach((id) => (indeg[id] = 0));
  Object.values(fwd).flat().forEach((t) => (indeg[t] = (indeg[t] ?? 0) + 1));
  const layer: Record<string, number> = {};
  const q = Object.keys(nodes).filter((id) => (indeg[id] ?? 0) === 0);
  q.forEach((id) => (layer[id] = 0));
  const dq = { ...indeg };
  while (q.length) {
    const u = q.shift()!;
    for (const v of fwd[u] ?? []) {
      layer[v] = Math.max(layer[v] ?? 0, (layer[u] ?? 0) + 1);
      if (--dq[v] === 0) q.push(v);
    }
  }
  return layer;
}

function walk(start: string, adj: Record<string, string[]>) {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const u = stack.pop()!;
    for (const v of adj[u] ?? []) if (!seen.has(v)) { seen.add(v); stack.push(v); }
  }
  return seen;
}

/** Focused lineage around any node — a bare data-asset id, or a metric id. */
export function focusLineage(rawId: string): Lineage {
  const { nodes, fwd, rev } = buildRegistry();
  const id = nodes[rawId] ? rawId : nodes[`m:${rawId}`] ? `m:${rawId}` : nodes[`a:${rawId}`] ? `a:${rawId}` : rawId;
  if (!nodes[id]) return { nodes: [], edges: [], focusId: id };
  const layers = longestLayers(nodes, fwd);
  const keep = new Set<string>([id, ...walk(id, rev), ...walk(id, fwd)]);
  const minLayer = Math.min(...[...keep].map((k) => layers[k] ?? 0));
  const linNodes: LinNode[] = [...keep].map((k) => ({ ...nodes[k], layer: (layers[k] ?? 0) - minLayer }));
  const edges: LinEdge[] = [];
  keep.forEach((u) => (fwd[u] ?? []).forEach((v) => keep.has(v) && edges.push({ from: u, to: v })));
  return { nodes: linNodes, edges, focusId: id };
}

/** "How it's used" for a data asset: direct consumers + producers. */
export function assetUsage(id: string) {
  const downstreamAssets = dataAssets.filter((a) => a.upstream.includes(id));
  const self = assetById(id);
  return {
    upstream: (self?.upstream ?? []).map(assetById).filter(Boolean) as DataAsset[],
    downstreamAssets,
    apps: (self?.usedByApps ?? []).map(appById).filter(Boolean) as Application[],
    metrics: (self?.feedsMetrics ?? []).map(metricById).filter(Boolean) as Metric[],
  };
}

/** What an AI application draws on: the data assets it uses directly, the
 *  transitive upstream source systems behind them, and its metrics. */
export function appUsage(appId: string) {
  const direct = dataAssets.filter((a) => a.usedByApps.includes(appId));
  const seen = new Set<string>();
  const sources: DataAsset[] = [];
  const visit = (id: string) => {
    const a = assetById(id);
    if (!a) return;
    a.upstream.forEach((u) => {
      if (seen.has(u)) return;
      seen.add(u);
      const ua = assetById(u);
      if (ua?.kind === 'source') sources.push(ua);
      visit(u);
    });
  };
  direct.forEach((d) => visit(d.id));
  const app = appById(appId);
  const metricList = (app?.metricIds ?? []).map(metricById).filter(Boolean) as Metric[];
  return { direct, sources, metrics: metricList };
}
