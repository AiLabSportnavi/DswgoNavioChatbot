# Navio — Backend

The FastAPI backend that powers Navio, the Sportnavi guide chatbot, on **Azure OpenAI**
(`gpt-4.1`). This folder is self-contained: the app, the system prompt, dependencies,
and the container definition all live here.

> Deployment (Caddy + Redis via docker-compose), the embed snippet, and the full
> **Security & API Protection** writeup live in the [project README](../README.md).

## Files

| File | Role |
|------|------|
| [app.py](app.py) | The FastAPI app — endpoints, CORS, rate limiting, input caps, Turnstile/session hooks. |
| [SYSTEM_PROMPT.md](SYSTEM_PROMPT.md) | The full Navio system prompt with the knowledge base baked in (read at startup). |
| [chatbot.py](chatbot.py) | A terminal chat loop for quick local testing (no server). |
| [requirements.txt](requirements.txt) | Python dependencies. |
| [Dockerfile](Dockerfile) | Builds the backend image (used by the root `docker-compose.yml`). |

Credentials and tuning come from the project‑root [`.env`](../.env) (git‑ignored). It is
found automatically whether you run from the repo root or from this folder.

## Run locally (no Docker)

From the repo root:

```powershell
pip install -r backend/requirements.txt
uvicorn app:app --app-dir backend --reload      # http://127.0.0.1:8000
```

…or from inside this folder:

```powershell
cd backend
uvicorn app:app --reload
```

Then open `http://127.0.0.1:8000/docs` for the interactive API.

## Run as a container

The image is built by the root [docker-compose.yml](../docker-compose.yml)
(`build: ./backend`). To build just this image directly:

```powershell
docker build -t navio backend
docker run -p 8000:8000 --env-file .env navio
```

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness → `{"status":"ok","model":"gpt-4.1","turnstile":false}` |
| `/api/session` | POST | Only when Turnstile is ON. `{"turnstile_token":"..."}` → `{"session_token":"...","expires_in":1800}` |
| `/api/chat` | POST | `{"message":"...","history":[{"role":"user","content":"..."}]}` → `{"reply":"..."}`. When Turnstile is ON, also send header `X-Navio-Session: <token>`. |

## Environment variables

All optional except the Azure ones; safe defaults shown.

| Variable | Default | Meaning |
|---|---|---|
| `AZURE_AI_CHATBOT_API_KEY` | — | **Required.** Azure OpenAI key. |
| `AZURE_AI_CHATBOT_OPENAI_ENDPOINT` | — | **Required.** v1-compatible endpoint. |
| `AZURE_AI_CHATBOT_DEPLOYMENT_NAME` | — | **Required.** e.g. `gpt-4.1`. |
| `ALLOWED_ORIGINS` | `https://sportnavi.de,https://www.sportnavi.de` | CORS allowlist. |
| `RATE_LIMIT_PER_MIN` | `15` | Per-IP requests/minute. |
| `RATE_LIMIT_PER_DAY` | `300` | Per-IP requests/day. |
| `MAX_MESSAGE_CHARS` | `2000` | Max length of one message. |
| `MAX_HISTORY_TURNS` | `10` | Max recent turns accepted. |
| `MAX_TOKENS` | `800` | Max reply length. |
| `TEMPERATURE` | `0.4` | Creativity (0 = factual, 1 = playful). |
| `TURNSTILE_SECRET` | _(empty = OFF)_ | Cloudflare Turnstile secret; set to enable bot protection. |
| `SESSION_SECRET` | _(falls back to Turnstile secret)_ | Signs session tokens. |
| `SESSION_TTL_MIN` | `30` | Session token lifetime. |
| `REDIS_URL` | _(empty = in-memory)_ | Shared rate-limit store; set when scaling. |

## Local CLI (no server)

```powershell
cd backend
python chatbot.py
```

Type questions in German or English at the `You:` prompt. Type `exit` to quit.
