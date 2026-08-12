export const CATEGORY_OPTIONS = [
  { value: "raw_material", label: "Raw Material" },
  { value: "logistics", label: "Logistics" },
  { value: "saas", label: "SaaS" },
  { value: "other", label: "Other" },
] as const

export function formatCategory(category?: string) {
  if (!category) return "Uncategorized"
  return category.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatRelativeTime(iso: string) {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
