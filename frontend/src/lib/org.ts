import api from "@/lib/api"
import type { AuditLogsPage, InvitedUser, InviteUserInput } from "@/lib/types"

export async function inviteUser(input: InviteUserInput): Promise<InvitedUser> {
  const { data } = await api.post("/org/invite-user", input)
  return data.data as InvitedUser
}

export async function listAuditLogs(
  params: { page?: number; limit?: number } = {}
): Promise<AuditLogsPage> {
  const { data } = await api.get("/org/audit-logs", { params })
  return data.data as AuditLogsPage
}
