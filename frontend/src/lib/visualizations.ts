import api from "@/lib/api"
import type {
  ConcentrationGraphData,
  PortfolioTimelineData,
  RiskHeatmapData,
  SupplierLocationsData,
} from "@/lib/types"

export async function getConcentrationGraph(): Promise<ConcentrationGraphData> {
  const { data } = await api.get("/org/concentration-graph")
  return data.data as ConcentrationGraphData
}

export async function getSupplierLocations(): Promise<SupplierLocationsData> {
  const { data } = await api.get("/org/supplier-locations")
  return data.data as SupplierLocationsData
}

export interface TimelineParams {
  supplierId?: string
  days?: number
  limit?: number
}

export async function getPortfolioTimeline(
  params: TimelineParams = {}
): Promise<PortfolioTimelineData> {
  const { data } = await api.get("/org/timeline", { params })
  return data.data as PortfolioTimelineData
}

export async function getRiskHeatmap(): Promise<RiskHeatmapData> {
  const { data } = await api.get("/org/risk-heatmap")
  return data.data as RiskHeatmapData
}
