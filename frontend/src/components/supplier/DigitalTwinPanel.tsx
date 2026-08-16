import { useState } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import RiskBadge from "@/components/badges/RiskBadge"
import HealthBadge from "@/components/badges/HealthBadge"
import ConfidenceBadge from "@/components/badges/ConfidenceBadge"
import AlertBanner from "@/components/supplier/AlertBanner"
import { enrichSupplier, refreshEsg, refreshLogistics } from "@/lib/twin"
import { getErrorMessage } from "@/lib/errors"
import { formatDate } from "@/lib/format"
import type { HealthFactors, RiskFactors, SupplierTwin } from "@/lib/types"

const RISK_FACTOR_LABELS: Record<keyof RiskFactors, string> = {
  newsScore: "News sentiment",
  expiryScore: "Contract expiry",
  docScore: "Documents",
  countryScore: "Country risk",
}

const HEALTH_FACTOR_LABELS: Record<keyof HealthFactors, string> = {
  esgScore: "ESG",
  logisticsScore: "Logistics",
  docCompletenessScore: "Document completeness",
  contractHealthScore: "Contract health",
  riskComponent: "Risk (inverted)",
}

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  unknown: "Unknown",
}

function FactorList({
  factors,
  labels,
}: {
  factors: Record<string, number>
  labels: Record<string, string>
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {Object.entries(factors).map(([key, value]) => (
        <span
          key={key}
          className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
        >
          {labels[key] || key}: {Math.round(value)}
        </span>
      ))}
    </div>
  )
}

function AiBadge() {
  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      AI-generated — verify independently
    </span>
  )
}

