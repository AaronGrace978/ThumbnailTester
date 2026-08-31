import type { CompareResult, HeatSpot, ThumbnailAnalysis } from "./types";

const SYSTEM_PROMPT = `You are an expert YouTube/social thumbnail A/B tester.
Compare two thumbnails (A then B) for predicted click-through rate.
Focus on face/emotion visibility, text readability at small size, contrast,
curiosity gap, composition, and subject clarity.

Respond with ONLY valid JSON matching this schema (no markdown fences):
{
  "winner": "A" | "B" | "tie",
  "confidence": number 0-1,
  "summary": "one short sentence",
  "reasons": ["reason1", "reason2", "reason3"],
  "thumbnails": [
    {
      "id": "A",
      "ctrScore": number 0-100,
      "heatSpots": [
        {
          "x": number 0-1,
          "y": number 0-1,
          "radius": number 0.08-0.35,
          "intensity": number 0-1,
          "label": "short label"
        }
      ],
      "strengths": ["..."],
      "weaknesses": ["..."]
    },
    {
      "id": "B",
      "ctrScore": number 0-100,
      "heatSpots": [...],
      "strengths": ["..."],
      "weaknesses": ["..."]
    }
  ]
}

Heat spots = where a viewer's eye is likely drawn first (faces, bright text,
high-contrast subjects). Provide 3-6 spots per thumbnail. Coordinates are
normalized fractions of image width/height with (0,0) at top-left.`;

export function buildUserPrompt(titleHint?: string): string {
  const hint = titleHint?.trim()
    ? `\nVideo/context title hint: "${titleHint.trim()}"`
    : "";
  return `Thumbnail A is the first image. Thumbnail B is the second image.${hint}
Predict which gets more clicks and explain with heat-spot attention regions.`;
}

export { SYSTEM_PROMPT };

function clamp01(n: unknown, fallback = 0): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(1, Math.max(0, v));
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function parseHeatSpots(raw: unknown): HeatSpot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 8)
    .map((s) => {
      const spot = s as Record<string, unknown>;
      return {
        x: clamp01(spot.x, 0.5),
        y: clamp01(spot.y, 0.5),
        radius: clamp(spot.radius, 0.06, 0.4, 0.15),
        intensity: clamp01(spot.intensity, 0.5),
        label: String(spot.label ?? "Attention"),
      };
    })
    .filter((s) => s.label.length > 0);
}

function parseThumb(
  raw: unknown,
  fallbackId: "A" | "B"
): ThumbnailAnalysis {
  const t = (raw ?? {}) as Record<string, unknown>;
  const id = t.id === "B" ? "B" : t.id === "A" ? "A" : fallbackId;
  return {
    id,
    ctrScore: clamp(t.ctrScore, 0, 100, 50),
    heatSpots: parseHeatSpots(t.heatSpots),
    strengths: Array.isArray(t.strengths)
      ? t.strengths.map(String).slice(0, 6)
      : [],
    weaknesses: Array.isArray(t.weaknesses)
      ? t.weaknesses.map(String).slice(0, 6)
      : [],
  };
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* continue */
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error("Model did not return valid JSON");
}

export function normalizeResult(
  raw: unknown,
  meta: { provider: CompareResult["provider"]; model: string }
): CompareResult {
  const data = raw as Record<string, unknown>;
  const thumbsRaw = Array.isArray(data.thumbnails) ? data.thumbnails : [];
  const a = parseThumb(thumbsRaw[0], "A");
  const b = parseThumb(thumbsRaw[1], "B");
  a.id = "A";
  b.id = "B";

  let winner: CompareResult["winner"] = "tie";
  if (data.winner === "A" || data.winner === "B" || data.winner === "tie") {
    winner = data.winner;
  } else if (a.ctrScore > b.ctrScore) {
    winner = "A";
  } else if (b.ctrScore > a.ctrScore) {
    winner = "B";
  }

  return {
    winner,
    confidence: clamp01(data.confidence, 0.5),
    summary: String(data.summary ?? "Comparison complete."),
    reasons: Array.isArray(data.reasons)
      ? data.reasons.map(String).slice(0, 8)
      : [],
    thumbnails: [a, b],
    model: meta.model,
    provider: meta.provider,
  };
}

export function stripDataUrl(dataUrl: string): {
  mime: string;
  base64: string;
} {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mime: match[1], base64: match[2] };
  }
  return { mime: "image/jpeg", base64: dataUrl.replace(/^data:[^,]*,/, "") };
}
