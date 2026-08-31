import { NextRequest, NextResponse } from "next/server";
import { analyzeThumbnails } from "@/lib/providers";
import type { AnalyzeRequest, ProviderId } from "@/lib/types";

const PROVIDERS: ProviderId[] = [
  "ollama-local",
  "ollama-cloud",
  "openai",
  "anthropic",
  "google",
];

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<AnalyzeRequest>;

    if (!body.provider || !PROVIDERS.includes(body.provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!body.model?.trim()) {
      return NextResponse.json({ error: "Model is required" }, { status: 400 });
    }
    if (!body.imageA || !body.imageB) {
      return NextResponse.json(
        { error: "Both thumbnails are required" },
        { status: 400 }
      );
    }

    const result = await analyzeThumbnails({
      provider: body.provider,
      model: body.model.trim(),
      imageA: body.imageA,
      imageB: body.imageB,
      titleHint: body.titleHint,
      apiKey: body.apiKey,
      ollamaBaseUrl: body.ollamaBaseUrl,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
