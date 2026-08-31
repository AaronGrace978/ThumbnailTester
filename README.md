# ThumbnailTester

Upload two thumbnails. **Ollama Cloud** predicts the click-through winner and paints attention heatmaps so you can see why.

Also supports Ollama Local, OpenAI, Anthropic, and Google Gemini.

## Quick start (Ollama Cloud)

1. Create an API key at [ollama.com/settings/keys](https://ollama.com/settings/keys)
2. Run the app:

```bash
npm install
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)
4. Provider defaults to **Ollama Cloud** — paste your key, pick a vision model (e.g. `gemma4`, `qwen3.5`, `glm-5.3-flash`), upload A/B, hit **Predict winner**

Or put the key in `.env.local`:

```bash
OLLAMA_API_KEY=your_key_here
```

Cloud calls go to `https://ollama.com/api/chat` with `Authorization: Bearer …`.

## Other providers

| Provider | Notes |
| --- | --- |
| Ollama Local | `http://127.0.0.1:11434` — pull a vision model first |
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google Gemini | `GOOGLE_API_KEY` |

Keys entered in the UI are stored only in browser `localStorage` and override env for that request.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run production server |

## Stack

Next.js (App Router) + TypeScript.
