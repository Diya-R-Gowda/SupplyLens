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

// --- News ---

export type NewsSentiment = "positive" | "neutral" | "negative"

export interface NewsArticle {
  _id: string
  supplierId: string
  headline: string
  url?: string
  source?: string
  sentiment: NewsSentiment | null
  sentimentScore: number | null
  sentimentConfidence: number | null
  publishedAt: string
}

// --- Digital Twin / explainable risk & health ---

export interface RiskFactors {
  newsScore: number
  expiryScore: number
  docScore: number
  countryScore: number
}

export interface HealthFactors {
  esgScore: number
  logisticsScore: number
  docCompletenessScore: number
  contractHealthScore: number
  riskComponent: number
}

export interface ScoreChange {
  previousScore: number
  newScore: number
  delta: number
  reason: string
  timestamp: string
  narrative?: string
}

export interface Enrichment {
  industry?: string
  companySize?: string
  foundedYear?: number
  summary?: string
  confidence?: number
  enrichedAt?: string
}

export interface EsgData {
  environmentalScore: number | null
  socialScore: number | null
  governanceScore: number | null
  summary?: string | null
  confidence?: number | null
  refreshedAt?: string
}

export interface LogisticsData {
  onTimeDeliveryRate: number | null
  averageLeadTimeDays: number | null
  logisticsNotes?: string | null
  confidence?: number | null
  refreshedAt?: string
}

export type ContractStatus = "active" | "expiring_soon" | "expired" | "unknown"

export interface ProjectedAlert {
  horizonDays: number
  projectedScore: number
  threshold: number
  confidenceInterval: { low: number; high: number }
  confidenceLevel: "low" | "medium"
}

export interface AnomalyDetection {
  status: "ok" | "insufficient_data"
  detected: boolean
  [key: string]: unknown
}

export interface SupplierTwin {
  supplier: { id: string; name: string; category?: string; country: string }
  risk: { score: number; currentFactors: RiskFactors; lastChange: ScoreChange | null }
  health: { score: number; currentFactors: HealthFactors; lastChange: ScoreChange | null }
  enrichment: Enrichment | null
  esg: EsgData | null
  logistics: LogisticsData | null
  documents: { count: number; mostRecent: { fileName: string; uploadedAt: string } | null }
  news: {
    articleCount: number
    sentimentSummary: { positive: number; neutral: number; negative: number; unclassified: number }
    mostRecent: { headline: string; sentiment: NewsSentiment | null; publishedAt: string; url?: string } | null
  }
  contract: { expiry: string | null; daysRemaining: number | null; status: ContractStatus }
  alerts: {
    risk: { breached: boolean; score: number; threshold: number }
    health: { breached: boolean; score: number; threshold: number }
  }
  projectedAlerts: { risk: ProjectedAlert[]; health: ProjectedAlert[] }
  anomalies: {
    compoundingDrift: { risk: AnomalyDetection; health: AnomalyDetection }
    sentimentShift: AnomalyDetection
  }
  generatedAt: string
}

export interface Snapshot {
  _id: string
  supplierId: string
  orgId: string
  reason: string
  state: SupplierTwin
  createdAt: string
  updatedAt: string
}

export interface SnapshotSummary {
  _id: string
  reason: string
  createdAt: string
  riskScore: number | null
  healthScore: number | null
}

export interface RiskHistoryItem {
  timestamp: string
  previousScore: number
  newScore: number
  delta: number
  reason: string
  factors: RiskFactors
}

export interface HealthHistoryItem {
  timestamp: string
  previousScore: number
  newScore: number
  delta: number
  reason: string
  factors: HealthFactors
}

export interface RiskHealthHistory {
  risk: { items: RiskHistoryItem[]; total: number; page: number; limit: number; totalPages: number }
  health: { items: HealthHistoryItem[]; total: number; page: number; limit: number; totalPages: number }
}

// --- Org risk config ---

export interface RiskWeights {
  newsScore: number
  expiryScore: number
  docScore: number
  countryScore: number
}

export interface HealthWeights {
  esgScore: number
  logisticsScore: number
  docCompletenessScore: number
  contractHealthScore: number
  riskComponent: number
}

export interface AlertThresholds {
  riskThreshold: number
  healthThreshold: number
  enabled: boolean
}

