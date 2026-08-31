import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  extractJson,
  normalizeResult,
  stripDataUrl,
} from "./prompt";
import type { AnalyzeRequest, CompareResult, ProviderId } from "./types";

async function callOllama(opts: {
  baseUrl: string;
  model: string;
  apiKey?: string;
  imageA: string;
  imageB: string;
  titleHint?: string;
  provider: ProviderId;
}): Promise<CompareResult> {
  const a = stripDataUrl(opts.imageA);
  const b = stripDataUrl(opts.imageB);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`;

  const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: opts.model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(opts.titleHint),
          images: [a.base64, b.base64],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Ollama error ${res.status}: ${errText || res.statusText}`
    );
  }

  const data = (await res.json()) as {
    message?: { content?: string };
    response?: string;
  };
  const content = data.message?.content ?? data.response ?? "";
  return normalizeResult(extractJson(content), {
    provider: opts.provider,
    model: opts.model,
  });
}

async function callOpenAI(opts: {
  model: string;
  apiKey: string;
  imageA: string;
  imageB: string;
  titleHint?: string;
}): Promise<CompareResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: buildUserPrompt(opts.titleHint) },
            {
              type: "text",
              text: "Thumbnail A:",
            },
            { type: "image_url", image_url: { url: opts.imageA } },
            {
              type: "text",
              text: "Thumbnail B:",
            },
            { type: "image_url", image_url: { url: opts.imageB } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${errText || res.statusText}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  return normalizeResult(extractJson(content), {
    provider: "openai",
    model: opts.model,
  });
}

async function callAnthropic(opts: {
  model: string;
  apiKey: string;
  imageA: string;
  imageB: string;
  titleHint?: string;
}): Promise<CompareResult> {
  const a = stripDataUrl(opts.imageA);
  const b = stripDataUrl(opts.imageB);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildUserPrompt(opts.titleHint) },
            { type: "text", text: "Thumbnail A:" },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: a.mime,
                data: a.base64,
              },
            },
            { type: "text", text: "Thumbnail B:" },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: b.mime,
                data: b.base64,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Anthropic error ${res.status}: ${errText || res.statusText}`
    );
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const content =
    data.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n") ??
    "";
  return normalizeResult(extractJson(content), {
    provider: "anthropic",
    model: opts.model,
  });
}

async function callGoogle(opts: {
  model: string;
  apiKey: string;
  imageA: string;
  imageB: string;
  titleHint?: string;
}): Promise<CompareResult> {
  const a = stripDataUrl(opts.imageA);
  const b = stripDataUrl(opts.imageB);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: buildUserPrompt(opts.titleHint) },
            { text: "Thumbnail A:" },
            { inlineData: { mimeType: a.mime, data: a.base64 } },
            { text: "Thumbnail B:" },
            { inlineData: { mimeType: b.mime, data: b.base64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Google error ${res.status}: ${errText || res.statusText}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const content =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "";
  return normalizeResult(extractJson(content), {
    provider: "google",
    model: opts.model,
  });
}

function resolveKey(
  provided: string | undefined,
  envName: string | undefined
): string | undefined {
  if (provided?.trim()) return provided.trim();
  if (envName && process.env[envName]?.trim()) return process.env[envName]!.trim();
  return undefined;
}

export async function analyzeThumbnails(
  req: AnalyzeRequest
): Promise<CompareResult> {
  const { provider, model, imageA, imageB, titleHint } = req;

  switch (provider) {
    case "ollama-local": {
      const base =
        req.ollamaBaseUrl?.trim() ||
        process.env.OLLAMA_BASE_URL ||
        "http://127.0.0.1:11434";
      return callOllama({
        baseUrl: base,
        model,
        imageA,
        imageB,
        titleHint,
        provider,
      });
    }
    case "ollama-cloud": {
      const apiKey = resolveKey(req.apiKey, "OLLAMA_API_KEY");
      if (!apiKey) throw new Error("Ollama Cloud API key required");
      return callOllama({
        baseUrl: "https://ollama.com",
        model,
        apiKey,
        imageA,
        imageB,
        titleHint,
        provider,
      });
    }
    case "openai": {
      const apiKey = resolveKey(req.apiKey, "OPENAI_API_KEY");
      if (!apiKey) throw new Error("OpenAI API key required");
      return callOpenAI({ model, apiKey, imageA, imageB, titleHint });
    }
    case "anthropic": {
      const apiKey = resolveKey(req.apiKey, "ANTHROPIC_API_KEY");
      if (!apiKey) throw new Error("Anthropic API key required");
      return callAnthropic({ model, apiKey, imageA, imageB, titleHint });
    }
    case "google": {
      const apiKey = resolveKey(req.apiKey, "GOOGLE_API_KEY");
      if (!apiKey) throw new Error("Google API key required");
      return callGoogle({ model, apiKey, imageA, imageB, titleHint });
    }
    default:
      throw new Error(`Unknown provider: ${provider satisfies never}`);
  }
}
