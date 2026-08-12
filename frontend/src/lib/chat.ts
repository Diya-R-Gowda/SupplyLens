import api from "@/lib/api"
import type { AskResponse, Conversation } from "@/lib/types"

export async function listConversations(supplierId: string): Promise<Conversation[]> {
  const { data } = await api.get(`/suppliers/${supplierId}/conversations`)
  return data.data as Conversation[]
}

export async function askQuestion(
  supplierId: string,
  question: string,
  conversationId?: string | null
): Promise<AskResponse> {
  const { data } = await api.post(`/rag/${supplierId}`, {
    question,
    conversationId: conversationId || undefined,
  })
  return data.data as AskResponse
}
