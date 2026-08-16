import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import RiskBadge from "@/components/badges/RiskBadge"
import HealthBadge from "@/components/badges/HealthBadge"
import ConfidenceBadge from "@/components/badges/ConfidenceBadge"
import {
  generateMitigation,
  getAlternatives,
  getBusinessImpact,
  getRecoveryEstimate,
  simulateFailure,
  updateBusinessFields,
} from "@/lib/scenario"
import { getErrorMessage } from "@/lib/errors"
import type {
  AlternativesResult,
  BusinessImpactResult,
  MitigationResult,
  RecoveryEstimateResult,
  SimulationResult,
} from "@/lib/types"

const COMPLETENESS_LABEL: Record<string, string> = {
  low: "border-red-200 bg-red-50 text-red-700",
  partial: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  )
}

function ScenarioSimulatorPanel({ supplierId, isAdmin }: { supplierId: string; isAdmin: boolean }) {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [simulationError, setSimulationError] = useState("")

  const [mitigation, setMitigation] = useState<MitigationResult | null>(null)
  const [mitigating, setMitigating] = useState(false)
  const [mitigationError, setMitigationError] = useState("")

  const [alternatives, setAlternatives] = useState<AlternativesResult | null>(null)
  const [findingAlternatives, setFindingAlternatives] = useState(false)
  const [alternativesError, setAlternativesError] = useState("")

  const [businessForm, setBusinessForm] = useState({
    amount: "",
    currency: "USD",
    estimatedAnnualSpend: "",
    criticalityRating: "",
    dependencyNotes: "",
  })
  const [savingBusiness, setSavingBusiness] = useState(false)
  const [businessSaveError, setBusinessSaveError] = useState("")
  const [businessImpact, setBusinessImpact] = useState<BusinessImpactResult | null>(null)
  const [businessImpactLoading, setBusinessImpactLoading] = useState(false)
  const [businessImpactError, setBusinessImpactError] = useState("")

  const [recovery, setRecovery] = useState<RecoveryEstimateResult | null>(null)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryError, setRecoveryError] = useState("")

  const handleSimulate = async () => {
    setSimulating(true)
    setSimulationError("")
    try {
      setSimulation(await simulateFailure(supplierId))
    } catch (err) {
      setSimulationError(getErrorMessage(err, "Couldn't run simulation"))
    } finally {
      setSimulating(false)
    }
  }

  const handleMitigation = async () => {
    setMitigating(true)
    setMitigationError("")
    try {
      setMitigation(await generateMitigation(supplierId))
    } catch (err) {
      setMitigationError(getErrorMessage(err, "Couldn't generate mitigation strategies"))
    } finally {
      setMitigating(false)
    }
  }

  const handleAlternatives = async () => {
    setFindingAlternatives(true)
    setAlternativesError("")
    try {
      setAlternatives(await getAlternatives(supplierId))
    } catch (err) {
      setAlternativesError(getErrorMessage(err, "Couldn't find alternative suppliers"))
    } finally {
      setFindingAlternatives(false)
    }
  }

  const handleSaveBusiness = async () => {
    setSavingBusiness(true)
    setBusinessSaveError("")
    try {
      const payload: Parameters<typeof updateBusinessFields>[1] = {
        dependencyNotes: businessForm.dependencyNotes || undefined,
      }
      if (businessForm.amount !== "") {
        payload.contractValue = {
          amount: Number(businessForm.amount),
          currency: businessForm.currency || "USD",
        }
      }
      if (businessForm.estimatedAnnualSpend !== "") {
        payload.estimatedAnnualSpend = Number(businessForm.estimatedAnnualSpend)
      }
      if (businessForm.criticalityRating !== "") {
        payload.criticalityRating = Number(businessForm.criticalityRating)
      }
      await updateBusinessFields(supplierId, payload)
    } catch (err) {
      setBusinessSaveError(getErrorMessage(err, "Couldn't save business fields"))
    } finally {
      setSavingBusiness(false)
    }
  }

  const handleCheckImpact = async () => {
    setBusinessImpactLoading(true)
    setBusinessImpactError("")
    try {
      setBusinessImpact(await getBusinessImpact(supplierId))
    } catch (err) {
      setBusinessImpactError(getErrorMessage(err, "Couldn't compute business impact"))
    } finally {
      setBusinessImpactLoading(false)
    }
  }

  const handleRecovery = async () => {
    setRecoveryLoading(true)
    setRecoveryError("")
    try {
      setRecovery(await getRecoveryEstimate(supplierId))
    } catch (err) {
      setRecoveryError(getErrorMessage(err, "Couldn't estimate recovery time"))
    } finally {
      setRecoveryLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Scenario simulator</h3>
            <p className="text-xs text-muted-foreground">
              What happens if this supplier fails — a server-computed snapshot of current risk
              exposure, no AI guessing.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSimulate} disabled={simulating}>
            {simulating ? "Simulating…" : simulation ? "Re-run simulation" : "Simulate failure"}
          </Button>
        </div>
        {simulationError && <p className="mb-2 text-xs text-red-700">{simulationError}</p>}

        {simulation && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3 text-sm sm:col-span-2">
              {simulation.summary}
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Concentration risk
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Pill>{simulation.concentrationRisk.totalOrgSuppliers} suppliers in org</Pill>
                {simulation.concentrationRisk.isSoleCategorySource && <Pill>Sole category source</Pill>}
                {simulation.concentrationRisk.isSoleCountrySource && <Pill>Sole country source</Pill>}
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Current risk &amp; health
              </p>
              <div className="flex flex-wrap gap-1.5">
                <RiskBadge score={simulation.currentRiskHealth.riskScore} />
                <HealthBadge score={simulation.currentRiskHealth.healthScore} />
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Data completeness
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${COMPLETENESS_LABEL[simulation.dataCompleteness.level]}`}
              >
                {simulation.dataCompleteness.level}
              </span>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {simulation.dataCompleteness.note}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Recent news</p>
              <div className="flex flex-wrap gap-1.5">
                <Pill>{simulation.recentNews.articleCount} articles</Pill>
                <Pill>{simulation.recentNews.sentimentCounts.negative} negative</Pill>
              </div>
            </div>
          </div>
        )}
      </div>

      {simulation && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Mitigation strategies</h3>
            <Button variant="outline" size="sm" onClick={handleMitigation} disabled={mitigating}>
              {mitigating ? "Generating…" : mitigation ? "Regenerate" : "Generate with AI"}
            </Button>
          </div>
          {mitigationError && <p className="mb-2 text-xs text-red-700">{mitigationError}</p>}
          {mitigation && (
            <div className="space-y-2">
              <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                AI-generated — verify independently
              </span>
              {mitigation.strategies.map((s, i) => (
                <div key={i} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{s.strategy}</p>
                    <ConfidenceBadge confidence={s.confidence} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.rationale}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Alternative suppliers</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAlternatives}
            disabled={findingAlternatives}
          >
            {findingAlternatives ? "Searching…" : alternatives ? "Re-check" : "Find alternatives"}
          </Button>
        </div>
        {alternativesError && <p className="mb-2 text-xs text-red-700">{alternativesError}</p>}
        {alternatives && alternatives.status === "no_alternatives_found" && (
          <p className="text-sm text-muted-foreground">{alternatives.message}</p>
        )}
        {alternatives && alternatives.status === "ok" && (
          <div className="space-y-1.5">
            {alternatives.alternatives.map((alt) => (
              <div
                key={alt.supplierId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{alt.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {alt.category} · {alt.country} · compared on {alt.comparedOn.join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <RiskBadge score={alt.riskScore} />
                  <Pill>{alt.similarityScore.toFixed(1)}% match</Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-medium">Business impact</h3>

        {isAdmin && (
          <div className="mb-4 grid gap-3 border-b border-border pb-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Contract value</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={businessForm.amount}
                  onChange={(e) => setBusinessForm((p) => ({ ...p, amount: e.target.value }))}
                />
                <Input
                  placeholder="USD"
                  maxLength={3}
                  className="w-20"
                  value={businessForm.currency}
                  onChange={(e) => setBusinessForm((p) => ({ ...p, currency: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Estimated annual spend</label>
              <Input
                type="number"
                value={businessForm.estimatedAnnualSpend}
                onChange={(e) =>
                  setBusinessForm((p) => ({ ...p, estimatedAnnualSpend: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Criticality (1-5)</label>
              <Select
                value={businessForm.criticalityRating || undefined}
                onValueChange={(v) => setBusinessForm((p) => ({ ...p, criticalityRating: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium">Dependency notes</label>
              <Input
                maxLength={500}
                value={businessForm.dependencyNotes}
                onChange={(e) =>
                  setBusinessForm((p) => ({ ...p, dependencyNotes: e.target.value }))
                }
              />
            </div>
            {businessSaveError && (
              <p className="text-xs text-red-700 sm:col-span-2">{businessSaveError}</p>
            )}
            <Button
              size="sm"
              className="sm:col-span-2 sm:w-fit"
              onClick={handleSaveBusiness}
              disabled={savingBusiness}
            >
              {savingBusiness ? "Saving…" : "Save real values"}
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Uses real values if you've saved them, otherwise an AI estimate.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckImpact}
            disabled={businessImpactLoading}
          >
            {businessImpactLoading ? "Checking…" : "Check impact"}
          </Button>
        </div>
        {businessImpactError && <p className="mt-2 text-xs text-red-700">{businessImpactError}</p>}
        {businessImpact && (
          <div className="mt-3 rounded-lg border border-border p-3 text-sm">
            {businessImpact.mode === "real" ? (
              <>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Real calculation
                </span>
                <p className="mt-2">{businessImpact.summary}</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    AI estimate
                  </span>
                  <ConfidenceBadge confidence={businessImpact.confidence} />
                </div>
                {businessImpact.estimatedAnnualSpendRange && (
                  <p className="mt-2">
                    Estimated annual spend: {businessImpact.estimatedAnnualSpendRange.low}–
                    {businessImpact.estimatedAnnualSpendRange.high}{" "}
                    {businessImpact.estimatedAnnualSpendRange.currency}
                  </p>
                )}
                {businessImpact.reasoning && (
                  <p className="mt-1 text-xs text-muted-foreground">{businessImpact.reasoning}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Recovery planning</h3>
          <Button variant="outline" size="sm" onClick={handleRecovery} disabled={recoveryLoading}>
            {recoveryLoading ? "Estimating…" : recovery ? "Regenerate" : "Estimate recovery time"}
          </Button>
        </div>
        {recoveryError && <p className="mb-2 text-xs text-red-700">{recoveryError}</p>}
        {recovery && (
          <div className="space-y-2">
            <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              {recovery.label}
            </span>
            <p className="text-lg font-semibold">{recovery.estimatedRange}</p>
            {recovery.reasoning && (
              <p className="text-sm text-muted-foreground">{recovery.reasoning}</p>
            )}
            <ConfidenceBadge confidence={recovery.confidence} />
          </div>
        )}
      </div>
    </div>
  )
}

export default ScenarioSimulatorPanel
