import api from "@/lib/api"
import type { RiskConfig } from "@/lib/types"

export async function getRiskConfig(): Promise<RiskConfig> {
  const { data } = await api.get("/org/risk-config")
  return data.data as RiskConfig
}

export async function updateRiskConfig(
  input: Partial<Pick<RiskConfig, "riskWeights" | "healthWeights" | "alertThresholds">>
): Promise<RiskConfig> {
  const { data } = await api.patch("/org/risk-config", input)
  return data.data as RiskConfig
}
