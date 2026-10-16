/** Mirrors the shapes returned by app/backend/catalogue.py. Mock data end to end. */

export type SourceStatus = 'active' | 'inactive';
export type Environment = 'production' | 'staging' | 'development';
export type Readiness = 'ready' | 'pending' | 'blocked';
export type Classification = 'Public' | 'Internal' | 'Confidential' | 'Restricted';

export interface SourceSummary {
  id: string;
  code: string;
  description: string;
  status: SourceStatus;
  environment: Environment;
  readiness: Readiness;
  domain: string;
  system: string;
  tags: string[];
  developer: string;
  lastUpdated: string;
  classification: Classification;
}

export interface QualityMetric {
  label: string;
  value: number;
}

export interface DataQuality {
  score: number;
  label: string;
  metrics: QualityMetric[];
  checksPassed: number;
  warnings: number;
}

export interface Governance {
  status: string;
  classification: Classification;
  dataOwner: string;
  access: string;
  retention: string;
  controlsComplete: number;
  controlsTotal: number;
}

export interface Ownership {
  technicalOwner: string;
  role: string;
  team: string;
  domain: string;
  lastDeployment: string;
  schemaChange: string;
  openIssues: number;
  pipelineHealth: string;
  responsibilities: string[];
}

export interface RelatedInfo {
  pipeline: { readyPct: number; label: string };
  glossary: { termCount: number };
  aiApplications: { count: number };
  lineage: { upstreamCount: number; downstreamCount: number };
}

export type ImpactSeverity = 'high' | 'medium' | 'low';
export type ImpactType = 'dashboard' | 'pipeline' | 'ai-asset' | 'source';

export interface ImpactItem {
  name: string;
  type: ImpactType;
  severity: ImpactSeverity;
  note: string;
}

/** Raw in Snowflake → Data Modeled → Semantic Layer, each 0..1. Distinct from `Readiness` above (the ready/pending/blocked status dot). */
export interface ReadinessStages {
  raw: number;
  modeled: number;
  semantic: number;
}

export interface Freshness {
  lastUpdatedLabel: string;
  expected: string;
  onTime: boolean;
  nextRefreshLabel: string;
}

export interface GlossaryTerm {
  id: string;
  name: string;
  definition: string;
  usedBy: string[];
}

export interface AiApplication {
  name: string;
  stage: string;
}

export type Similarity = 'High similarity' | 'Related';

export interface SimilarSource {
  name: string;
  similarity: Similarity;
  sharedAttributes: string[];
}

export interface SourceDetail extends SourceSummary {
  dataQuality: DataQuality;
  dataReadiness: ReadinessStages;
  freshness: Freshness;
  governance: Governance;
  ownership: Ownership;
  related: RelatedInfo;
  glossaryTerms: GlossaryTerm[];
  aiApplications: AiApplication[];
  similarData: SimilarSource[];
  impact: ImpactItem[];
  upstream: string[];
}
