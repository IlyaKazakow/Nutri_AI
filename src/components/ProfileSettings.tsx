import { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, BellOff } from 'lucide-react';
import { registerPush } from '../services/notifications';

interface Profile {
  name: string;
  goal: string;
  target_calories: number;
  weight: number;
  height: number;
  age: number;
  gender: string;
  breakfast_time?: string;
  lunch_time?: string;
  dinner_time?: string;
  snack_time?: string;
  notifications_enabled?: boolean;
}

interface Props {
  profile: Profile;
  onSave: (p: Profile) => void;
}

const GOALS = [
  { value: 'lose', label: 'Похудеть' },
  { value: 'maintain', label: 'Поддержать вес' },
  { value: 'gain', label: 'Набрать массу' },
];

const MEAL_TIMES = [
  { key: 'breakfast_time', label: 'Завтрак' },
  { key: 'lunch_time',     label: 'Обед' },
  { key: 'dinner_time',    label: 'Ужин' },
  { key: 'snack_time',     label: 'Перекус' },
];

export default function ProfileSettings({ profile, onSave }: Props) {
  const [form, setForm] = useState<Profile>(profile);
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle');

  const set = (key: keyof Profile, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleNotificationToggle = async () => {
    if (form.notifications_enabled) {
      set('notifications_enabled', false);
      return;
    }
    setPushStatus('loading');
    const ok = await registerPush();
    setPushStatus(ok ? 'done' : 'denied');
    if (ok) set('notifications_enabled', true);
  };

  const field = (label: string, key: keyof Profile, type = 'text') => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as any ?? ''}
        onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 pb-6">
      <h2 className="font-bold text-lg">Профиль</h2>

      {field('Имя', 'name')}
      {field('Возраст', 'age', 'number')}
      {field('Вес (кг)', 'weight', 'number')}
      {field('Рост (см)', 'height', 'number')}
      {field('Целевые калории', 'target_calories', 'number')}

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Пол</label>
        <div className="flex gap-2">
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => set('gender', g)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                form.gender === g ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600'
              }`}>
              {g === 'male' ? 'Мужской' : 'Женский'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Цель</label>
        <div className="flex flex-col gap-2">
          {GOALS.map(g => (
            <button key={g.value} onClick={() => set('goal', g.value)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                form.goal === g.value ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600'
              }`}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Напоминания */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Напоминания о еде</p>
            <p className="text-xs text-slate-400 mt-0.5">Уведомление в указанное время</p>
          </div>
          <button onClick={handleNotificationToggle} disabled={pushStatus === 'loading'}
            className={`p-2.5 rounded-xl transition-colors ${
              form.notifications_enabled ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
            }`}>
            {form.notifications_enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>
        </div>

        {pushStatus === 'denied' && (
          <p className="text-xs text-red-500">Разрешите уведомления в настройках браузера</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {MEAL_TIMES.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-slate-500 mb-1">{label}</label>
              <input
                type="time"
                value={(form as any)[key] || ''}
                onChange={e => set(key as keyof Profile, e.target.value)}
                disabled={!form.notifications_enabled}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40"
              />
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => onSave(form)} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">
        Сохранить
      </button>
    </motion.div>
  );
}
