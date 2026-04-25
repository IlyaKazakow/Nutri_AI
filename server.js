import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
`);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Gemini endpoints (ключ используется на сервере)
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { input } = req.body;
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });
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
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `Ты — профессиональный диетолог. Данные пользователя: ${JSON.stringify(profile)}. История питания: ${JSON.stringify(meals)}. Отвечай на русском.`,
      }, { apiVersion: "v1" });
      const result = await model.generateContent(message);
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
    const { name, goal, target_calories, weight, height, age, gender } = req.body;
    db.prepare(`
      INSERT INTO user_profile (id, name, goal, target_calories, weight, height, age, gender)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, goal=excluded.goal, target_calories=excluded.target_calories,
        weight=excluded.weight, height=excluded.height, age=excluded.age, gender=excluded.gender
    `).run(name, goal, target_calories, weight, height, age, gender);
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
