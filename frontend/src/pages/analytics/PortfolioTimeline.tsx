import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { PlusCircle, Pencil, FileText, Newspaper, TrendingUp, HeartPulse } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import ErrorState from "@/components/ErrorState"
import { getPortfolioTimeline } from "@/lib/visualizations"
import { getErrorMessage } from "@/lib/errors"
import { formatDate } from "@/lib/format"
import type { PortfolioTimelineData, TimelineEvent } from "@/lib/types"

const EVENT_META: Record<TimelineEvent["type"], { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  supplier_created: { icon: PlusCircle, label: "Supplier added" },
  supplier_updated: { icon: Pencil, label: "Supplier updated" },
  document_uploaded: { icon: FileText, label: "Document uploaded" },
  news_mentioned: { icon: Newspaper, label: "News mention" },
  risk_changed: { icon: TrendingUp, label: "Risk score changed" },
  health_changed: { icon: HeartPulse, label: "Health score changed" },
}

function describeEvent(event: TimelineEvent): string {
  switch (event.type) {
    case "document_uploaded":
      return event.fileName || "Document uploaded"
    case "news_mentioned":
      return event.headline || "News mention"
    case "risk_changed":
    case "health_changed":
      return `${event.delta != null && event.delta > 0 ? "+" : ""}${event.delta} from ${event.previousScore} to ${event.newScore} (${(event.reason || "").replace(/_/g, " ")})`
    default:
      return EVENT_META[event.type].label
  }
}

const DAYS_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
]

function PortfolioTimeline() {
  const [data, setData] = useState<PortfolioTimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [days, setDays] = useState("all")
  const [supplierId, setSupplierId] = useState("all")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await getPortfolioTimeline({
        days: days === "all" ? undefined : Number(days),
        supplierId: supplierId === "all" ? undefined : supplierId,
      })
      setData(result)
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load the portfolio timeline"))
    } finally {
      setLoading(false)
    }
  }, [days, supplierId])

  useEffect(() => {
    load()
  }, [load])

  const supplierOptions = useMemo(() => {
    if (!data) return []
    const seen = new Map<string, string>()
    for (const e of data.events) seen.set(e.supplierId, e.supplierName)
    return [...seen.entries()]
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            {supplierOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && data && (
        <div className="rounded-xl border border-border bg-card p-5">
          {data.truncated && (
            <p className="mb-3 text-xs text-muted-foreground">
              Showing {data.events.length} of {data.totalEvents} events.
            </p>
          )}
          {data.events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No events in this window.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.events.map((event, i) => {
                const meta = EVENT_META[event.type]
                const Icon = meta.icon
                return (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{meta.label}</span>
                        <Link
                          to={`/dashboard/suppliers/${event.supplierId}`}
                          className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:text-primary"
                        >
                          {event.supplierName}
                        </Link>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">{describeEvent(event)}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(event.timestamp)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default PortfolioTimeline
