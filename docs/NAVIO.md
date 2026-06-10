# Navio — The Sportnavi Chatbot

> Complete documentation for the **first chatbot**, *Navio*.
> Part 1 is written for **everyone** (no technical background needed).
> Part 2 is written for **developers and IT** who run, change, or deploy it.

---

# Part 1 — For Everyone (Non-Technical)

## What is Navio?

**Navio** is a friendly digital assistant — a chatbot — that lives on the
**Sportnavi** website. Sportnavi is Germany's corporate-fitness network: with a
single membership, people can use thousands of sport and wellness offers — gyms,
swimming pools, yoga, climbing, massage, and more.

Navio's job is simple: **answer visitors' questions in plain language, day or
night, in German or English.** Think of it as a helpful guide standing at the
door of Sportnavi who never gets tired and always knows where things are.

The name says it all — like a **navi**gator, Navio guides people safely to the
right answer.

## Who does Navio help?

Navio is built for three kinds of visitors and adapts how much detail it gives to
each one:

| Audience | What they ask about |
|----------|--------------------|
| **Members & employees** | Finding offers, how to check in at a gym, membership plans, cancellation, the app |
| **Companies** | Offering Sportnavi as an employee benefit, costs, tax topics, how staff sign up |
| **Partners** (studios & providers) | Joining the network, the partner portal, payouts, QR-code check-ins |

## What can Navio do?

- **Find sport & wellness offers** — points members to gyms, pools, yoga,
  climbing, and wellness across the network.
- **Explain membership & check-in** — plans, QR / app check-in, and cancellation,
  all in plain language.
- **Guide companies & partners** — helps employers understand the benefit and
  helps studios join the network.
- **Speak German and English** — Navio replies in the language the visitor uses
  and can switch mid-conversation.

## How a visitor uses it

1. A small chat bubble appears in the corner of the website.
2. Clicking it opens a friendly greeting card, then the chat.
3. Before the first message, Navio shows a short **privacy notice
   (Datenschutzhinweis)**. The visitor must agree before chatting — this is shown
   every time a new conversation starts.
