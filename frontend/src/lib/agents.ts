import api from "@/lib/api"
import type {
  EsgAgentResult,
  FinanceResult,
  LegalResult,
  LogisticsAgentResult,
  ManagerSummaryResult,
  RiskAnalystResult,
} from "@/lib/types"

export async function runRiskAnalyst(supplierId: string): Promise<RiskAnalystResult> {
  const { data } = await api.post(`/suppliers/${supplierId}/agents/risk-analyst`)
  return data.data as RiskAnalystResult
}

export async function runLegal(supplierId: string): Promise<LegalResult> {
  const { data } = await api.post(`/suppliers/${supplierId}/agents/legal`)
  return data.data as LegalResult
}

export async function runFinance(supplierId: string): Promise<FinanceResult> {
  const { data } = await api.post(`/suppliers/${supplierId}/agents/finance`)
  return data.data as FinanceResult
}

export async function runEsg(supplierId: string): Promise<EsgAgentResult> {
  const { data } = await api.post(`/suppliers/${supplierId}/agents/esg`)
  return data.data as EsgAgentResult
}

export async function runLogistics(supplierId: string): Promise<LogisticsAgentResult> {
  const { data } = await api.post(`/suppliers/${supplierId}/agents/logistics`)
  return data.data as LogisticsAgentResult
}

export async function runManagerSummary(supplierId: string): Promise<ManagerSummaryResult> {
  const { data } = await api.post(`/suppliers/${supplierId}/agents/manager-summary`)
  return data.data as ManagerSummaryResult
}
