import { useCallback, useEffect, useMemo, useState } from "react"
import { ReactFlow, Background, Controls, MarkerType, type Node, type Edge } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Skeleton } from "@/components/ui/skeleton"
import ErrorState from "@/components/ErrorState"
import { getConcentrationGraph } from "@/lib/visualizations"
import { getErrorMessage } from "@/lib/errors"
import type { ConcentrationGraphData, ConcentrationNode } from "@/lib/types"

const COLUMN_WIDTH = 240
const ROW_HEIGHT = 96

function buildLayout(data: ConcentrationGraphData): { nodes: Node[]; edges: Edge[] } {
  const byCategory = new Map<string, ConcentrationNode[]>()
  for (const n of data.nodes) {
    const key = n.category || "Uncategorized"
    if (!byCategory.has(key)) byCategory.set(key, [])
    byCategory.get(key)!.push(n)
  }

  const categories = [...byCategory.keys()].sort()
  const nodes: Node[] = []
  categories.forEach((cat, colIndex) => {
    const items = byCategory.get(cat)!
    items.forEach((n, rowIndex) => {
      const isSoleSource = n.isSoleCategorySource || n.isSoleCountrySource
      nodes.push({
        id: n.id,
        position: { x: colIndex * COLUMN_WIDTH, y: rowIndex * ROW_HEIGHT },
        data: {
          label: (
            <div className="text-xs">
              <p className="font-medium">{n.name}</p>
              <p className="text-muted-foreground">
                {n.country} · Risk {Math.round(n.riskScore)}
              </p>
              {isSoleSource && <p className="text-amber-700">Sole source</p>}
            </div>
          ),
        },
        style: {
          border: `2px solid ${isSoleSource ? "#d97706" : "var(--border)"}`,
          borderRadius: 10,
          padding: 8,
          background: "var(--card)",
          width: 190,
        },
      })
    })
  })

  const edges: Edge[] = data.edges.map((e, i) => ({
    id: `${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    label: e.type === "similarity" && e.similarityScore != null ? `${e.similarityScore.toFixed(0)}` : undefined,
    style:
      e.type === "similarity"
        ? { stroke: "#4f46e5", strokeWidth: Math.max(1, (e.similarityScore || 0) / 20) }
        : { stroke: "#94a3b8", strokeDasharray: "4 4" },
    markerEnd: { type: MarkerType.ArrowClosed },
  }))

  return { nodes, edges }
}

function ConcentrationGraph() {
  const [data, setData] = useState<ConcentrationGraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setData(await getConcentrationGraph())
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load the concentration graph"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const layout = useMemo(() => (data ? buildLayout(data) : null), [data])

  if (loading) return <Skeleton className="h-[32rem] rounded-xl" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data || !layout) return null

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        {data.scope}
      </div>
      <div className="h-[32rem] rounded-xl border border-border bg-card">
        <ReactFlow nodes={layout.nodes} edges={layout.edges} fitView proOptions={{ hideAttribution: true }}>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <p className="text-xs text-muted-foreground">
        {data.soleSourceCount} single-source concentration
        {data.soleSourceCount === 1 ? "" : "s"} · {data.nodes.length} suppliers ·{" "}
        {data.edges.length} relationships
      </p>
    </div>
  )
}

export default ConcentrationGraph
