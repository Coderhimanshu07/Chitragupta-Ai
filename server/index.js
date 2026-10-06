import dotenv from "dotenv";

/* Must run before ./supabase.js is evaluated, since ESM imports are
   hoisted above any statement in this file. */
dotenv.config();

import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import { supabaseReady, getUser, clientForToken } from "./supabase.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

/* Malformed JSON must not leak a body-parser stack trace to the client. */
app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }
  next(err);
});

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/* Vite shifts to the next free port when 5173 is busy, so accept any
   loopback port in development. The Groq key stays server-side, so this
   does not expose the secret - it only stops dev from breaking. */
const isLoopback = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || isLoopback(origin) || ALLOWED_ORIGINS.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error("Origin not allowed by CORS"));
    }
  })
);

/* ---------- AUTH ---------- */

async function requireAuth(req, res, next) {
  if (!supabaseReady()) {
    return res.status(503).json({
      error: "Auth is not configured on the server. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in server/.env"
    });
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  const user = await getUser(token);

  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = user;
  req.db = clientForToken(token);
  next();
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const hits = new Map();

setInterval(() => hits.clear(), WINDOW_MS).unref();

function rateLimit(req, res, next) {
  const key = req.ip || "unknown";
  const count = (hits.get(key) || 0) + 1;
  hits.set(key, count);

  if (count > MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests" });
  }
  next();
}

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/* gpt-oss models emit <|channel|>analysis<|message|>...<|end|> blocks.
   Pull out just the user-facing final answer. */
function extractText(content) {
  if (!content) return "";
  const message = content.split(/<\|channel\|>final<\|message\|>/).pop();
  return message
    .replace(/<\|start\|>assistant<\|message\|>/g, "")
    .replace(/<\|channel\|>[^<]*<\|message\|>/g, "")
    .replace(/<\|end\|>/g, "")
    .trim();
}

function fallbackTitle(text = "") {
  const words = String(text).trim().split(/\s+/).slice(0, 5).join(" ");
  return words || "New Chat";
}

const MAX_HISTORY = 20;
const MAX_MSG_LEN = 8000;

/* Keep only well-formed, non-empty user/assistant turns and cap the
   tail so long sessions cannot blow past the context window. */
function buildHistory(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_MSG_LEN)
    }))
    .slice(-MAX_HISTORY);
}

/* ---------- CHAT RESPONSE ---------- */

/* requireAuth comes first so an anonymous caller cannot spend LLM tokens.
   The chat page is a logged-in-only surface, so the key must not be usable
   from a bare curl call. */
app.post("/chat", requireAuth, rateLimit, async (req, res) => {
  try {
    const { message, messages } = req.body ?? {};
    const history = buildHistory(messages);

    const latest = typeof message === "string" ? message.trim() : "";

    if (!latest && history.length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await groq.chat.completions.create({
      model: MODEL,
      reasoning_format: "hidden",
      messages: latest
        ? [...history, { role: "user", content: latest }]
        : history
    });

    const reply = extractText(response.choices[0].message.content);

    if (!reply) {
      return res.status(502).json({ error: "Empty response from model" });
    }

    res.json({ reply });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Something went wrong"
    });
  }
});

/* ---------- CHATS CRUD (Supabase, scoped by RLS) ---------- */

/* PGRST205/42P01 means the `chats` table was never created. That is a setup
   problem, not a user problem, so surface it as an actionable 503 instead of
   a generic 500 the client would show as a scary sync warning. */
function isMissingTable(error) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

function missingTable(res) {
  return res.status(503).json({
    error: "Database is not set up yet",
    code: "TABLE_MISSING",
    detail: "Run supabase/schema.sql in the Supabase SQL Editor, then retry."
  });
}

app.get("/chats", requireAuth, async (req, res) => {
  try {
    const { data, error } = await req.db
      .from("chats")
      .select("id, title, messages, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      if (isMissingTable(error)) return missingTable(res);
      throw error;
    }

    /* A brand new user legitimately has zero rows. Return an explicit empty
       list so the client renders its empty state instead of treating this
       normal case as a failure. */
    res.json({ chats: data ?? [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load chats" });
  }
});

app.post("/chats", requireAuth, async (req, res) => {
  try {
    const { title = "New Chat", messages = [] } = req.body ?? {};

    const { data, error } = await req.db
      .from("chats")
      .insert({
        user_id: req.user.id,
        title: String(title).slice(0, 120),
        messages
      })
      .select("id, title, messages, created_at, updated_at")
      .single();

    if (error) {
      if (isMissingTable(error)) return missingTable(res);
      throw error;
    }

    res.status(201).json({ chat: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create chat" });
  }
});

app.patch("/chats/:id", requireAuth, async (req, res) => {
  try {
    const patch = {};

    if (typeof req.body?.title === "string") {
      patch.title = req.body.title.slice(0, 120);
    }
    if (Array.isArray(req.body?.messages)) {
      patch.messages = req.body.messages;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const { data, error } = await req.db
      .from("chats")
      .update(patch)
      .eq("id", req.params.id)
      .select("id, title, messages, created_at, updated_at")
      .single();

    if (error) {
      if (isMissingTable(error)) return missingTable(res);
      throw error;
    }

    res.json({ chat: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update chat" });
  }
});

app.delete("/chats/:id", requireAuth, async (req, res) => {
  try {
    const { error } = await req.db
      .from("chats")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      if (isMissingTable(error)) return missingTable(res);
      throw error;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete chat" });
  }
});

app.delete("/chats", requireAuth, async (req, res) => {
  try {
    const { error } = await req.db
      .from("chats")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      if (isMissingTable(error)) return missingTable(res);
      throw error;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not clear chats" });
  }
});

/* ---------- AI TITLE GENERATOR ---------- */

app.post("/generate-title", requireAuth, rateLimit, async (req, res) => {
  try {
    const userMessage =
      typeof req.body?.message === "string" ? req.body.message.trim() : "";

    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: `Generate a short chat title (max 5 words) for this query:


${userMessage}

Only return the title.`
        }
      ],
      max_tokens: 300,
      reasoning_format: "hidden"
    });

    const title = extractText(response.choices[0].message.content);

    res.json({
      title: title || fallbackTitle(userMessage)
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Title generation failed"
    });
  }
});

/* ---------- SERVER ---------- */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    model: MODEL,
    hasKey: Boolean(process.env.GROQ_API_KEY)
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} using model ${MODEL}`);
});
