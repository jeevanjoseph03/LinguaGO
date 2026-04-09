# LinguaGO

Agentic public-speaking coach: submit a pitch (text or audio) and get multi-agent feedback + an overall score.

## Structure

- `LinguaGO-Backend/` — FastAPI API + LangGraph workflow + Groq (Whisper transcription)
- `linguago-ui/` — Vite + React UI

## Prerequisites

- Node.js (for the UI)
- Python 3.10+ (for the API)
- A Groq API key

## Backend setup

1) Create env file:

- Copy `LinguaGO-Backend/.env.example` to `LinguaGO-Backend/.env`
- Set `GROQ_API_KEY`

2) Install deps and run:

```bash
cd LinguaGO-Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Frontend setup

```bash
cd linguago-ui
npm install
npm run dev
```

By default the UI calls `http://127.0.0.1:8000`. To override:

- Copy `linguago-ui/.env.example` to `linguago-ui/.env`
- Set `VITE_API_URL`

## API

- `POST /analyze-pitch` JSON: `{ "pitch_text": "..." }`
- `POST /analyze-audio` multipart form-data: `audio_file` (webm)

## Security

- Do not commit secrets. Keep `LinguaGO-Backend/.env` and `linguago-ui/.env` local only.
- If you already committed a key, rotate it and remove it from git history before pushing.
