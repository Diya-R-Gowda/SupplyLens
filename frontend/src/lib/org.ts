import api from "@/lib/api"
import type { AuditLogsPage, InvitedUser, InviteUserInput, OrgUser, Role } from "@/lib/types"

export async function inviteUser(input: InviteUserInput): Promise<InvitedUser> {
  const { data } = await api.post("/org/invite-user", input)
  return data.data as InvitedUser
}

export async function listOrgUsers(): Promise<OrgUser[]> {
  const { data } = await api.get("/org/users")
  return data.data as OrgUser[]
}

export async function updateUserRole(userId: string, role: Role): Promise<OrgUser> {
  const { data } = await api.patch(`/org/users/${userId}/role`, { role })
  return data.data as OrgUser
}

export async function deleteOrgUser(userId: string): Promise<void> {
  await api.delete(`/org/users/${userId}`)
}

export async function listAuditLogs(
  params: { page?: number; limit?: number } = {}
): Promise<AuditLogsPage> {
  const { data } = await api.get("/org/audit-logs", { params })
  return data.data as AuditLogsPage
}
