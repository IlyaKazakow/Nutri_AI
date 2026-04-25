import { motion } from 'motion/react';

interface Meal {
  id: number;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Props {
  meals: Meal[];
  targetCalories: number;
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-CA');
  });
}

export default function ProgressStats({ meals, targetCalories }: Props) {
  const days = getLast7Days();

  const byDay = days.map(date => {
    const dayMeals = meals.filter(m => m.date === date);
    return {
      date,
      label: new Date(date).toLocaleDateString('ru', { weekday: 'short' }),
      calories: dayMeals.reduce((s, m) => s + (m.calories || 0), 0),
      protein: dayMeals.reduce((s, m) => s + (m.protein || 0), 0),
      carbs: dayMeals.reduce((s, m) => s + (m.carbs || 0), 0),
      fat: dayMeals.reduce((s, m) => s + (m.fat || 0), 0),
    };
  });

  const maxCal = Math.max(...byDay.map(d => d.calories), targetCalories);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
      <h2 className="font-bold text-lg">Статистика за 7 дней</h2>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Калории по дням</p>
        <div className="flex items-end gap-2 h-32">
          {byDay.map(d => {
            const height = maxCal > 0 ? (d.calories / maxCal) * 100 : 0;
            const onTarget = d.calories <= targetCalories;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                  <div
                    className={`w-full rounded-t-lg transition-all ${onTarget ? 'bg-indigo-500' : 'bg-orange-400'}`}
                    style={{ height: `${height}%`, minHeight: d.calories > 0 ? '4px' : '0' }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{d.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500 inline-block" /> В норме</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block" /> Превышение</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Среднее ккал', value: Math.round(byDay.reduce((s, d) => s + d.calories, 0) / 7), unit: 'ккал' },
          { label: 'Средний белок', value: Math.round(byDay.reduce((s, d) => s + d.protein, 0) / 7), unit: 'г' },
          { label: 'Средние жиры', value: Math.round(byDay.reduce((s, d) => s + d.fat, 0) / 7), unit: 'г' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="font-bold text-xl text-indigo-600">{stat.value}<span className="text-sm font-normal text-slate-400">{stat.unit}</span></div>
            <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
