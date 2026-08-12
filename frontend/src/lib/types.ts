export type Role = "admin" | "viewer"

export interface User {
  email: string
  role: Role
  orgId: string
}

export interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

export type SupplierCategory = "raw_material" | "logistics" | "saas" | "other"

export interface Supplier {
  _id: string
  name: string
  category?: SupplierCategory
  country: string
  riskScore?: number
  healthScore?: number
  contractExpiry?: string | null
  paymentTerms?: string
  orgId: string
  createdAt: string
  updatedAt: string
}

export interface SupplierInput {
  name: string
  country: string
  category?: SupplierCategory
  riskScore?: number
  paymentTerms?: string
  contractExpiry?: string | null
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface RecentActivityEntry {
  _id: string
  name: string
  category?: SupplierCategory
  riskScore?: number
  updatedAt: string
}

export interface GrowthPoint {
  date: string
  count: number
}

export interface DashboardStats {
  totalSuppliers: number
  averageRiskScore: number
  averageHealthScore: number
  byCategory: { category: string; count: number }[]
  newSuppliers: { last7Days: number; last30Days: number }
  growthSeries: GrowthPoint[]
  recentActivity: RecentActivityEntry[]
}

export interface DocumentRecord {
  _id: string
  supplierId: string
  fileName: string
  totalChunks: number
  uploadedAt: string
  gridFsFileId?: string
}

export type ChatRole = "user" | "assistant"

export interface ChatMessage {
  role: ChatRole
  content: string
  timestamp: string
  // Source filenames only (server never returns a doc id here) - matched
  // back against the loaded document list by filename to link a chip.
  sources?: string[]
}

export interface Conversation {
  _id: string
  supplierId: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface AskResponse {
  answer: string
  conversationId: string
  sources: string[]
}
