import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Send, Bot, Plus } from 'lucide-react';

const toDisplayMessages = (messages = []) =>
  messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'bot',
    text: m.content,
    sources: m.sources,
  }));

const conversationLabel = (conversation) => {
  const firstQuestion = conversation.messages?.find((m) => m.role === 'user')?.content || 'Conversation';
  const date = conversation.updatedAt ? new Date(conversation.updatedAt).toLocaleDateString() : '';
  const preview = firstQuestion.length > 40 ? `${firstQuestion.slice(0, 40)}...` : firstQuestion;
  return date ? `${preview} (${date})` : preview;
};

export default function RagChatDrawer({ supplierId }) {
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);

  const loadConversations = async () => {
    try {
      const res = await api.get(`/suppliers/${supplierId}/conversations`);
      setConversations(res.data.data || []);
    } catch {
      setConversations([]);
    }
  };

  useEffect(() => {
    setConversationId(null);
    setChat([]);
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const startNewConversation = () => {
    setConversationId(null);
    setChat([]);
  };

  const selectConversation = (event) => {
    const id = event.target.value;
    if (!id) {
      startNewConversation();
      return;
    }
    const conversation = conversations.find((c) => c._id === id);
    if (!conversation) return;
    setConversationId(conversation._id);
    setChat(toDisplayMessages(conversation.messages));
  };

  const askQuestion = async () => {
    if (!query) return;
    setLoading(true);
    const userMsg = { role: 'user', text: query };
    setChat((prev) => [...prev, userMsg]);

    try {
      const res = await api.post(`/rag/${supplierId}`, { question: query, conversationId });
      const { answer, conversationId: returnedConversationId, sources } = res.data.data;
      setChat((prev) => [...prev, { role: 'bot', text: answer, sources }]);
      if (returnedConversationId) {
        const isNewConversation = !conversationId;
        setConversationId(returnedConversationId);
        if (isNewConversation) loadConversations();
      }
    } catch (err) {
      setChat((prev) => [...prev, { role: 'bot', text: 'Error connecting to AI.' }]);
    }
    setQuery('');
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l w-96 p-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="font-bold flex items-center gap-2 m-0"><Bot size={20}/> AI Contract Analyst</h3>
        <button
          onClick={startNewConversation}
          title="Start a new conversation"
          className="flex items-center gap-1 text-xs border rounded-md px-2 py-1 bg-white"
        >
          <Plus size={14}/> New
        </button>
      </div>

      {conversations.length > 0 ? (
        <select
          value={conversationId || ''}
          onChange={selectConversation}
          className="mb-3 border rounded-md p-1.5 text-sm bg-white"
        >
          <option value="">New conversation</option>
          {conversations.map((conversation) => (
            <option key={conversation._id} value={conversation._id}>
              {conversationLabel(conversation)}
            </option>
          ))}
        </select>
      ) : null}

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {chat.map((msg, i) => (
          <div key={i} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white ml-8' : 'bg-white border mr-8'}`}>
            <div>{msg.text}</div>
            {msg.role === 'bot' && msg.sources?.length ? (
              <div className="mt-1.5 text-xs text-slate-500">Source: {msg.sources.join(', ')}</div>
            ) : null}
          </div>
        ))}
        {loading && <div className="text-slate-400 animate-pulse text-sm">Thinking...</div>}
      </div>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border rounded-md p-2"
          placeholder="Ask about the contract..."
        />
        <button onClick={askQuestion} className="bg-blue-600 text-white p-2 rounded-md"><Send size={18}/></button>
      </div>
    </div>
  );
}
