export async function analyzeMeal(input: string) {
  const res = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error('analyze failed');
  return res.json();
}

export async function getNutritionAdvice(message: string, meals: any[], profile: any) {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, meals, profile }),
  });
  if (!res.ok) throw new Error('chat failed');
  const data = await res.json();
  return data.text as string;
}
