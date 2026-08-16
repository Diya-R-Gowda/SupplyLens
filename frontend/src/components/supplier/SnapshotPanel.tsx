import { useCallback, useEffect, useState } from "react"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import ErrorState from "@/components/ErrorState"
import RiskBadge from "@/components/badges/RiskBadge"
import HealthBadge from "@/components/badges/HealthBadge"
import { getSnapshot, listSnapshots, takeSnapshot } from "@/lib/twin"
import { getErrorMessage } from "@/lib/errors"
import { formatDate } from "@/lib/format"
import type { Snapshot, SnapshotSummary } from "@/lib/types"

function SnapshotPanel({ supplierId }: { supplierId: string }) {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [taking, setTaking] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [comparison, setComparison] = useState<[Snapshot, Snapshot] | null>(null)
  const [comparing, setComparing] = useState(false)
  const [compareError, setCompareError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const { snapshots: data } = await listSnapshots(supplierId, { limit: 20 })
      setSnapshots(data)
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load snapshots"))
    } finally {
      setLoading(false)
    }
  }, [supplierId])

  useEffect(() => {
    load()
  }, [load])

  const handleTake = async () => {
    setTaking(true)
    setError("")
    try {
      await takeSnapshot(supplierId)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't take snapshot"))
    } finally {
      setTaking(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const handleCompare = async () => {
    if (selected.length !== 2) return
    setComparing(true)
    setCompareError("")
    try {
      const [a, b] = await Promise.all(selected.map((id) => getSnapshot(supplierId, id)))
      const [older, newer] =
        new Date(a.createdAt).getTime() <= new Date(b.createdAt).getTime() ? [a, b] : [b, a]
      setComparison([older, newer])
    } catch (err) {
      setCompareError(getErrorMessage(err, "Couldn't load snapshots to compare"))
    } finally {
      setComparing(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Snapshots</h3>
        <Button variant="outline" size="sm" onClick={handleTake} disabled={taking}>
          <Camera className="size-4" />
          {taking ? "Taking…" : "Take snapshot"}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && snapshots.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No snapshots yet.</p>
      )}

      {!loading && !error && snapshots.length > 0 && (
        <>
          <ul className="space-y-1.5">
            {snapshots.map((snap) => (
              <li
                key={snap._id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(snap._id)}
                  onChange={() => toggleSelect(snap._id)}
                  className="accent-primary"
                />
                <span className="flex-1 text-muted-foreground">
                  {formatDate(snap.createdAt)} · {snap.reason}
                </span>
                {snap.riskScore != null && <RiskBadge score={snap.riskScore} />}
                {snap.healthScore != null && <HealthBadge score={snap.healthScore} />}
              </li>
            ))}
          </ul>

          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={selected.length !== 2 || comparing}
            onClick={handleCompare}
          >
            {comparing ? "Loading…" : "Compare selected"}
          </Button>

          {compareError && <p className="mt-2 text-xs text-red-700">{compareError}</p>}

          {comparison && (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
              {comparison.map((snap, i) => (
                <div key={snap._id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {i === 0 ? "Older" : "Newer"} · {formatDate(snap.createdAt)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <RiskBadge score={snap.state.risk.score} />
                    <HealthBadge score={snap.state.health.score} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {snap.state.documents.count} documents · {snap.state.news.articleCount} news
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SnapshotPanel