export interface RiskConfig {
  riskWeights: RiskWeights
  healthWeights: HealthWeights
  alertThresholds: AlertThresholds
  isDefault: boolean
}

// --- Forecasting ---

export interface ForecastDataQuality {
  pointCount: number
  spanHours: number
  spanDays?: number
  minPointsRequired?: number
  minSpanHoursRequired?: number
  reason?: "no_history" | "too_few_points" | "insufficient_time_spread"
  confidenceLevel?: "low" | "medium"
}

export interface ForecastTrend {
  slope: number
  intercept: number
  anchorTimestamp: string
  direction: "rising" | "falling" | "flat"
}

export interface ForecastProjection {
  horizonDays: number
  projectedScore: number
  confidenceInterval: { low: number; high: number; halfWidth: number }
}

export interface ForecastHistoricalPoint {
  timestamp: string
  score: number
  sampleCount?: number
}

export interface ForecastResult {
  status: "insufficient_data" | "ok"
  dataQuality: ForecastDataQuality
  trend?: ForecastTrend
  projections: ForecastProjection[]
  historical?: ForecastHistoricalPoint[]
}

export interface ForecastBundle {
  risk: ForecastResult
  health: ForecastResult
}

// --- Scenario simulator ---

export interface SimulationResult {
  supplier: { id: string; name: string; category?: string; country: string }
  currentRiskHealth: {
    riskScore: number
    healthScore: number
    riskFactors: RiskFactors
    healthFactors: HealthFactors
  }
  contractStatus: { expiry: string | null; daysRemaining: number | null; status: ContractStatus }
  concentrationRisk: {
    totalOrgSuppliers: number
    categoryPeerCount: number | null
    countryPeerCount: number
    isSoleCategorySource: boolean | null
    isSoleCountrySource: boolean
  }
  dataCompleteness: {
    documentCount: number
    hasEnrichment: boolean
    hasEsg: boolean
    hasLogistics: boolean
    level: "low" | "partial" | "high"
    note: string
  }
  recentNews: {
    articleCount: number
    sentimentCounts: { positive: number; neutral: number; negative: number; unclassified: number }
  }
  generatedAt: string
  summary: string
}

export interface MitigationStrategy {
  strategy: string
  rationale: string
  confidence: number
}

export interface MitigationResult {
  strategies: MitigationStrategy[]
  source: "gemini"
  generatedAt: string
}

export interface AlternativeSupplier {
  supplierId: string
  name: string
  category?: string
  country: string
  riskScore: number
  healthScore: number
  similarityScore: number
  comparedOn: string[]
}

export interface AlternativesResult {
  status: "ok" | "no_alternatives_found"
  reason?: "no_category_set" | "no_other_suppliers_in_category"
  candidatePoolSize: number
  comparisonBasis?: {
    always: string[]
    riskHealthAvailableFor: number
    enrichmentAvailableFor: number
    esgAvailableFor: number
    logisticsAvailableFor: number
  }
  alternatives: AlternativeSupplier[]
  message: string
}

export interface BusinessFieldsInput {
  contractValue?: { amount: number; currency: string }
  estimatedAnnualSpend?: number
  criticalityRating?: number
  dependencyNotes?: string
}

export interface BusinessImpactFields extends BusinessFieldsInput {
  updatedAt?: string
}

export interface BusinessImpactResult {
  mode: "real" | "ai_estimate"
  contractValue?: { amount: number; currency: string } | null
  estimatedAnnualSpend?: number | null
  dailySpendRate?: number | null
  summary?: string
  estimatedAnnualSpendRange?: { low: number; high: number; currency: string } | null
  criticalityRating?: number | null
  reasoning?: string | null
  confidence?: number
  label?: string
  source?: "gemini"
  userProvided: BusinessImpactFields
  computedAt: string
}

export interface RecoveryEstimateResult {
  estimatedRange: string
  reasoning: string | null
  confidence: number
  label: string
  source: "gemini"
  generatedAt: string
}

// --- Multi-agent AI ---

export interface RiskAnalystResult {
  assessment: string
  keyConcerns: string[]
  confidence: number | null
  dataAvailability: {
    riskHistoryPoints: number
    healthHistoryPoints: number
    forecastAvailable: { risk: boolean; health: boolean }
    anomalyDataAvailable: {
      compoundingDriftRisk: boolean
      compoundingDriftHealth: boolean
      sentimentShift: boolean
    }
    alertsEnabled: boolean
  }
  source: "gemini"
  generatedAt: string
}

