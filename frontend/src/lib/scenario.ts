import api from "@/lib/api"
import type {
  AlternativesResult,
  BusinessFieldsInput,
  BusinessImpactFields,
  BusinessImpactResult,
  MitigationResult,
  RecoveryEstimateResult,
  SimulationResult,
} from "@/lib/types"

export async function simulateFailure(supplierId: string): Promise<SimulationResult> {
  const { data } = await api.post(`/suppliers/${supplierId}/simulate-failure`)
  return data.data as SimulationResult
}

export async function generateMitigation(supplierId: string): Promise<MitigationResult> {
  const { data } = await api.post(`/suppliers/${supplierId}/mitigation-strategies`)
  return data.data as MitigationResult
}

export async function getAlternatives(supplierId: string): Promise<AlternativesResult> {
  const { data } = await api.get(`/suppliers/${supplierId}/alternatives`)
  return data.data as AlternativesResult
}

export async function updateBusinessFields(
  supplierId: string,
  input: BusinessFieldsInput
): Promise<BusinessImpactFields> {
  const { data } = await api.patch(`/suppliers/${supplierId}/business-fields`, input)
  return data.data as BusinessImpactFields
}

export async function getBusinessImpact(supplierId: string): Promise<BusinessImpactResult> {
  const { data } = await api.get(`/suppliers/${supplierId}/business-impact`)
  return data.data as BusinessImpactResult
}

export async function getRecoveryEstimate(supplierId: string): Promise<RecoveryEstimateResult> {
  const { data } = await api.get(`/suppliers/${supplierId}/recovery-estimate`)
  return data.data as RecoveryEstimateResult
}
