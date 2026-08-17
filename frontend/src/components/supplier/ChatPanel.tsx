import { useEffect, useRef, useState, type FormEvent } from "react"
import { Bot, Plus, Send, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { askQuestion, listConversations } from "@/lib/chat"
import { getErrorMessage } from "@/lib/errors"
import type { ChatMessage, Conversation, DocumentRecord } from "@/lib/types"
import ConfidenceBadge from "@/components/badges/ConfidenceBadge"

function conversationLabel(conversation: Conversation) {
  const firstQuestion =
    conversation.messages.find((m) => m.role === "user")?.content || "Conversation"
  const preview =
    firstQuestion.length > 40 ? `${firstQuestion.slice(0, 40)}…` : firstQuestion
  const date = new Date(conversation.updatedAt).toLocaleDateString()
  return `${preview} (${date})`
}

function SourceChips({
  sources,
  documents,
}: {
  sources: string[]
  documents: DocumentRecord[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((fileName) => {
        const doc = documents.find((d) => d.fileName === fileName)
        const chip = (
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {fileName}
          </span>
        )
        return doc ? (
          <a key={fileName} href={`#document-${doc._id}`} className="hover:opacity-80">
            {chip}
          </a>
        ) : (
          <span key={fileName}>{chip}</span>
        )
      })}
    </div>
  )
}

function ChatPanel({
  supplierId,
  documents,
}: {
  supplierId: string
  documents: DocumentRecord[]
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState("")
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConversations = async () => {
    try {
      const list = await listConversations(supplierId)
      setConversations(list)
    } catch {
      setConversations([])
    }
  }

  useEffect(() => {
    setConversationId(null)
    setMessages([])
    setError("")
    loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, asking])

  const startNewConversation = () => {
    setConversationId(null)
    setMessages([])
  }

  const selectConversation = (id: string) => {
    if (id === "new") {
      startNewConversation()
      return
    }
    const conversation = conversations.find((c) => c._id === id)
    if (!conversation) return
    setConversationId(conversation._id)
    setMessages(conversation.messages)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || asking) return

    setError("")
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed, timestamp: new Date().toISOString() },
    ])
    setQuestion("")
    setAsking(true)

    try {
      const result = await askQuestion(supplierId, trimmed, conversationId)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          timestamp: new Date().toISOString(),
          sources: result.sources,
          confidence: result.confidence,
        },
      ])
      const isNewConversation = !conversationId
      setConversationId(result.conversationId)
      if (isNewConversation) loadConversations()
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't get an answer"))
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Bot className="size-4 text-primary" />
          AI Contract Assistant
        </h2>
        <Button variant="ghost" size="sm" onClick={startNewConversation}>
          <Plus className="size-4" />
          New
        </Button>
      </div>

      {conversations.length > 0 && (
        <Select value={conversationId || "new"} onValueChange={selectConversation}>
          <SelectTrigger className="mb-3 w-full">
            <SelectValue placeholder="New conversation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New conversation</SelectItem>
            {conversations.map((conversation) => (
              <SelectItem key={conversation._id} value={conversation._id}>
                {conversationLabel(conversation)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && !asking && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {documents.length === 0
              ? "Upload a document above, then ask a question about it."
              : "No chat history yet. Ask a question about this supplier's documents."}
          </p>
        )}

        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              {message.role === "user" ? (
                <User className="size-3.5" />
              ) : (
                <Bot className="size-3.5" />
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${
                message.role === "user"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === "assistant" && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <ConfidenceBadge confidence={message.confidence} />
                  {message.sources && message.sources.length > 0 && (
                    <SourceChips sources={message.sources} documents={documents} />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {asking && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
              <Bot className="size-3.5" />
            </div>
            <span className="animate-pulse">Thinking…</span>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <Input
          placeholder="Ask about this supplier's documents…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={asking}
        />
        <Button type="submit" size="icon" disabled={asking || !question.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}

export default ChatPanel
