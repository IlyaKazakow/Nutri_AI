import { useState } from 'react';
import { motion } from 'motion/react';

interface Profile {
  name: string;
  goal: string;
  target_calories: number;
  weight: number;
  height: number;
  age: number;
  gender: string;
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

export default function ProfileSettings({ profile, onSave }: Props) {
  const [form, setForm] = useState<Profile>(profile);

  const set = (key: keyof Profile, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const field = (label: string, key: keyof Profile, type = 'text') => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as any}
        onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
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
            <button
              key={g}
              onClick={() => set('gender', g)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                form.gender === g ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600'
              }`}
            >
              {g === 'male' ? 'Мужской' : 'Женский'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">Цель</label>
        <div className="flex flex-col gap-2">
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => set('goal', g.value)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                form.goal === g.value ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSave(form)}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-2"
      >
        Сохранить
      </button>
    </motion.div>
  );
}
