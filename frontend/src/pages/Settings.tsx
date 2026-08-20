import { useCallback, useEffect, useState, type FormEvent } from "react"
import { ShieldCheck, UserPlus, ScrollText, Users, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import ErrorState from "@/components/ErrorState"
import { useAuth } from "@/lib/auth"
import { getRiskConfig, updateRiskConfig } from "@/lib/riskConfig"
import { deleteOrgUser, inviteUser, listAuditLogs, listOrgUsers, updateUserRole } from "@/lib/org"
import { getErrorMessage } from "@/lib/errors"
import { formatDate } from "@/lib/format"
import type { AuditLogEntry, HealthWeights, OrgUser, Pagination, Role, RiskConfig, RiskWeights } from "@/lib/types"

const RISK_LABELS: Record<keyof RiskWeights, string> = {
  newsScore: "News sentiment",
  expiryScore: "Contract expiry",
  docScore: "Documents",
  countryScore: "Country risk",
}

const HEALTH_LABELS: Record<keyof HealthWeights, string> = {
  esgScore: "ESG",
  logisticsScore: "Logistics",
  docCompletenessScore: "Document completeness",
  contractHealthScore: "Contract health",
  riskComponent: "Risk (inverted)",
}

function toPercent(fraction: number) {
  return Math.round(fraction * 100)
}

function WeightGroup({
  title,
  weights,
  labels,
  editable,
  onChange,
}: {
  title: string
  weights: Record<string, number>
  labels: Record<string, string>
  editable: boolean
  onChange: (key: string, percent: number) => void
}) {
  const total = Object.values(weights).reduce((sum, v) => sum + v, 0)
  const valid = total === 100

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <span className={`text-xs font-medium ${valid ? "text-emerald-700" : "text-red-700"}`}>
          Total: {total}% {!valid && "(must equal 100%)"}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-2 text-sm">
            <label htmlFor={key}>{label}</label>
            {editable ? (
              <Input
                id={key}
                type="number"
                min={0}
                max={100}
                className="w-20"
                value={weights[key] ?? 0}
                onChange={(e) => onChange(key, Number(e.target.value))}
              />
            ) : (
              <span className="text-muted-foreground">{weights[key] ?? 0}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function RiskConfigSection({ isAdmin }: { isAdmin: boolean }) {
  const [config, setConfig] = useState<RiskConfig | null>(null)
  const [riskPercents, setRiskPercents] = useState<Record<string, number>>({})
  const [healthPercents, setHealthPercents] = useState<Record<string, number>>({})
  const [thresholds, setThresholds] = useState({ riskThreshold: 70, healthThreshold: 30, enabled: true })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getRiskConfig()
      setConfig(data)
      const rp: Record<string, number> = {}
      for (const [k, v] of Object.entries(data.riskWeights)) rp[k] = toPercent(v)
      const hp: Record<string, number> = {}
      for (const [k, v] of Object.entries(data.healthWeights)) hp[k] = toPercent(v)
      setRiskPercents(rp)
      setHealthPercents(hp)
      setThresholds(data.alertThresholds)
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load risk configuration"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const riskTotal = Object.values(riskPercents).reduce((s, v) => s + v, 0)
  const healthTotal = Object.values(healthPercents).reduce((s, v) => s + v, 0)
  const canSave = riskTotal === 100 && healthTotal === 100

  const handleSave = async () => {
    setSaving(true)
    setSaveError("")
    setSaved(false)
    try {
      const riskWeights = Object.fromEntries(
        Object.entries(riskPercents).map(([k, v]) => [k, v / 100])
      ) as unknown as RiskWeights
      const healthWeights = Object.fromEntries(
        Object.entries(healthPercents).map(([k, v]) => [k, v / 100])
      ) as unknown as HealthWeights
      const updated = await updateRiskConfig({ riskWeights, healthWeights, alertThresholds: thresholds })
      setConfig(updated)
      setSaved(true)
    } catch (err) {
      setSaveError(getErrorMessage(err, "Couldn't save risk configuration"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-xl" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!config) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <ShieldCheck className="size-4 text-primary" />
        <h2 className="text-sm font-medium">Risk &amp; health scoring</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        {config.isDefault
          ? "Your organisation is using the default weights."
          : "Your organisation has customized these weights."}
      </p>

      <div className="space-y-3">
        <WeightGroup
          title="Risk score weights"
          weights={riskPercents}
          labels={RISK_LABELS}
          editable={isAdmin}
          onChange={(key, value) => setRiskPercents((p) => ({ ...p, [key]: value }))}
        />
        <WeightGroup
          title="Health score weights"
          weights={healthPercents}
          labels={HEALTH_LABELS}
          editable={isAdmin}
          onChange={(key, value) => setHealthPercents((p) => ({ ...p, [key]: value }))}
        />

        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Alert thresholds</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <label>Risk ≥</label>
              {isAdmin ? (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-20"
                  value={thresholds.riskThreshold}
                  onChange={(e) =>
                    setThresholds((t) => ({ ...t, riskThreshold: Number(e.target.value) }))
                  }
                />
              ) : (
                <span className="text-muted-foreground">{thresholds.riskThreshold}</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <label>Health ≤</label>
              {isAdmin ? (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-20"
                  value={thresholds.healthThreshold}
                  onChange={(e) =>
                    setThresholds((t) => ({ ...t, healthThreshold: Number(e.target.value) }))
                  }
                />
              ) : (
                <span className="text-muted-foreground">{thresholds.healthThreshold}</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <label>Alerts enabled</label>
              {isAdmin ? (
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={thresholds.enabled}
                  onChange={(e) => setThresholds((t) => ({ ...t, enabled: e.target.checked }))}
                />
              ) : (
                <span className="text-muted-foreground">{thresholds.enabled ? "Yes" : "No"}</span>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <Button size="sm" disabled={!canSave || saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {saved && <span className="text-xs text-emerald-700">Saved.</span>}
            {saveError && <span className="text-xs text-red-700">{saveError}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function InviteUserSection() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("viewer")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      const invited = await inviteUser({ email, password, role })
      setSuccess(`${invited.email} added as ${invited.role}.`)
      setEmail("")
      setPassword("")
      setRole("viewer")
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't add team member"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <UserPlus className="size-4 text-primary" />
        <h2 className="text-sm font-medium">Add a team member</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Creates a real, immediately-usable account — share the password with them directly.
      </p>
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
        <Input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password (min 8 chars)"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={submitting} className="sm:col-span-3 sm:w-fit">
          {submitting ? "Adding…" : "Add team member"}
        </Button>
        {error && <p className="text-xs text-red-700 sm:col-span-3">{error}</p>}
        {success && <p className="text-xs text-emerald-700 sm:col-span-3">{success}</p>}
      </form>
    </div>
  )
}

function TeamMembersSection() {
  const { user } = useAuth()
  const [members, setMembers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setMembers(await listOrgUsers())
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load team members"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRoleChange = async (member: OrgUser, role: Role) => {
    setSavingId(member._id)
    setRowErrors((e) => ({ ...e, [member._id]: "" }))
    try {
      const updated = await updateUserRole(member._id, role)
      setMembers((list) => list.map((m) => (m._id === updated._id ? updated : m)))
    } catch (err) {
      setRowErrors((e) => ({ ...e, [member._id]: getErrorMessage(err, "Couldn't update role") }))
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (member: OrgUser) => {
    if (!window.confirm(`Remove ${member.email} from this organisation? This can't be undone.`)) return
    setDeletingId(member._id)
    setRowErrors((e) => ({ ...e, [member._id]: "" }))
    try {
      await deleteOrgUser(member._id)
      setMembers((list) => list.filter((m) => m._id !== member._id))
    } catch (err) {
      setRowErrors((e) => ({ ...e, [member._id]: getErrorMessage(err, "Couldn't remove member") }))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <Skeleton className="h-40 rounded-xl" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Users className="size-4 text-primary" />
        <h2 className="text-sm font-medium">Team members</h2>
      </div>
      <ul className="space-y-1.5">
        {members.map((member) => {
          const isSelf = member.email === user?.email
          return (
            <li key={member._id} className="rounded-lg border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {member.email}
                  {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </span>
                {isSelf ? (
                  <span className="text-xs capitalize text-muted-foreground">{member.role}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleRoleChange(member, v as Role)}
                      disabled={savingId === member._id || deletingId === member._id}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={savingId === member._id || deletingId === member._id}
                      onClick={() => handleDelete(member)}
                      aria-label={`Remove ${member.email}`}
                    >
                      <Trash2 className="size-4 text-red-700" />
                    </Button>
                  </div>
                )}
              </div>
              {rowErrors[member._id] && (
                <p className="mt-1 text-xs text-red-700">{rowErrors[member._id]}</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function AuditLogSection() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await listAuditLogs({ page, limit: 20 })
      setLogs(result.logs)
      setPagination({
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      })
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load audit logs"))
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <ScrollText className="size-4 text-primary" />
        <h2 className="text-sm font-medium">Audit log</h2>
      </div>

      {loading && <Skeleton className="h-40 rounded-lg" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && logs.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No audit entries yet.</p>
      )}
      {!loading && !error && logs.length > 0 && (
        <>
          <ul className="space-y-1.5">
            {logs.map((log) => (
              <li
                key={log._id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{log.action}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {log.userEmail || "unknown user"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
              </li>
            ))}
          </ul>
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Organisation-wide risk scoring, team, and audit history.
        </p>
      </div>

      <RiskConfigSection isAdmin={isAdmin} />

      {isAdmin ? (
        <>
          <InviteUserSection />
          <TeamMembersSection />
          <AuditLogSection />
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Team management and the audit log are admin-only.
        </div>
      )}
    </div>
  )
}

export default Settings
