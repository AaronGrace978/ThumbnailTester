"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ThumbnailSlot } from "@/components/ThumbnailSlot";
import {
  PROVIDER_META,
  STATIC_MODELS,
  type CompareResult,
  type ProviderId,
  type ProviderModel,
} from "@/lib/types";

const PROVIDERS = Object.keys(PROVIDER_META) as ProviderId[];
const STORAGE_KEYS = "thumbnail-tester-keys";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadStoredKeys(): Partial<Record<ProviderId, string>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS) || "{}");
  } catch {
    return {};
  }
}

export default function HomePage() {
  const [imageA, setImageA] = useState<string | null>(null);
  const [imageB, setImageB] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderId>("ollama-local");
  const [model, setModel] = useState(STATIC_MODELS["ollama-local"][0].id);
  const [models, setModels] = useState<ProviderModel[]>(
    STATIC_MODELS["ollama-local"]
  );
  const [modelSource, setModelSource] = useState<"live" | "static">("static");
  const [apiKey, setApiKey] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://127.0.0.1:11434");
  const [titleHint, setTitleHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [showKey, setShowKey] = useState(false);

  const meta = PROVIDER_META[provider];

  useEffect(() => {
    const keys = loadStoredKeys();
    if (keys[provider]) setApiKey(keys[provider]!);
    else setApiKey("");
  }, [provider]);

  const persistKey = useCallback(
    (value: string) => {
      setApiKey(value);
      const keys = loadStoredKeys();
      if (value.trim()) keys[provider] = value.trim();
      else delete keys[provider];
      localStorage.setItem(STORAGE_KEYS, JSON.stringify(keys));
    },
    [provider]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      setModels(STATIC_MODELS[provider]);
      setModel(STATIC_MODELS[provider][0]?.id ?? "");
      setModelSource("static");

      const params = new URLSearchParams({ provider });
      if (provider === "ollama-local") params.set("baseUrl", ollamaBaseUrl);
      const headers: HeadersInit = {};
      if (provider === "ollama-cloud" && apiKey) {
        headers["x-api-key"] = apiKey;
      }

      try {
        const res = await fetch(`/api/models?${params}`, { headers });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          models: ProviderModel[];
          source: "live" | "static";
        };
        if (cancelled || !data.models?.length) return;
        setModels(data.models);
        setModelSource(data.source);
        setModel((prev) =>
          data.models.some((m) => m.id === prev)
            ? prev
            : data.models[0].id
        );
      } catch {
        /* keep static */
      }
    }
    loadModels();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, ollamaBaseUrl]);

  const canAnalyze = useMemo(
    () => Boolean(imageA && imageB && model && !loading),
    [imageA, imageB, model, loading]
  );

  async function onPick(side: "A" | "B", file: File | null) {
    if (!file) {
      if (side === "A") setImageA(null);
      else setImageB(null);
      setResult(null);
      return;
    }
    const url = await fileToDataUrl(file);
    if (side === "A") setImageA(url);
    else setImageB(url);
    setResult(null);
    setError(null);
  }

  async function analyze() {
    if (!imageA || !imageB) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          imageA,
          imageB,
          titleHint: titleHint || undefined,
          apiKey: apiKey || undefined,
          ollamaBaseUrl:
            provider === "ollama-local" ? ollamaBaseUrl : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data as CompareResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  const thumbA = result?.thumbnails[0];
  const thumbB = result?.thumbnails[1];

  return (
    <main className="page">
      <header className="hero">
        <p className="brand">ThumbnailTester</p>
        <h1>Which thumbnail gets the click?</h1>
        <p className="lede">
          Upload two options. A vision model scores predicted CTR and paints
          attention heatmaps so you see why.
        </p>
      </header>

      <section className="controls">
        <label className="field">
          <span>Provider</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as ProviderId)}
          >
            {PROVIDERS.map((id) => (
              <option key={id} value={id}>
                {PROVIDER_META[id].label}
              </option>
            ))}
          </select>
        </label>

        <label className="field grow">
          <span>
            Model{" "}
            <em className="muted">
              ({modelSource === "live" ? "from provider" : "catalog"})
            </em>
          </span>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        {provider === "ollama-local" && (
          <label className="field grow">
            <span>Ollama URL</span>
            <input
              value={ollamaBaseUrl}
              onChange={(e) => setOllamaBaseUrl(e.target.value)}
              placeholder="http://127.0.0.1:11434"
            />
          </label>
        )}

        {meta.needsKey && (
          <label className="field grow">
            <span>API key</span>
            <div className="key-row">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => persistKey(e.target.value)}
                placeholder={meta.keyEnv || "API key"}
                autoComplete="off"
              />
              <button
                type="button"
                className="ghost"
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </label>
        )}

        <label className="field grow">
          <span>Title hint (optional)</span>
          <input
            value={titleHint}
            onChange={(e) => setTitleHint(e.target.value)}
            placeholder="e.g. I Tried Every AI Tool in 2026"
          />
        </label>
      </section>

      <p className="hint">{meta.hint}</p>

      <section className="compare">
        <ThumbnailSlot
          label="A"
          src={imageA}
          heatSpots={thumbA?.heatSpots}
          score={thumbA?.ctrScore}
          isWinner={result?.winner === "A"}
          onFile={(f) => onPick("A", f)}
        />
        <div className="vs">vs</div>
        <ThumbnailSlot
          label="B"
          src={imageB}
          heatSpots={thumbB?.heatSpots}
          score={thumbB?.ctrScore}
          isWinner={result?.winner === "B"}
          onFile={(f) => onPick("B", f)}
        />
      </section>

      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={!canAnalyze}
          onClick={analyze}
        >
          {loading ? "Analyzing…" : "Predict winner"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="results">
          <div className="verdict">
            <p className="verdict-kicker">
              {result.winner === "tie"
                ? "Too close to call"
                : `Thumbnail ${result.winner} wins`}
            </p>
            <h2>{result.summary}</h2>
            <p className="muted">
              {Math.round(result.confidence * 100)}% confidence · {result.model}{" "}
              via {PROVIDER_META[result.provider].label}
            </p>
          </div>

          <ul className="reasons">
            {result.reasons.map((r, i) => (
              <li key={`${i}-${r}`}>{r}</li>
            ))}
          </ul>

          <div className="detail-grid">
            {[thumbA, thumbB].map((t) =>
              t ? (
                <article key={t.id} className="detail">
                  <h3>Thumbnail {t.id}</h3>
                  <p className="score-line">
                    Predicted CTR score{" "}
                    <strong>{Math.round(t.ctrScore)}</strong>
                  </p>
                  {t.strengths.length > 0 && (
                    <>
                      <h4>Strengths</h4>
                      <ul>
                        {t.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {t.weaknesses.length > 0 && (
                    <>
                      <h4>Weaknesses</h4>
                      <ul>
                        {t.weaknesses.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </article>
              ) : null
            )}
          </div>
        </section>
      )}
    </main>
  );
}