export type LegalTopic =
  | "termination"
  | "renewal"
  | "compliance"
  | "liability"
  | "payment"
  | "unspecified"

export interface LegalFinding {
  topic: LegalTopic
  finding: string
  excerpt: string | null
}

export interface LegalResult {
  status: "no_documents" | "no_relevant_content" | "ok"
  summary: string
  findings: LegalFinding[]
  missingStandardTerms: string[]
  documentsReviewed: string[]
  topicsCovered?: string[]
  topicsNotFound?: string[]
  confidence: number | null
  source: "gemini" | null
  generatedAt: string
}

export interface FinanceResult {
  businessImpact: BusinessImpactResult
  paymentHistory: { status: "not_available"; message: string }
  invoices: { status: "not_available"; message: string }
  generatedAt: string
}

export interface EsgAgentResult {
  label: string
  scope: string
  esg: EsgData
  focusedSummary: string
  freshlyFetched: boolean
  source: string
  generatedAt: string
}

export interface LogisticsAgentResult {
  label: string
  scope: string
  logistics: LogisticsData
  focusedSummary: string
  freshlyFetched: boolean
  source: string
  generatedAt: string
}

export interface ManagerSummaryResult {
  executiveSummary: string
  topPriorities: string[]
  confidence: number
  inputs: {
    riskAnalyst: { type: string; confidence: number | null }
    legal: { type: string; status: string; confidence: number | null }
    finance: { type: string; mode: string; paymentHistoryStatus: string; invoicesStatus: string }
    esg: { type: string }
    logistics: { type: string }
  }
  source: "gemini"
  generatedAt: string
}

// --- Visualizations (org-wide) ---

export interface ConcentrationNode {
  id: string
  name: string
  category: string | null
  country: string
  riskScore: number
  healthScore: number
  isSoleCategorySource: boolean | null
  isSoleCountrySource: boolean
}

export interface ConcentrationEdge {
  source: string
  target: string
  type: "similarity" | "same_country"
  reason: string
  similarityScore: number | null
  comparedOn: string[]
}

export interface ConcentrationGraphData {
  label: string
  scope: string
  nodes: ConcentrationNode[]
  edges: ConcentrationEdge[]
  soleSourceCount: number
}

export interface SupplierLocation {
  supplierId: string
  name: string
  category: string | null
  country: string
  countryName: string | null
  riskScore: number
  healthScore: number
  lat: number | null
  lng: number | null
  locatable: boolean
}

export interface SupplierLocationsData {
  suppliers: SupplierLocation[]
  totalSuppliers: number
  countriesRepresented: number
  unlocatableCount: number
  granularity: "country_centroid"
}

export interface TimelineEvent {
  type:
    | "supplier_created"
    | "supplier_updated"
    | "document_uploaded"
    | "news_mentioned"
    | "risk_changed"
    | "health_changed"
  timestamp: string
  supplierId: string
  supplierName: string
  fileName?: string
  headline?: string
  sentiment?: NewsSentiment | null
  previousScore?: number
  newScore?: number
  delta?: number
  reason?: string
  factors?: RiskFactors | HealthFactors
  narrative?: string
}

export interface PortfolioTimelineData {
  events: TimelineEvent[]
  totalEvents: number
  suppliersIncluded: number
  truncated: boolean
}

export interface RiskHeatmapCountry {
  country: string
  countryName: string | null
  lat: number
  lng: number
  supplierCount: number
  averageRiskScore: number
  averageHealthScore: number
}

export interface RiskHeatmapData {
  countries: RiskHeatmapCountry[]
  countriesRepresented: number
  granularity: "country_centroid"
}

// --- Org enterprise (admin) ---

export interface InviteUserInput {
  email: string
  password: string
  role: Role
}

export interface InvitedUser {
  email: string
  role: Role
  orgId: string
}

export interface AuditLogEntry {
  _id: string
  action: string
  targetType: string
  targetId: string
  detail: Record<string, unknown>
  userEmail: string | null
  createdAt: string
}

export interface AuditLogsPage {
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}
