import { useState } from "react"
import { Bot, Scale, DollarSign, Leaf, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import ConfidenceBadge from "@/components/badges/ConfidenceBadge"
import {
  runEsg,
  runFinance,
  runLegal,
  runLogistics,
  runManagerSummary,
  runRiskAnalyst,
} from "@/lib/agents"
import { getErrorMessage } from "@/lib/errors"
import type {
  EsgAgentResult,
  FinanceResult,
  LegalResult,
  LogisticsAgentResult,
  ManagerSummaryResult,
  RiskAnalystResult,
} from "@/lib/types"

const INPUT_TYPE_LABEL: Record<string, string> = {
  genuine_synthesis: "Genuine synthesis",
  genuine_extraction: "Genuine extraction",
  focused_lens_restatement: "Focused restatement",
  real_math_or_estimate_plus_hardcoded_abstention: "Real math / estimate + abstention",
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
      {INPUT_TYPE_LABEL[type] || type}
    </span>
  )
}

function AgentCard({
  icon: Icon,
  title,
  description,
  onRun,
  loading,
  error,
  hasResult,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  onRun: () => void
  loading: boolean
  error: string
  hasResult: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-primary" />
          {title}
        </h3>
        <Button variant="outline" size="sm" onClick={onRun} disabled={loading}>
          {loading ? "Running…" : hasResult ? `Re-run ${title}` : `Run ${title}`}
        </Button>
      </div>
      {error && <p className="mb-2 text-xs text-red-700">{error}</p>}
      {!hasResult && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  )
}

function AgentsPanel({ supplierId }: { supplierId: string }) {
  const [manager, setManager] = useState<ManagerSummaryResult | null>(null)
  const [managerLoading, setManagerLoading] = useState(false)
  const [managerError, setManagerError] = useState("")

  const [riskAnalyst, setRiskAnalyst] = useState<RiskAnalystResult | null>(null)
  const [riskAnalystLoading, setRiskAnalystLoading] = useState(false)
  const [riskAnalystError, setRiskAnalystError] = useState("")

  const [legal, setLegal] = useState<LegalResult | null>(null)
  const [legalLoading, setLegalLoading] = useState(false)
  const [legalError, setLegalError] = useState("")

  const [finance, setFinance] = useState<FinanceResult | null>(null)
  const [financeLoading, setFinanceLoading] = useState(false)
  const [financeError, setFinanceError] = useState("")

  const [esg, setEsg] = useState<EsgAgentResult | null>(null)
  const [esgLoading, setEsgLoading] = useState(false)
  const [esgError, setEsgError] = useState("")

  const [logistics, setLogistics] = useState<LogisticsAgentResult | null>(null)
  const [logisticsLoading, setLogisticsLoading] = useState(false)
  const [logisticsError, setLogisticsError] = useState("")

  const run = async <T,>(
    fn: () => Promise<T>,
    setResult: (v: T) => void,
    setLoading: (v: boolean) => void,
    setError: (v: string) => void,
    fallback: string
  ) => {
    setLoading(true)
    setError("")
    try {
      setResult(await fn())
    } catch (err) {
      setError(getErrorMessage(err, fallback))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Bot className="size-4 text-primary" />
            Manager executive summary
          </h3>
          <Button
            size="sm"
            onClick={() =>
              run(
                () => runManagerSummary(supplierId),
                setManager,
                setManagerLoading,
                setManagerError,
                "Couldn't generate the executive summary"
              )
            }
            disabled={managerLoading}
          >
            {managerLoading ? "Synthesizing…" : manager ? "Regenerate" : "Generate summary"}
          </Button>
        </div>
        {managerError && <p className="mb-2 text-xs text-red-700">{managerError}</p>}
        {!manager && !managerError && (
          <p className="text-sm text-muted-foreground">
            Runs all 5 agents below and synthesizes one executive summary from their real
            outputs.
          </p>
        )}
        {manager && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ConfidenceBadge confidence={manager.confidence} />
            </div>
            <p className="text-sm">{manager.executiveSummary}</p>
            {manager.topPriorities.length > 0 && (
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {manager.topPriorities.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-1.5">
              <TypeBadge type={manager.inputs.riskAnalyst.type} />
              <TypeBadge type={manager.inputs.legal.type} />
              <TypeBadge type={manager.inputs.finance.type} />
              <TypeBadge type={manager.inputs.esg.type} />
              <TypeBadge type={manager.inputs.logistics.type} />
            </div>
          </div>
        )}
      </div>

      <AgentCard
        icon={Bot}
        title="Risk Analyst"
        description="Synthesizes existing risk/health scores, history, forecast, and anomalies into one assessment."
        onRun={() =>
          run(
            () => runRiskAnalyst(supplierId),
            setRiskAnalyst,
            setRiskAnalystLoading,
            setRiskAnalystError,
            "Couldn't run the Risk Analyst agent"
          )
        }
        loading={riskAnalystLoading}
        error={riskAnalystError}
        hasResult={!!riskAnalyst}
      >
        {riskAnalyst && (
          <div className="space-y-2">
            <ConfidenceBadge confidence={riskAnalyst.confidence} />
            <p className="text-sm">{riskAnalyst.assessment}</p>
            {riskAnalyst.keyConcerns.length > 0 && (
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {riskAnalyst.keyConcerns.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </AgentCard>

      <AgentCard
        icon={Scale}
        title="Legal"
        description="Extracts termination, renewal, compliance, liability, and payment terms from uploaded documents."
        onRun={() =>
          run(
            () => runLegal(supplierId),
            setLegal,
            setLegalLoading,
            setLegalError,
            "Couldn't run the Legal agent"
          )
        }
        loading={legalLoading}
        error={legalError}
        hasResult={!!legal}
      >
        {legal && (
          <div className="space-y-2">
            <ConfidenceBadge confidence={legal.confidence} />
            <p className="text-sm">{legal.summary}</p>
            {legal.status === "ok" &&
              legal.findings.map((f, i) => (
                <div key={i} className="rounded-lg border border-border p-3 text-sm">
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs capitalize text-muted-foreground">
                    {f.topic}
                  </span>
                  <p className="mt-1.5">{f.finding}</p>
                  {f.excerpt && (
                    <p className="mt-1 border-l-2 border-border pl-2 text-xs text-muted-foreground italic">
                      "{f.excerpt}"
                    </p>
                  )}
                </div>
              ))}
            {legal.missingStandardTerms.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Missing standard terms: {legal.missingStandardTerms.join(", ")}
              </p>
            )}
          </div>
        )}
      </AgentCard>

      <AgentCard
        icon={DollarSign}
        title="Finance"
        description="Reuses real business-impact data. Never estimates payment history or invoices — those stay abstained."
        onRun={() =>
          run(
            () => runFinance(supplierId),
            setFinance,
            setFinanceLoading,
            setFinanceError,
            "Couldn't run the Finance agent"
          )
        }
        loading={financeLoading}
        error={financeError}
        hasResult={!!finance}
      >
        {finance && (
          <div className="space-y-2">
            <span
              className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${
                finance.businessImpact.mode === "real"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {finance.businessImpact.mode === "real" ? "Real calculation" : "AI estimate"}
            </span>
            <p className="text-sm">
              {finance.businessImpact.summary ||
                finance.businessImpact.reasoning ||
                "No business impact data yet."}
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
              {finance.paymentHistory.message}
              <br />
              {finance.invoices.message}
            </div>
          </div>
        )}
      </AgentCard>

      <AgentCard
        icon={Leaf}
        title="ESG"
        description="Restates Phase 4 ESG enrichment through a focused ESG lens - not independent analysis."
        onRun={() =>
          run(
            () => runEsg(supplierId),
            setEsg,
            setEsgLoading,
            setEsgError,
            "Couldn't run the ESG agent"
          )
        }
        loading={esgLoading}
        error={esgError}
        hasResult={!!esg}
      >
        {esg && (
          <div className="space-y-2">
            <ConfidenceBadge confidence={esg.esg.confidence} />
            <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              <span>Environmental: {esg.esg.environmentalScore ?? "—"}</span>
              <span>Social: {esg.esg.socialScore ?? "—"}</span>
              <span>Governance: {esg.esg.governanceScore ?? "—"}</span>
            </div>
            <p className="text-sm">{esg.focusedSummary}</p>
          </div>
        )}
      </AgentCard>

      <AgentCard
        icon={Truck}
        title="Logistics"
        description="Restates Phase 4 logistics enrichment through a focused logistics lens."
        onRun={() =>
          run(
            () => runLogistics(supplierId),
            setLogistics,
            setLogisticsLoading,
            setLogisticsError,
            "Couldn't run the Logistics agent"
          )
        }
        loading={logisticsLoading}
        error={logisticsError}
        hasResult={!!logistics}
      >
        {logistics && (
          <div className="space-y-2">
            <ConfidenceBadge confidence={logistics.logistics.confidence} />
            <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              <span>
                On-time delivery:{" "}
                {logistics.logistics.onTimeDeliveryRate != null
                  ? `${logistics.logistics.onTimeDeliveryRate}%`
                  : "—"}
              </span>
              <span>
                Avg. lead time:{" "}
                {logistics.logistics.averageLeadTimeDays != null
                  ? `${logistics.logistics.averageLeadTimeDays}d`
                  : "—"}
              </span>
            </div>
            <p className="text-sm">{logistics.focusedSummary}</p>
          </div>
        )}
      </AgentCard>
    </div>
  )
}

export default AgentsPanel
