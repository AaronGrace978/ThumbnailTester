# ThumbnailTester

Upload two thumbnails. A vision model predicts the click-through winner and paints attention heatmaps so you can see why.

## Features

- Side-by-side thumbnail upload (drag & drop or click)
- Predicted CTR winner with confidence + written reasons
- Attention heatmaps overlaid on each thumbnail
- Multi-provider vision support:
  - **Ollama (Local)** — talks to your local Ollama server
  - **Ollama Cloud** — `https://ollama.com` with API key
  - **OpenAI** — GPT-4o / 4.1 / o4-mini, etc.
  - **Anthropic** — Claude vision models
  - **Google Gemini** — Gemini multimodal models
- Live model lists from Ollama when available (falls back to a curated catalog)
- API keys stored only in your browser (`localStorage`) or server `.env`

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional server env

Copy `.env.example` to `.env.local`:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
```

Keys entered in the UI override env for that request.

### Local Ollama

1. Install and run [Ollama](https://ollama.com)
2. Pull a vision model, e.g. `ollama pull llava` or `ollama pull llama3.2-vision`
3. Select **Ollama (Local)** in the app and hit **Predict winner**

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Development server       |
| `npm run build`| Production build         |
| `npm start`    | Run production server    |

## Stack

Next.js (App Router) + TypeScript. No Electron — a local web app is enough and easier to run.
