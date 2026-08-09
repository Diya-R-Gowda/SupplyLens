import { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../api/axios';
import Button from './Button';
import Badge from './Badge';

const riskColor = (score) => (score <= 33 ? '#16a34a' : score <= 66 ? '#ca8a04' : '#dc2626');

const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 110;

// Simple grouped-column layout (nodes bucketed by category into columns,
// stacked vertically within each) instead of a force-directed/auto-layout
// library (e.g. dagre) - this graph is small and category-grouped by
// design, so a manual layout is simpler and more legible than pulling in
// another dependency for physics simulation this data doesn't need.
const layoutNodes = (nodes) => {
  const byCategory = new Map();
  for (const node of nodes) {
    const key = node.category || 'uncategorized';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(node);
  }
  const categories = [...byCategory.keys()].sort();
  const positioned = new Map();
  categories.forEach((category, colIndex) => {
    byCategory.get(category).forEach((node, rowIndex) => {
      positioned.set(node.id, {
        x: colIndex * COLUMN_WIDTH,
        y: rowIndex * ROW_HEIGHT,
      });
    });
  });
  return { positioned, categories };
};

const NodeLabel = ({ node }) => (
  <div className="grid gap-1 p-1 text-left">
    <div className="flex items-center gap-1.5">
      <p className="m-0 font-semibold text-slate-900 text-[0.82rem] truncate max-w-[140px]">{node.name}</p>
      {(node.isSoleCategorySource || node.isSoleCountrySource) ? (
        <span title="Sole source - no redundancy on this dimension" className="text-amber-600">&#9888;</span>
      ) : null}
    </div>
    <div className="flex flex-wrap gap-1">
      <Badge className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[0.68rem]">{node.category || 'no category'}</Badge>
      <Badge className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[0.68rem]">{node.country}</Badge>
    </div>
    <span className="text-[0.68rem]" style={{ color: riskColor(node.riskScore) }}>Risk {node.riskScore}</span>
  </div>
);

// Phase 9 Step 4 - Concentration & Redundancy View. Persistent labeling
// throughout (title, legend, empty state) deliberately never says "network"
// or "dependency graph" - this visualizes real category/country grouping
// and similarity-score proximity, not supply-chain tiering, which doesn't
// exist anywhere in this app's data.
export default function ConcentrationGraphPage({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/org/concentration-graph')
      .then((res) => { if (active) setData(res.data.data); })
      .catch(() => { if (active) setError('Unable to load the concentration graph.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!data) return { flowNodes: [], flowEdges: [] };
    const { positioned } = layoutNodes(data.nodes);

    const flowNodes = data.nodes.map((node) => ({
      id: node.id,
      position: positioned.get(node.id),
      data: { label: <NodeLabel node={node} /> },
      style: {
        border: (node.isSoleCategorySource || node.isSoleCountrySource) ? '2px solid #d97706' : '1px solid #cbd5e1',
        borderRadius: 12,
        background: '#ffffffdd',
        width: 170,
      },
    }));

    const flowEdges = data.edges.map((edge, i) => ({
      id: `${edge.source}-${edge.target}-${i}`,
      source: edge.source,
      target: edge.target,
      label: edge.type === 'similarity' ? `${edge.reason}, score ${edge.similarityScore}` : edge.reason,
      labelStyle: { fontSize: 10, fill: '#475569' },
      style: edge.type === 'similarity'
        ? { stroke: '#3853b5', strokeWidth: Math.max(1, Math.min(4, edge.similarityScore / 20)) }
        : { stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 3' },
      markerEnd: { type: MarkerType.ArrowClosed, color: edge.type === 'similarity' ? '#3853b5' : '#94a3b8' },
    }));

    return { flowNodes, flowEdges };
  }, [data]);

  return (
    <div className="grid gap-4">
      <div>
        <Button onClick={onBack} className="rounded-full px-3.5 py-2 mb-2">&larr; Back</Button>
        <h1 className="m-0 text-[1.6rem] text-slate-900">Concentration &amp; Redundancy View</h1>
        <p className="mt-1 mb-0 text-slate-600 text-[0.9rem] max-w-[640px]">
          <strong>Not a supply-chain dependency graph.</strong> This app has no upstream/downstream or
          parent/child supplier data. Edges show real category/country grouping and similarity-score
          proximity between suppliers already in your org - solid blue lines are same-category pairs
          weighted by similarity score, dashed grey lines are same-country-only pairs.
          <span className="inline-flex items-center gap-1 text-amber-600 ml-1">&#9888; = sole source</span> on
          category or country - no redundancy if this supplier is lost.
        </p>
      </div>

      {loading ? <p className="m-0 text-slate-600">Loading graph...</p> : null}
      {error ? <p className="m-0 text-red-700">{error}</p> : null}

      {!loading && !error && data ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[0.82rem]">
              {data.nodes.length} supplier(s), {data.edges.length} real relationship(s)
            </Badge>
            {data.soleSourceCount > 0 ? (
              <Badge className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[0.78rem]">
                {data.soleSourceCount} sole-source supplier(s) - no redundancy
              </Badge>
            ) : null}
          </div>

          {data.nodes.length === 0 ? (
            <p className="m-0 text-slate-600">No suppliers yet.</p>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-slate-300/60 bg-white/60" style={{ height: 480 }}>
              <ReactFlow nodes={flowNodes} edges={flowEdges} fitView minZoom={0.3} nodesDraggable nodesConnectable={false}>
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
