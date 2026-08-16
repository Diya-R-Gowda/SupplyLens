import api from "@/lib/api"
import type {
  Enrichment,
  EsgData,
  LogisticsData,
  Pagination,
  RiskHealthHistory,
  Snapshot,
  SnapshotSummary,
  SupplierTwin,
} from "@/lib/types"

export async function getTwin(supplierId: string): Promise<SupplierTwin | null> {
  const { data } = await api.get(`/suppliers/${supplierId}/twin`)
  return data.data as SupplierTwin | null
}

export async function getRiskHealthHistory(
  supplierId: string,
  params: { limit?: number; days?: number } = {}
): Promise<RiskHealthHistory> {
  const { data } = await api.get(`/suppliers/${supplierId}/risk-health-history`, { params })
  return data.data as RiskHealthHistory
}

export async function takeSnapshot(supplierId: string): Promise<Snapshot> {
  const { data } = await api.post(`/suppliers/${supplierId}/snapshot`)
  return data.data as Snapshot
}

export async function listSnapshots(
  supplierId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ snapshots: SnapshotSummary[]; pagination: Pagination }> {
  const { data } = await api.get(`/suppliers/${supplierId}/snapshots`, { params })
  return { snapshots: data.data as SnapshotSummary[], pagination: data.meta.pagination as Pagination }
}

export async function getSnapshot(supplierId: string, snapshotId: string): Promise<Snapshot> {
  const { data } = await api.get(`/suppliers/${supplierId}/snapshots/${snapshotId}`)
  return data.data as Snapshot
}

export async function enrichSupplier(supplierId: string): Promise<Enrichment> {
  const { data } = await api.post(`/suppliers/${supplierId}/enrich`)
  return data.data as Enrichment
}

export async function refreshEsg(supplierId: string): Promise<EsgData> {
  const { data } = await api.post(`/suppliers/${supplierId}/esg-refresh`)
  return data.data as EsgData
}

export async function refreshLogistics(supplierId: string): Promise<LogisticsData> {
  const { data } = await api.post(`/suppliers/${supplierId}/logistics-refresh`)
  return data.data as LogisticsData
}