4. The visitor types a question (or taps a suggested one like *"How do I check
   in?"*) and Navio answers.
5. Buttons at the top let the visitor learn **about** Navio, **reset** the
   conversation, or **close** the window.

## What makes Navio trustworthy

- **It only answers from official Sportnavi information.** Navio is given the
  real Sportnavi FAQ and partner knowledge base, and it is instructed to answer
  *only* from that content — it does not invent facts.
- **It stays polite, even with tricky questions.** If someone asks something it
  can't or shouldn't answer, it declines gently and steers back to Sportnavi
  topics — it never shows a scary error.
- **Privacy first.** The visitor sees the privacy notice and must consent before
  anything is processed. A link to the full privacy policy is always visible.
- **Always on.** Navio works 24/7, so visitors get help outside office hours.

## The personality

Navio is warm, motivating, and a little playful — never robotic. It speaks
informally (the German *"du"*), uses emojis sparingly for warmth (👋🏻 💪🏻 💚),
and keeps answers concrete and encouraging. For companies and partners it keeps
the same friendly voice but adds more substance and precision.

**Robotic:** *"The notice period is one month to the end of a calendar month."*
**Navio:** *"Your cancellation always takes effect at the end of the next full
month — so if you cancel on 15 March, everything runs until 30 April. 👍🏻"*

---

# Part 2 — For Developers & IT (Technical)

## Overview

Navio is a small, self-contained chatbot service with three pieces:

```
 Visitor's browser
        │
        ▼
 React chat widget  ───────►  FastAPI backend  ───────►  Azure OpenAI (gpt-4.1)
 (frontend)                   (backend/app.py)           (the language model)
```

- The **frontend** is a React + Vite app. It renders the chat UI, handles the
  consent gate, and calls the backend.
- The **backend** is a FastAPI service. It holds the **system prompt + knowledge
  base** and the **Azure OpenAI key**, and forwards conversations to the model.
- **Azure OpenAI** runs the `gpt-4.1` model that generates replies.

> **Key security principle:** the API key and the system prompt live **only on
> the backend** — never in the browser.

## Repository layout (Navio's parts)

| Path | What it is |
|------|-----------|
| `backend/app.py` | The FastAPI service — all endpoints, security, and the model call |
| `backend/SYSTEM_PROMPT.md` | Navio's identity, tone rules, and the full embedded knowledge base |
| `backend/requirements.txt` | Python dependencies |
| `backend/Dockerfile` | Container build for the backend |
| `docker-compose.yml` | Full production stack: Caddy + Navio + Redis |
| `frontend/src/data/bots.ts` | Navio's profile (name, greeting, quick replies, API URL, privacy text) |
| `frontend/src/components/NavioChat.tsx` | The chat window UI (consent gate, messages, input) |
| `frontend/src/components/ChatWidget.tsx` | The floating launcher bubble + greeting card |
| `frontend/src/lib/api.ts` | The client that calls `POST /api/chat` |

## Backend

### Tech stack

Python 3.13, **FastAPI** + **uvicorn**, the **OpenAI** SDK (pointed at an Azure
endpoint), **slowapi** for rate limiting, **httpx** for the Turnstile call, and
optional **Redis** for shared rate-limit counters.

### Endpoints

| Method & path | Purpose | Auth |
|---------------|---------|------|
| `GET /health` | Liveness/readiness check; returns model name + Turnstile state | none |
| `POST /api/chat` | Main chat: send a message + recent history, get Navio's reply | session token *(if Turnstile on)* |
| `POST /api/session` | Mint a short-lived session token after a Turnstile challenge | Turnstile token |
| `GET /api/config` | Read the current system prompt + privacy text | none |
| `POST /api/config/system-prompt` | Update the system prompt (takes effect on next chat) | `X-Admin-Token` *(if set)* |
| `POST /api/config/datenschutz` | Update the privacy text | `X-Admin-Token` *(if set)* |

### How a chat request is handled

1. The frontend sends `{ message, history }` to `POST /api/chat`.
2. The backend builds the message list: **system prompt first** (injected
   server-side), then the client's user/assistant history, then the new message.
   The client can never inject a `system` role.
3. It calls Azure OpenAI (`gpt-4.1`) with `temperature=0.4` and `max_tokens=800`.
4. It returns `{ reply }`.

### Graceful error handling

Model errors never surface as a raw HTTP 500:

- **Content-filter / bad request** (jailbreak, hate, violence, sexual, or any
  400) → a polite bilingual refusal that redirects to Sportnavi topics.
- **Timeout / connection / rate-limit / upstream error** → a friendly
  "briefly unavailable, please try again" message.
- Anything genuinely unexpected is re-raised so real bugs aren't hidden.

### Security (v1)

- **CORS allowlist** — only configured origins (e.g. `sportnavi.de`) may call the API.
- **Per-IP rate limiting** — default **15/min** and **300/day** (slowapi;
  in-memory by default, Redis when `REDIS_URL` is set).
- **Strict input caps** — message ≤ **2000 chars**, history ≤ **10 turns**
  (enforced by Pydantic models).
- **Cloudflare Turnstile (optional)** — when `TURNSTILE_SECRET` is set, the
  client must pass a Turnstile challenge to get an **HMAC-signed session token**
  (default 30-min TTL), which is then required on every `/api/chat` call. When
  the secret is empty, this whole layer is off (useful for local dev).
- **Admin writes** — config-write endpoints are gated by `ADMIN_TOKEN` when set.

### Configuration (environment variables)

| Variable | Default | Meaning |
|----------|---------|---------|
| `AZURE_AI_CHATBOT_API_KEY` | *(required)* | Azure OpenAI key |
| `AZURE_AI_CHATBOT_OPENAI_ENDPOINT` | *(required)* | Azure endpoint (v1-compatible base URL) |
| `AZURE_AI_CHATBOT_DEPLOYMENT_NAME` | *(required)* | Deployment / model name (e.g. `gpt-4.1`) |
| `ALLOWED_ORIGINS` | sportnavi.de + ncr4ailab.de | CORS allowlist (comma-separated) |
| `RATE_LIMIT_PER_MIN` / `RATE_LIMIT_PER_DAY` | `15` / `300` | Per-IP limits |
| `MAX_MESSAGE_CHARS` / `MAX_HISTORY_TURNS` | `2000` / `10` | Input caps |
| `MAX_TOKENS` / `TEMPERATURE` | `800` / `0.4` | Model output limits |
| `TURNSTILE_SECRET` | *(empty = off)* | Enables the Turnstile + session-token layer |
| `SESSION_SECRET` / `SESSION_TTL_MIN` | *(falls back)* / `30` | Session-token signing key + lifetime |
| `REDIS_URL` | *(empty = in-memory)* | Shared rate-limit store |
| `ADMIN_TOKEN` | *(empty = open)* | Gate for config-write endpoints |

### The system prompt & knowledge base

`backend/SYSTEM_PROMPT.md` defines **who Navio is** (identity, audiences, tone,
language rules, brand spelling "Sportnavi") and embeds the **complete knowledge
base** — the member FAQ, the company/Firmenfitness FAQ, and the partner FAQ.
Navio is instructed to answer **only** from this content. It can be edited on disk
or live via `POST /api/config/system-prompt` (the change applies on the next chat,
no restart).

## Frontend

### Tech stack

React + Vite + TypeScript, Tailwind CSS, and `motion/react` for animations.

### The chat experience

- **`ChatWidget`** — the floating launcher: a bubble → greeting card → chat panel,
  fixed to the viewport (or `contained` for an in-page demo).
- **`NavioChat`** — the chat window itself:
  - **Consent gate** — the privacy notice is shown before every new conversation
    and is *not* persisted; the input stays disabled until the visitor clicks
    *Zustimmen* (Agree).
  - **Greeting + quick replies** — a bilingual intro and tappable suggested
    questions.
  - **Messages** — user, bot (rendered as Markdown), and error bubbles, with a
    typing indicator while loading.
  - **Header controls** — about / reset / close.
  - **Always-visible privacy link** in the footer.
- **`lib/api.ts`** — `sendChat(message, history)` calls `POST /api/chat`, trims to
  the backend caps, and turns 429s and other failures into readable messages.
  `setApiBase(url)` lets the embeddable widget point at the production backend.

### Dev vs production wiring

- In **dev**, the request path is relative (`/api/chat`) and Vite proxies it to
  the backend, so there's no CORS.
- In **production**, set `VITE_NAVIO_API` to the backend origin
  (e.g. `https://navio.sportnavi.de`).

## Running it

### Local development

```bash
# Backend
cd backend
pip install -r requirements.txt
# create a .env with the AZURE_AI_CHATBOT_* keys (leave TURNSTILE_SECRET empty for dev)
uvicorn app:app --reload          # serves on http://127.0.0.1:8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                       # Vite proxies /api -> 127.0.0.1:8000
```

### Production (Docker Compose)

```bash
# Set NAVIO_DOMAIN and the AZURE_AI_CHATBOT_* secrets in .env
docker compose up -d --build      # start everything
docker compose logs -f navio      # watch the app
docker compose down               # stop
```

The compose stack is:

```
 internet ──► Caddy (auto-HTTPS, the only public entry)
                 └─► navio (FastAPI, multiple uvicorn workers)
                        └─► redis (shared rate-limit counters, internal only)
```

- **Caddy** terminates HTTPS automatically and is the single public entry point.
- **Navio** runs with multiple workers (`WEB_CONCURRENCY` / `WORKERS`).
- **Redis** holds shared rate-limit counters so limits hold across workers; it's
  internal-only and not persisted (counters are disposable).

## Quick reference

| Item | Value |
|------|-------|
| Model | Azure OpenAI `gpt-4.1` |
| Languages | German & English (auto-detected per message) |
| Chat endpoint | `POST /api/chat` |
| Default rate limits | 15/min, 300/day per IP |
| Input caps | 2000 chars/message, 10 history turns |
| Privacy | Consent gate before every conversation; link to sportnavi.de/datenschutz |
| Knowledge | Answers only from the embedded Sportnavi knowledge base |
