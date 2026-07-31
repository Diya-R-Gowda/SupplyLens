import { useState } from 'react';
import api from '../api/axios';
import { Send, Bot, User } from 'lucide-react';

export default function RagChatDrawer({ supplierId }) {
  const [query, setQuery] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!query) return;
    setLoading(true);
    const userMsg = { role: 'user', text: query };
    setChat([...chat, userMsg]);
    
    try {
      const res = await api.post(`/rag/${supplierId}`, { question: query });
      setChat(prev => [...prev, { role: 'bot', text: res.data.data.answer }]);
    } catch (err) {
      setChat(prev => [...prev, { role: 'bot', text: 'Error connecting to AI.' }]);
    }
    setQuery('');
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l w-96 p-4">
      <h3 className="font-bold mb-4 flex items-center gap-2"><Bot size={20}/> AI Contract Analyst</h3>
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {chat.map((msg, i) => (
          <div key={i} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white ml-8' : 'bg-white border mr-8'}`}>
            {msg.text}
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