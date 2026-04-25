import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';
import VoiceInput from './VoiceInput';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface Props {
  onSendMessage: (msg: string) => Promise<string | undefined>;
}

export default function AIChat({ onSendMessage }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Привет! Я ваш диетолог-ассистент. Спросите меня о питании, калориях или рационе.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isLoading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsLoading(true);
    try {
      const reply = await onSendMessage(msg);
      setMessages(prev => [...prev, { role: 'ai', text: reply || 'Не удалось получить ответ.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Ошибка соединения. Попробуйте ещё раз.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-white text-slate-800 shadow-sm rounded-bl-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 bg-white rounded-2xl shadow-sm p-2">
        <VoiceInput onResult={send} />
        <input
          className="flex-1 bg-transparent text-sm px-2 focus:outline-none"
          placeholder="Написать..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || isLoading}
          className="bg-indigo-600 text-white p-2 rounded-xl disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
