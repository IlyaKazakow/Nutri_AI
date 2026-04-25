import { useState, useEffect } from 'react';
import { Plus, MessageSquare, Book, Settings as SettingsIcon, Sparkles, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Diary from './components/Diary';
import AIChat from './components/AIChat';
import ProfileSettings from './components/ProfileSettings';
import ProgressStats from './components/ProgressStats';
import { analyzeMeal, getNutritionAdvice } from './services/gemini';

export default function App() {
  const [activeTab, setActiveTab] = useState<'diary' | 'chat' | 'settings' | 'stats'>('diary');
  const [meals, setMeals] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({
    name: '', goal: 'maintain', target_calories: 2000,
    weight: 70, height: 170, age: 25, gender: 'male'
  });
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [mealInput, setMealInput] = useState('');
  const [isProcessingMeal, setIsProcessingMeal] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  useEffect(() => {
    fetchMeals();
    fetchProfile();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) setIsSpeechSupported(false);
  }, []);

  const fetchMeals = async () => {
    const res = await fetch('/api/meals');
    const data = await res.json();
    setMeals(data);
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.id) {
        setProfile(data);
        localStorage.setItem('nutriai_profile', JSON.stringify(data));
      } else {
        const local = localStorage.getItem('nutriai_profile');
        if (local) setProfile(JSON.parse(local));
      }
    } catch (e) {
      const local = localStorage.getItem('nutriai_profile');
      if (local) setProfile(JSON.parse(local));
    }
  };

  const handleAddMeal = async (text?: string) => {
    const input = text || mealInput;
    if (!input.trim()) return;
    setIsProcessingMeal(true);
    try {
      const mealInfo = await analyzeMeal(input);
      if (mealInfo) {
        const now = new Date();
        const payload = {
          ...mealInfo,
          date: now.toLocaleDateString('en-CA'),
          time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        };
        const res = await fetch('/api/meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchMeals();
          setMealInput('');
          setIsAddingMeal(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingMeal(false);
    }
  };

  const handleDeleteMeal = async (id: number) => {
    await fetch(`/api/meals/${id}`, { method: 'DELETE' });
    fetchMeals();
  };

  const handleSaveProfile = async (newProfile: any) => {
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      });
      setProfile(newProfile);
      localStorage.setItem('nutriai_profile', JSON.stringify(newProfile));
      setActiveTab('diary');
    } catch (e) {
      setProfile(newProfile);
      localStorage.setItem('nutriai_profile', JSON.stringify(newProfile));
      setActiveTab('diary');
    }
  };

  const handleAIChat = async (message: string) => {
    return await getNutritionAdvice(message, meals, profile);
  };

  const triggerVoiceAssistant = () => {
    setActiveTab('chat');
    setTimeout(() => {
      const voiceBtn = document.querySelector('[title="Начать голосовой ввод"]') as HTMLButtonElement;
      voiceBtn?.click();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 h-14 flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-base tracking-tight">НутриИИ</h1>
        </div>
      </header>

      <main className={`mx-auto px-4 py-6 pb-40 ${activeTab === 'chat' ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'diary' && <Diary meals={meals} onDelete={handleDeleteMeal} targetCalories={profile.target_calories || 2000} />}
          {activeTab === 'chat' && <AIChat onSendMessage={handleAIChat} />}
          {activeTab === 'stats' && <ProgressStats meals={meals} targetCalories={profile.target_calories || 2000} />}
          {activeTab === 'settings' && <ProfileSettings profile={profile} onSave={handleSaveProfile} />}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 border-t border-slate-100 flex h-16 items-center px-6">
        <button onClick={() => setActiveTab('diary')} className={`flex-1 flex flex-col items-center ${activeTab === 'diary' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Book className="w-6 h-6" /><span className="text-[10px] font-bold">Дневник</span>
        </button>
        <button onClick={() => setActiveTab('stats')} className={`flex-1 flex flex-col items-center ${activeTab === 'stats' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <BarChart2 className="w-6 h-6" /><span className="text-[10px] font-bold">Статистика</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex-1 flex flex-col items-center ${activeTab === 'chat' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <MessageSquare className="w-6 h-6" /><span className="text-[10px] font-bold">Помощник</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 flex flex-col items-center ${activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <SettingsIcon className="w-6 h-6" /><span className="text-[10px] font-bold">Профиль</span>
        </button>
      </nav>

      {(activeTab === 'diary' || activeTab === 'stats') && (
        <div className="fixed bottom-24 left-6 z-40 flex flex-col items-start gap-3">
          {isSpeechSupported && (
            <motion.button onClick={triggerVoiceAssistant} className="relative bg-white text-indigo-600 p-4 rounded-full shadow-xl">
              <MessageSquare className="w-6 h-6" />
              <Sparkles className="w-4 h-4 absolute -top-1 -right-1 text-indigo-400" />
            </motion.button>
          )}
          {activeTab === 'diary' && (
            <button
              onClick={() => setIsAddingMeal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-full font-bold shadow-xl"
            >
              <Plus className="w-5 h-5" />Добавить
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {isAddingMeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end"
            onClick={() => setIsAddingMeal(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full bg-white rounded-t-2xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <p className="font-bold text-base mb-3">Что вы съели?</p>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                rows={3}
                placeholder="Например: тарелка гречки с курицей и салат"
                value={mealInput}
                onChange={e => setMealInput(e.target.value)}
                autoFocus
              />
              <button
                onClick={() => handleAddMeal()}
                disabled={isProcessingMeal || !mealInput.trim()}
                className="mt-3 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {isProcessingMeal ? 'Анализирую...' : 'Добавить'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