function DigitalTwinPanel({
  supplierId,
  twin,
  onRefresh,
}: {
  supplierId: string
  twin: SupplierTwin
  onRefresh: () => void
}) {
  const [enriching, setEnriching] = useState(false)
  const [enrichError, setEnrichError] = useState("")
  const [esgRefreshing, setEsgRefreshing] = useState(false)
  const [esgError, setEsgError] = useState("")
  const [logisticsRefreshing, setLogisticsRefreshing] = useState(false)
  const [logisticsError, setLogisticsError] = useState("")

  const handleEnrich = async () => {
    setEnriching(true)
    setEnrichError("")
    try {
      await enrichSupplier(supplierId)
      onRefresh()
    } catch (err) {
      setEnrichError(getErrorMessage(err, "Couldn't enrich supplier"))
    } finally {
      setEnriching(false)
    }
  }

  const handleEsgRefresh = async () => {
    setEsgRefreshing(true)
    setEsgError("")
    try {
      await refreshEsg(supplierId)
      onRefresh()
    } catch (err) {
      setEsgError(getErrorMessage(err, "Couldn't refresh ESG data"))
    } finally {
      setEsgRefreshing(false)
    }
  }

  const handleLogisticsRefresh = async () => {
    setLogisticsRefreshing(true)
    setLogisticsError("")
    try {
      await refreshLogistics(supplierId)
      onRefresh()
    } catch (err) {
      setLogisticsError(getErrorMessage(err, "Couldn't refresh logistics data"))
    } finally {
      setLogisticsRefreshing(false)
    }
  }

  return (
    <div className="space-y-4">
      <AlertBanner twin={twin} />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            Digital Twin
          </h2>
          <span className="text-xs text-muted-foreground">
            Updated {formatDate(twin.generatedAt)}
          </span>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          A consolidated, always-current profile combining risk, health, ESG, logistics,
          documents, and news.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Risk</span>
              <RiskBadge score={twin.risk.score} />
            </div>
            <FactorList
              factors={twin.risk.currentFactors as unknown as Record<string, number>}
              labels={RISK_FACTOR_LABELS}
            />
            {twin.risk.lastChange && (
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Why did this change?
                </summary>
                <p className="mt-1">
                  {twin.risk.lastChange.narrative ||
                    `${twin.risk.lastChange.delta > 0 ? "+" : ""}${twin.risk.lastChange.delta} from ${twin.risk.lastChange.previousScore} (${twin.risk.lastChange.reason.replace(/_/g, " ")})`}
                </p>
              </details>
            )}
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Health</span>
              <HealthBadge score={twin.health.score} />
            </div>
            <FactorList
              factors={twin.health.currentFactors as unknown as Record<string, number>}
              labels={HEALTH_FACTOR_LABELS}
            />
            {twin.health.lastChange && (
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Why did this change?
                </summary>
                <p className="mt-1">
                  {twin.health.lastChange.narrative ||
                    `${twin.health.lastChange.delta > 0 ? "+" : ""}${twin.health.lastChange.delta} from ${twin.health.lastChange.previousScore} (${twin.health.lastChange.reason.replace(/_/g, " ")})`}
                </p>
              </details>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-2 py-0.5">
            Contract: {CONTRACT_STATUS_LABEL[twin.contract.status]}
            {twin.contract.daysRemaining != null && ` (${twin.contract.daysRemaining}d)`}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5">
            {twin.documents.count} document{twin.documents.count === 1 ? "" : "s"}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5">
            {twin.news.articleCount} news article{twin.news.articleCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Company enrichment</h3>
          <Button variant="outline" size="sm" onClick={handleEnrich} disabled={enriching}>
            {enriching ? "Enriching…" : twin.enrichment?.enrichedAt ? "Refresh" : "Enrich with AI"}
          </Button>
        </div>
        {enrichError && <p className="mb-2 text-xs text-red-700">{enrichError}</p>}
        {twin.enrichment?.enrichedAt ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <AiBadge />
              <ConfidenceBadge confidence={twin.enrichment.confidence} />
              <span className="text-xs text-muted-foreground">
                Last enriched {formatDate(twin.enrichment.enrichedAt)}
              </span>
            </div>
            <p className="text-sm">{twin.enrichment.summary || "No summary available."}</p>
            <div className="flex flex-wrap gap-1.5">
              {twin.enrichment.industry && (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                  {twin.enrichment.industry}
                </span>
              )}
              {twin.enrichment.companySize && (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                  {twin.enrichment.companySize}
                </span>
              )}
              {twin.enrichment.foundedYear && (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                  Founded {twin.enrichment.foundedYear}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No enrichment data yet — click "Enrich with AI" to populate industry, size, and a
            summary.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">ESG</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEsgRefresh}
              disabled={esgRefreshing}
            >
              {esgRefreshing ? "Refreshing…" : twin.esg?.refreshedAt ? "Refresh" : "Estimate with AI"}
            </Button>
          </div>
          {esgError && <p className="mb-2 text-xs text-red-700">{esgError}</p>}
          {twin.esg?.refreshedAt ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <AiBadge />
                <ConfidenceBadge confidence={twin.esg.confidence} />
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                <span>Environmental: {twin.esg.environmentalScore ?? "—"}</span>
                <span>Social: {twin.esg.socialScore ?? "—"}</span>
                <span>Governance: {twin.esg.governanceScore ?? "—"}</span>
              </div>
              <p className="text-sm">{twin.esg.summary || "No summary available."}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No ESG data yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Logistics</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogisticsRefresh}
              disabled={logisticsRefreshing}
            >
              {logisticsRefreshing
                ? "Refreshing…"
                : twin.logistics?.refreshedAt
                  ? "Refresh"
                  : "Estimate with AI"}
            </Button>
          </div>
          {logisticsError && <p className="mb-2 text-xs text-red-700">{logisticsError}</p>}
          {twin.logistics?.refreshedAt ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <AiBadge />
                <ConfidenceBadge confidence={twin.logistics.confidence} />
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                <span>
                  On-time delivery:{" "}
                  {twin.logistics.onTimeDeliveryRate != null
                    ? `${twin.logistics.onTimeDeliveryRate}%`
                    : "—"}
                </span>
                <span>
                  Avg. lead time:{" "}
                  {twin.logistics.averageLeadTimeDays != null
                    ? `${twin.logistics.averageLeadTimeDays}d`
                    : "—"}
                </span>
              </div>
              <p className="text-sm">{twin.logistics.logisticsNotes || "No notes available."}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No logistics data yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DigitalTwinPanel
