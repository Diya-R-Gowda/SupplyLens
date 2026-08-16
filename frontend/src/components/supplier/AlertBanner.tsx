import { AlertTriangle, Radar, TrendingDown } from "lucide-react"
import type { AnomalyDetection, ProjectedAlert, SupplierTwin } from "@/lib/types"

function AlertBanner({ twin }: { twin: SupplierTwin }) {
  const { alerts, projectedAlerts, anomalies } = twin

  const breached = [
    alerts.risk.breached ? { label: "Risk", ...alerts.risk } : null,
    alerts.health.breached ? { label: "Health", ...alerts.health } : null,
  ].filter(Boolean) as { label: string; score: number; threshold: number }[]

  const projected = [
    ...projectedAlerts.risk.map((p) => ({ label: "Risk", ...p })),
    ...projectedAlerts.health.map((p) => ({ label: "Health", ...p })),
  ]

  const anomalyEntries: { label: string; detail: AnomalyDetection }[] = []
  if (anomalies.compoundingDrift.risk.status === "ok" && anomalies.compoundingDrift.risk.detected) {
    anomalyEntries.push({ label: "Compounding risk drift", detail: anomalies.compoundingDrift.risk })
  }
  if (anomalies.compoundingDrift.health.status === "ok" && anomalies.compoundingDrift.health.detected) {
    anomalyEntries.push({ label: "Compounding health drift", detail: anomalies.compoundingDrift.health })
  }
  if (anomalies.sentimentShift.status === "ok" && anomalies.sentimentShift.detected) {
    anomalyEntries.push({ label: "News sentiment shift", detail: anomalies.sentimentShift })
  }

  if (breached.length === 0 && projected.length === 0 && anomalyEntries.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {breached.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Active alert</p>
            <p>
              {breached
                .map((b) => `${b.label} score ${b.score} has breached the ${b.threshold} threshold`)
                .join(" · ")}
            </p>
          </div>
        </div>
      )}

      {projected.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <TrendingDown className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Early warning — projected breach</p>
            <ul className="mt-1 space-y-0.5">
              {projected.map((p: ProjectedAlert & { label: string }, i) => (
                <li key={i}>
                  {p.label} projected to hit {p.projectedScore} within {p.horizonDays} days
                  (threshold {p.threshold}, {p.confidenceLevel} confidence)
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {anomalyEntries.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-700">
          <Radar className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Anomaly detected</p>
            <ul className="mt-1 space-y-0.5">
              {anomalyEntries.map((a, i) => (
                <li key={i}>{a.label}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default AlertBanner
