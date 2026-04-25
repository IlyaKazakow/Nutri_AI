import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface Props {
  onResult: (text: string) => void;
}

export default function VoiceInput({ onResult }: Props) {
  const [isListening, setIsListening] = useState(false);

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) return null;

  const start = () => {
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      onResult(text);
    };
    recognition.start();
  };

  return (
    <button
      title="Начать голосовой ввод"
      onClick={start}
      className={`p-2 rounded-xl transition-colors ${isListening ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-indigo-600'}`}
    >
      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}
