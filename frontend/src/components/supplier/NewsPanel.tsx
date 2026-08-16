import { useCallback, useEffect, useState } from "react"
import { Newspaper, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import ErrorState from "@/components/ErrorState"
import ConfidenceBadge from "@/components/badges/ConfidenceBadge"
import { listNews, refreshNews } from "@/lib/news"
import { getErrorMessage } from "@/lib/errors"
import { formatDate } from "@/lib/format"
import type { NewsArticle, NewsSentiment } from "@/lib/types"

const sentimentClasses: Record<string, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutral: "border-border bg-muted text-muted-foreground",
  negative: "border-red-200 bg-red-50 text-red-700",
}

function SentimentBadge({
  sentiment,
  score,
}: {
  sentiment: NewsSentiment | null
  score: number | null
}) {
  const key = sentiment || "neutral"
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${sentimentClasses[key]}`}
      title={typeof score === "number" ? score.toFixed(2) : undefined}
    >
      {sentiment || "pending"}
    </span>
  )
}

function NewsPanel({ supplierId }: { supplierId: string }) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await listNews(supplierId)
      setArticles(data)
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load news"))
    } finally {
      setLoading(false)
    }
  }, [supplierId])

  useEffect(() => {
    load()
  }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError("")
    try {
      await refreshNews(supplierId)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't refresh news"))
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Newspaper className="size-4 text-primary" />
          Latest intelligence
        </h2>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && articles.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No recent intelligence is available for this supplier.
        </p>
      )}

      {!loading && !error && articles.length > 0 && (
        <ul className="space-y-2">
          {articles.map((article) => (
            <li
              key={article._id}
              className="rounded-lg border border-border px-3 py-2.5 transition-colors duration-200 ease-out hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-3">
                {article.url ? (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium hover:text-primary"
                  >
                    {article.headline}
                  </a>
                ) : (
                  <span className="text-sm font-medium">{article.headline}</span>
                )}
                <div className="flex shrink-0 items-center gap-1.5">
                  <SentimentBadge sentiment={article.sentiment} score={article.sentimentScore} />
                  <ConfidenceBadge confidence={article.sentimentConfidence} />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {article.source ? `${article.source} · ` : ""}
                {formatDate(article.publishedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default NewsPanel
