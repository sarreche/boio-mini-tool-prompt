import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const HUGGINGFACE_URL = "https://router.huggingface.co/v1/chat/completions";

// Leemos variables de entorno
const OPENROUTER_KEY = process.env.OPENROUTER_TOKEN;
const HUGGINGFACE_KEY = process.env.HUGGINGFACE_TOKEN;
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "OR"; // OR | HF

// Modelos de fallback
const MODELS = {
  OR: ["x-ai/grok-4-fast:free", "deepseek/deepseek-chat-v3-0324:free"],
  HF: [
    "HuggingFaceH4/zephyr-7b-beta:featherless-ai",
    "mistralai/Mistral-7B-Instruct-v0.2:featherless-ai",
  ],
};

async function callModel(
  url: string,
  token: string,
  model: string,
  messages: any[]
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
    const { prompt, lang, systemPrompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt requerido" }, { status: 400 });
    }

    const messages = [
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
        } catch (err: any) {
          errors.push(`${model} → ${err.message}`);
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
        } catch (err: any) {
          errors.push(`${model} → ${err.message}`);
        }
      }
    }

    return NextResponse.json(
      { error: "No hay modelos disponibles", details: errors },
      { status: 503 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
