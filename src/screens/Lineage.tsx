import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  type NodeProps,
  Position,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, ChevronRight, ExternalLink } from 'lucide-react';

import { Button, H1, Muted, Text } from '@pilgrims/ui';

import { fetchLineage, isRealId, type RealLineage } from '../api';
import type { Navigate } from '../App';
import { appById, assetById, focusLineage, type LinNode, metricById } from '../mock';
import { ReadinessBar } from '../ui';

const KIND_STYLE: Record<LinNode['kind'], { box: string; chip: string; label: string }> = {
  source: { box: 'border-brand-navy/40 bg-brand-navy/5', chip: 'bg-brand-navy/10 text-brand-navy', label: 'Source' },
  model: { box: 'border-info/40 bg-info/5', chip: 'bg-info/10 text-info', label: 'Model' },
  metric: { box: 'border-success/50 bg-success/10', chip: 'bg-success/15 text-success', label: 'Metric' },
  app: { box: 'border-brand-red/40 bg-brand-red/5', chip: 'bg-brand-red/10 text-brand-red', label: 'AI App' },
};

function PillNode(props: NodeProps) {
  const data = props.data as unknown as LinNode & { isFocus?: boolean };
  const s = KIND_STYLE[data.kind];
  return (
    <div
      className={`w-52 rounded-lg border px-3 py-2 shadow-sm ${s.box} ${
        props.selected ? 'ring-2 ring-brand-500' : data.isFocus ? 'ring-2 ring-brand-navy' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-border" />
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${s.chip}`}>{s.label}</span>
        {data.readiness && <ReadinessBar r={data.readiness} />}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-foreground" title={data.label}>
        {data.label}
      </div>
      {data.sub && <div className="truncate text-xs text-muted-foreground">{data.sub}</div>}
      <Handle type="source" position={Position.Right} className="!bg-border" />
    </div>
  );
}

export function Lineage({ id, navigate }: { id: string; navigate: Navigate }) {
  const nodeTypes = useMemo(() => ({ pill: PillNode }), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Real lineage (from the dev API) for `di-` ids; mock focusLineage otherwise.
  const [realLin, setRealLin] = useState<RealLineage | null>(null);
  useEffect(() => {
    if (!isRealId(id)) {
      setRealLin(null);
      return;
    }
    let ok = true;
    fetchLineage(id)
      .then((l) => ok && setRealLin(l))
      .catch(() => ok && setRealLin({ nodes: [], edges: [], focusId: id }));
    return () => {
      ok = false;
    };
  }, [id]);
  const mockLin = useMemo(() => (isRealId(id) ? { nodes: [], edges: [], focusId: id } : focusLineage(id)), [id]);
  const lin = (isRealId(id) ? (realLin ?? { nodes: [], edges: [], focusId: id }) : mockLin) as {
    nodes: LinNode[];
    edges: { from: string; to: string }[];
    focusId: string;
    unmapped?: boolean;
  };
  const loadingReal = isRealId(id) && realLin === null;

  const metric = metricById(id);
  const asset = assetById(id);
  const app = appById(id);
  const focusNode = lin.nodes.find((n) => n.id === lin.focusId);
  const title = focusNode?.label ?? 'Lineage';

  const { rfNodes, rfEdges } = useMemo(() => {
    const byLayer: Record<number, LinNode[]> = {};
    lin.nodes.forEach((n) => (byLayer[n.layer] ??= []).push(n));
    const rfNodes = lin.nodes.map((n) => {
      const col = byLayer[n.layer];
      const idx = col.indexOf(n);
      return {
        id: n.id,
        type: 'pill',
        position: { x: n.layer * 280 + 20, y: idx * 118 + 24 },
        data: { ...n, isFocus: n.id === lin.focusId } as unknown as Record<string, unknown>,
      };
    });
    const rfEdges = lin.edges.map((e, i) => {
      const targetKind = lin.nodes.find((n) => n.id === e.to)?.kind;
      const hot = targetKind === 'metric' || targetKind === 'app';
      return {
        id: `e${i}`,
        source: e.from,
        target: e.to,
        markerEnd: { type: MarkerType.ArrowClosed, color: hot ? 'var(--brand-navy)' : 'var(--border)' },
        style: { stroke: hot ? 'var(--brand-navy)' : 'var(--border)', strokeWidth: 1.5 },
      };
    });
    return { rfNodes, rfEdges };
  }, [lin]);

  const selected = selectedId ? lin.nodes.find((n) => n.id === selectedId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button onClick={() => navigate({ name: 'landing' })} className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Hub
        </button>
        <ChevronRight className="size-3.5" />
        {metric ? (
          <button onClick={() => navigate({ name: 'metric', id })} className="hover:text-foreground">
            {metric.name}
          </button>
        ) : asset ? (
          <button onClick={() => navigate({ name: 'asset', id })} className="hover:text-foreground">
            {asset.name}
          </button>
        ) : app ? (
          <button onClick={() => navigate({ name: 'app', id })} className="hover:text-foreground">
            {app.name}
          </button>
        ) : isRealId(id) ? (
          <button onClick={() => navigate({ name: 'asset', id })} className="hover:text-foreground">
            {title}
          </button>
        ) : (
          <span>{title}</span>
        )}
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Lineage</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <H1 className="text-2xl break-all">{title} — lineage</H1>
          <Muted className="text-sm">
            Model-level lineage across the estate — sources on the left flow through models to the metrics and AI apps
            that consume them. Click any node for its detail and transformation.
          </Muted>
          {lin.unmapped && (
            <Muted className="mt-1 text-sm">This source isn&apos;t mapped to any dbt models yet — no lineage to show.</Muted>
          )}
        </div>
        <Button variant="outline" onClick={() => window.alert('Deep-links into dbt Explorer for column-level lineage (stub).')}>
          <ExternalLink className="size-4" /> Column-level in dbt Explorer
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="h-[560px] overflow-hidden rounded-lg border border-border bg-surface-muted/40">
          {loadingReal ? (
            <div className="flex h-full items-center justify-center">
              <Muted>Loading lineage…</Muted>
            </div>
          ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            nodesDraggable={false}
            nodesConnectable={false}
          >
            <Background gap={16} color="var(--border)" />
            <Controls showInteractive={false} />
          </ReactFlow>
          )}
        </div>

        <aside className="rounded-lg border border-border bg-surface p-4">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
              <Muted className="text-sm">Select a node to inspect it.</Muted>
              <Muted className="text-xs">The highlighted node is what you came from.</Muted>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${KIND_STYLE[selected.kind].chip}`}>
                  {KIND_STYLE[selected.kind].label}
                </span>
                <div className="mt-1 text-base font-semibold break-all">{selected.label}</div>
                {selected.sub && <div className="text-xs text-muted-foreground">{selected.sub}</div>}
              </div>
              {selected.readiness && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Readiness</span>
                  <ReadinessBar r={selected.readiness} />
                </div>
              )}
              {selected.desc && <Text className="text-sm text-muted-foreground">{selected.desc}</Text>}
              {selected.sql ? (
                <div>
                  <span className="text-xs tracking-wide text-muted-foreground uppercase">Transformation (dbt)</span>
                  <pre className="mt-1 max-h-72 overflow-auto rounded-md border border-border bg-surface-muted p-3 text-xs leading-relaxed">
                    {selected.sql}
                  </pre>
                </div>
              ) : (
                selected.kind === 'source' && <Muted className="text-xs">Raw upstream source — no transformation.</Muted>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
