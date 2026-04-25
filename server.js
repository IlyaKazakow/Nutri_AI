import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import webpush from "web-push";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "diary.db"));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    time TEXT,
    name TEXT NOT NULL,
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    type TEXT
  );

  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT,
    goal TEXT,
    target_calories INTEGER,
    weight REAL,
    height REAL,
    age INTEGER,
    gender TEXT
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    subscription TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Добавляем колонки времени приёмов пищи если их нет
['breakfast_time', 'lunch_time', 'dinner_time', 'snack_time', 'notifications_enabled'].forEach(col => {
  try { db.exec(`ALTER TABLE user_profile ADD COLUMN ${col} TEXT`); } catch {}
});

// VAPID ключи — генерируем один раз и храним в БД
let vapidPublicKey = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('vapid_public')?.value;
let vapidPrivateKey = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('vapid_private')?.value;

if (!vapidPublicKey || !vapidPrivateKey) {
  const keys = webpush.generateVAPIDKeys();
  vapidPublicKey = keys.publicKey;
  vapidPrivateKey = keys.privateKey;
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run('vapid_public', vapidPublicKey);
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run('vapid_private', vapidPrivateKey);
}

webpush.setVapidDetails('mailto:admin@nutriai.app', vapidPublicKey, vapidPrivateKey);

// Проверяем время приёмов пищи каждую минуту и шлём push
setInterval(async () => {
  const profile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
  if (!profile?.notifications_enabled || profile.notifications_enabled === '0') return;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const slots = [
    { time: profile.breakfast_time, name: 'Завтрак' },
    { time: profile.lunch_time,     name: 'Обед' },
    { time: profile.dinner_time,    name: 'Ужин' },
    { time: profile.snack_time,     name: 'Перекус' },
  ];

  for (const slot of slots) {
    if (!slot.time || slot.time !== currentTime) continue;
    const subscriptions = db.prepare('SELECT subscription FROM push_subscriptions').all();
    const payload = JSON.stringify({
      title: `Время: ${slot.name}`,
      body: 'Откройте НутриИИ и запишите что вы съели!',
    });
    for (const row of subscriptions) {
      try {
        await webpush.sendNotification(JSON.parse(row.subscription), payload);
      } catch {
        try { db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(JSON.parse(row.subscription).endpoint); } catch {}
      }
    }
  }
}, 60000);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Push: VAPID public key
  app.get("/api/push/key", (req, res) => {
    res.json({ key: vapidPublicKey });
  });

  // Push: сохранить подписку
  app.post("/api/push/subscribe", (req, res) => {
    const { subscription } = req.body;
    db.prepare('INSERT OR REPLACE INTO push_subscriptions (endpoint, subscription) VALUES (?, ?)')
      .run(subscription.endpoint, JSON.stringify(subscription));
    res.json({ success: true });
  });

  // Gemini endpoints
  app.post("/api/ai/analyze-image", async (req, res) => {
    try {
      const { imageData, mimeType } = req.body;
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: "v1" });
      const result = await model.generateContent([
        { inlineData: { data: imageData, mimeType: mimeType || "image/jpeg" } },
        `Проанализируй еду на фото. Верни ТОЛЬКО JSON без markdown с полями: name (string, название блюда на русском), calories (number), protein (number, граммы), carbs (number, граммы), fat (number, граммы), type (одно из: breakfast, lunch, dinner, snack).`,
      ]);
      const text = result.response.text().trim().replace(/```json|```/g, '');
      res.json(JSON.parse(text));
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { input } = req.body;
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: "v1" });
      const result = await model.generateContent(
        `Проанализируй прием пищи: "${input}". Верни ТОЛЬКО JSON без markdown, с полями: name (string), calories (number), protein (number), carbs (number), fat (number), type (одно из: breakfast, lunch, dinner, snack).`
      );
      const text = result.response.text().trim().replace(/```json|```/g, '');
      res.json(JSON.parse(text));
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, meals, profile } = req.body;
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: "v1" });
      const prompt = `Ты — профессиональный диетолог. Данные пользователя: ${JSON.stringify(profile)}. История питания: ${JSON.stringify(meals)}. Отвечай на русском.\n\nВопрос: ${message}`;
      const result = await model.generateContent(prompt);
      res.json({ text: result.response.text() });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/meals", (req, res) => {
    try {
      const meals = db.prepare("SELECT * FROM meals ORDER BY date DESC, time DESC").all();
      res.json(meals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meals" });
    }
  });

  app.post("/api/meals", (req, res) => {
    try {
      const { name, calories, protein, carbs, fat, type, date, time } = req.body;
      const mealDate = date || new Date().toLocaleDateString('en-CA');
      const mealTime = time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const info = db.prepare(
        "INSERT INTO meals (name, calories, protein, carbs, fat, type, date, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(name, calories, protein, carbs, fat, type, mealDate, mealTime);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Failed to add meal" });
    }
  });

  app.delete("/api/meals/:id", (req, res) => {
    db.prepare("DELETE FROM meals WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/profile", (req, res) => {
    const profile = db.prepare("SELECT * FROM user_profile WHERE id = 1").get();
    res.json(profile || {});
  });

  app.post("/api/profile", (req, res) => {
    const { name, goal, target_calories, weight, height, age, gender,
            breakfast_time, lunch_time, dinner_time, snack_time, notifications_enabled } = req.body;
    db.prepare(`
      INSERT INTO user_profile (id, name, goal, target_calories, weight, height, age, gender,
        breakfast_time, lunch_time, dinner_time, snack_time, notifications_enabled)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, goal=excluded.goal, target_calories=excluded.target_calories,
        weight=excluded.weight, height=excluded.height, age=excluded.age, gender=excluded.gender,
        breakfast_time=excluded.breakfast_time, lunch_time=excluded.lunch_time,
        dinner_time=excluded.dinner_time, snack_time=excluded.snack_time,
        notifications_enabled=excluded.notifications_enabled
    `).run(name, goal, target_calories, weight, height, age, gender,
           breakfast_time || null, lunch_time || null, dinner_time || null,
           snack_time || null, notifications_enabled ? '1' : '0');
    res.json({ success: true });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
