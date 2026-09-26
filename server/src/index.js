import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { NOVA_SYSTEM_PROMPT } from "./novaPrompt.js";
import {
  buildInteractionInput,
  saveInteractionTurn,
  resetSession
} from "./sessionStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PORT = Number(process.env.PORT || 3001);
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("[NOVA] GEMINI_API_KEY bulunamadı. server/.env dosyasını oluştur.");
}

const gemini = apiKey ? new GoogleGenAI({ apiKey }) : null;
const app = express();

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(express.json({ limit: "32kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false
  })
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "gemini-interactions",
    model: MODEL,
    configured: Boolean(apiKey)
  });
});

function friendlyGeminiError(error) {
  const raw = String(error?.message || error || "");
  const lower = raw.toLowerCase();

  if (lower.includes("api key") || lower.includes("api_key") || lower.includes("401") || lower.includes("403")) {
    return "Gemini API anahtarı çalışmadı. server/.env içindeki GEMINI_API_KEY değerini kontrol et.";
  }

  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("resource_exhausted") || lower.includes("429")) {
    return "Gemini ücretsiz kullanım kotasına/rate limitine takıldı. Biraz bekleyip tekrar dene veya Google AI Studio kotanı kontrol et.";
  }

  if (lower.includes("model") && (lower.includes("not found") || lower.includes("not available") || lower.includes("unsupported") || lower.includes("404"))) {
    return "Gemini modeli kullanılamadı. server/.env içinde GEMINI_MODEL=gemini-3.8-flash olduğundan emin ol.";
  }

  return "NOVA şu an cevap veremedi. Terminaldeki Gemini hata mesajını kontrol et.";
}

app.post("/api/chat", async (req, res) => {
  try {
    const sessionId = String(req.body?.sessionId || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!sessionId || sessionId.length > 100) {
      return res.status(400).json({ error: "Geçersiz oturum." });
    }
    if (!message) {
      return res.status(400).json({ error: "Mesaj boş olamaz." });
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: "Mesaj çok uzun. 5000 karakteri geçmesin." });
    }
    if (!gemini) {
      return res.status(503).json({ error: "Gemini API anahtarı ayarlı değil. server/.env dosyasına GEMINI_API_KEY ekle." });
    }

    const input = buildInteractionInput(sessionId, message);
    const interaction = await gemini.interactions.create({
      model: MODEL,
      store: false,
      input,
      system_instruction: NOVA_SYSTEM_PROMPT,
      generation_config: {
        thinking_level: "low",
        max_output_tokens: 1400
      }
    });

    const reply = interaction.output_text?.trim();
    if (!reply) {
      throw new Error(`Gemini boş cevap döndürdü. status=${interaction.status || "unknown"}`);
    }

    saveInteractionTurn(sessionId, message, interaction.steps ?? []);
    res.json({ reply });
  } catch (error) {
    console.error("[NOVA] Gemini Interactions chat error:", error);
    res.status(500).json({ error: friendlyGeminiError(error) });
  }
});

app.post("/api/reset", (req, res) => {
  const sessionId = String(req.body?.sessionId || "").trim();
  if (sessionId) resetSession(sessionId);
  res.json({ ok: true });
});

const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[NOVA] server http://localhost:${PORT}`);
  console.log(`[NOVA] provider: Google Gemini Interactions API`);
  console.log(`[NOVA] model: ${MODEL}`);
});
