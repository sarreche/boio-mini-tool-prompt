import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const HUGGINGFACE_URL = "https://router.huggingface.co/v1/chat/completions";

// Leemos variables de entorno
const OPENROUTER_KEY = process.env.OPENROUTER_TOKEN;
const HUGGINGFACE_KEY = process.env.HUGGINGFACE_TOKEN;
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "OR"; // OR | HF

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

// Modelos de fallback
const MODELS = {
  OR: ["deepseek/deepseek-chat-v3.1:free", "qwen/qwen3-coder:free","openai/gpt-oss-20b:free"],
  HF: [
    "HuggingFaceH4/zephyr-7b-beta:featherless-ai",
    "mistralai/Mistral-7B-Instruct-v0.2:featherless-ai",
  ],
};

async function callModel(
  url: string,
  token: string,
  model: string,
  messages: Message[]
) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Respuesta sin contenido útil");

  return text;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();

    if (!data?.claims) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { prompt, systemPrompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt requerido" }, { status: 400 });
    }

    const messages: Message[] = [
      { role: "system", content: systemPrompt || "You are a helpful assistant." },
      { role: "user", content: prompt },
    ];

    const errors: string[] = [];

    // Elegimos familia de modelos según DEFAULT_MODEL
    if (DEFAULT_MODEL === "OR" && OPENROUTER_KEY) {
      for (const model of MODELS.OR) {
        try {
          const text = await callModel(
            OPENROUTER_URL,
            OPENROUTER_KEY,
            model,
            messages
          );
          return NextResponse.json({ model, text });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`${model} → ${message}`);
        }
      }
    }

    if (DEFAULT_MODEL === "HF" && HUGGINGFACE_KEY) {
      for (const model of MODELS.HF) {
        try {
          const text = await callModel(
            HUGGINGFACE_URL,
            HUGGINGFACE_KEY,
            model,
            messages
          );
          return NextResponse.json({ model, text });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);   
          errors.push(`${model} → ${message}`);
        }
      }
    }

    return NextResponse.json(
      { error: "No hay modelos disponibles", details: errors },
      { status: 503 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
