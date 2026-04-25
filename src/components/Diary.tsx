import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';

interface Meal {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  type: string;
  date: string;
  time: string;
}

interface Props {
  meals: Meal[];
  onDelete: (id: number) => void;
  targetCalories: number;
}

const TYPE_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

export default function Diary({ meals, onDelete, targetCalories }: Props) {
  const today = new Date().toLocaleDateString('en-CA');
  const todayMeals = meals.filter(m => m.date === today);
  const totalCalories = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProtein = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = todayMeals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = todayMeals.reduce((s, m) => s + (m.fat || 0), 0);
  const progress = Math.min((totalCalories / targetCalories) * 100, 100);

  const grouped: Record<string, Meal[]> = {};
  for (const m of todayMeals) {
    const key = m.type || 'snack';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="font-bold text-lg">{totalCalories} ккал</span>
          <span className="text-sm text-slate-400">из {targetCalories}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div><div className="font-semibold text-indigo-600">{totalProtein}г</div><div className="text-slate-400 text-xs">Белки</div></div>
          <div><div className="font-semibold text-orange-500">{totalCarbs}г</div><div className="text-slate-400 text-xs">Углеводы</div></div>
          <div><div className="font-semibold text-yellow-500">{totalFat}г</div><div className="text-slate-400 text-xs">Жиры</div></div>
        </div>
      </div>

      {Object.keys(TYPE_LABELS).map(type => {
        const items = grouped[type];
        if (!items?.length) return null;
        return (
          <div key={type} className="mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
              {TYPE_LABELS[type]}
            </h3>
            {items.map(meal => (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl p-4 mb-2 shadow-sm flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{meal.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {meal.calories} ккал · Б{meal.protein}г · У{meal.carbs}г · Ж{meal.fat}г · {meal.time}
                  </p>
                </div>
                <button onClick={() => onDelete(meal.id)} className="text-slate-300 hover:text-red-400 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        );
      })}

      {todayMeals.length === 0 && (
        <div className="text-center text-slate-400 py-16 text-sm">
          Записей за сегодня нет.<br />Нажмите «Добавить», чтобы начать.
        </div>
      )}
    </motion.div>
  );
}
