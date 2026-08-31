import { NextRequest, NextResponse } from "next/server";
import { STATIC_MODELS, type ProviderId } from "@/lib/types";

export async function GET(req: NextRequest) {
  const provider = (req.nextUrl.searchParams.get("provider") ||
    "ollama-cloud") as ProviderId;
  const ollamaBase =
    req.nextUrl.searchParams.get("baseUrl") ||
    process.env.OLLAMA_BASE_URL ||
    "http://127.0.0.1:11434";

  if (provider === "ollama-local") {
    try {
      const res = await fetch(`${ollamaBase.replace(/\/$/, "")}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          models?: { name: string }[];
        };
        const models = (data.models ?? []).map((m) => ({
          id: m.name,
          label: m.name,
          vision: true,
        }));
        if (models.length > 0) {
          return NextResponse.json({ models, source: "live" });
        }
      }
    } catch {
      /* fall through to static */
    }
  }

  if (provider === "ollama-cloud") {
    const key =
      req.headers.get("x-api-key") || process.env.OLLAMA_API_KEY || "";
    if (key) {
      try {
        const res = await fetch("https://ollama.com/api/tags", {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            models?: { name: string }[];
          };
          const models = (data.models ?? []).map((m) => ({
            id: m.name,
            label: m.name,
            vision: true,
          }));
          if (models.length > 0) {
            return NextResponse.json({ models, source: "live" });
          }
        }
      } catch {
        /* fall through */
      }
    }
  }

  return NextResponse.json({
    models: STATIC_MODELS[provider] ?? STATIC_MODELS["ollama-cloud"],
    source: "static",
  });
}
