export type ProviderId =
  | "ollama-local"
  | "ollama-cloud"
  | "openai"
  | "anthropic"
  | "google";

export interface HeatSpot {
  /** Center X as fraction of image width (0–1) */
  x: number;
  /** Center Y as fraction of image height (0–1) */
  y: number;
  /** Spot radius as fraction of the shorter image side (0–1) */
  radius: number;
  /** Attention intensity 0–1 */
  intensity: number;
  /** Short label for why this area draws the eye */
  label: string;
}

export interface ThumbnailAnalysis {
  id: "A" | "B";
  ctrScore: number;
  heatSpots: HeatSpot[];
  strengths: string[];
  weaknesses: string[];
}

export interface CompareResult {
  winner: "A" | "B" | "tie";
  confidence: number;
  summary: string;
  reasons: string[];
  thumbnails: [ThumbnailAnalysis, ThumbnailAnalysis];
  model: string;
  provider: ProviderId;
}

export interface ProviderModel {
  id: string;
  label: string;
  vision: boolean;
}

export interface AnalyzeRequest {
  provider: ProviderId;
  model: string;
  imageA: string;
  imageB: string;
  titleHint?: string;
  apiKey?: string;
  ollamaBaseUrl?: string;
}

export const PROVIDER_META: Record<
  ProviderId,
  { label: string; needsKey: boolean; keyEnv?: string; hint: string }
> = {
  "ollama-local": {
    label: "Ollama (Local)",
    needsKey: false,
    hint: "Runs against a local Ollama server (default http://localhost:11434)",
  },
  "ollama-cloud": {
    label: "Ollama Cloud",
    needsKey: true,
    keyEnv: "OLLAMA_API_KEY",
    hint: "Uses https://ollama.com with your Ollama Cloud API key",
  },
  openai: {
    label: "OpenAI",
    needsKey: true,
    keyEnv: "OPENAI_API_KEY",
    hint: "GPT-4o and other vision models",
  },
  anthropic: {
    label: "Anthropic",
    needsKey: true,
    keyEnv: "ANTHROPIC_API_KEY",
    hint: "Claude vision models",
  },
  google: {
    label: "Google Gemini",
    needsKey: true,
    keyEnv: "GOOGLE_API_KEY",
    hint: "Gemini multimodal models",
  },
};

export const STATIC_MODELS: Record<ProviderId, ProviderModel[]> = {
  "ollama-local": [
    { id: "llava", label: "LLaVA", vision: true },
    { id: "llava:13b", label: "LLaVA 13B", vision: true },
    { id: "llava:34b", label: "LLaVA 34B", vision: true },
    { id: "llama3.2-vision", label: "Llama 3.2 Vision", vision: true },
    { id: "llama3.2-vision:90b", label: "Llama 3.2 Vision 90B", vision: true },
    { id: "minicpm-v", label: "MiniCPM-V", vision: true },
    { id: "bakllava", label: "BakLLaVA", vision: true },
    { id: "moondream", label: "Moondream", vision: true },
    { id: "qwen2.5vl", label: "Qwen2.5-VL", vision: true },
    { id: "gemma3", label: "Gemma 3", vision: true },
  ],
  "ollama-cloud": [
    { id: "llama3.2-vision", label: "Llama 3.2 Vision", vision: true },
    { id: "llama3.2-vision:90b", label: "Llama 3.2 Vision 90B", vision: true },
    { id: "llava", label: "LLaVA", vision: true },
    { id: "qwen2.5vl", label: "Qwen2.5-VL", vision: true },
    { id: "gemma3", label: "Gemma 3", vision: true },
    { id: "minicpm-v", label: "MiniCPM-V", vision: true },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o", vision: true },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", vision: true },
    { id: "gpt-4.1", label: "GPT-4.1", vision: true },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", vision: true },
    { id: "gpt-4.1-nano", label: "GPT-4.1 Nano", vision: true },
    { id: "o4-mini", label: "o4-mini", vision: true },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", vision: true },
    { id: "claude-opus-4-20250514", label: "Claude Opus 4", vision: true },
    { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet", vision: true },
    { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", vision: true },
    { id: "claude-3-opus-latest", label: "Claude 3 Opus", vision: true },
  ],
  google: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", vision: true },
    { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", vision: true },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", vision: true },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", vision: true },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", vision: true },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", vision: true },
  ],
};
