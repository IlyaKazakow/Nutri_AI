import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export async function analyzeMeal(input: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Проанализируй прием пищи: "${input}". Верни JSON с полями: name, calories, protein, carbs, fat, type (breakfast, lunch, dinner, snack).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          type: { type: Type.STRING },
        },
      },
    },
  });
  return JSON.parse(response.text || "null");
}

export async function getNutritionAdvice(query: string, history: any[], profile: any) {
  const chat = ai.chats.create({
    model: "gemini-2.0-flash",
    config: {
      systemInstruction: `Ты — профессиональный диетолог. Учитывай данные пользователя: ${JSON.stringify(profile)}, историю питания: ${JSON.stringify(history)}. Отвечай на русском.`,
    },
  });
  const res = await chat.sendMessage({ message: query });
  return res.text;
}

export async function textToSpeech(text: string): Promise<string | null> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
}
