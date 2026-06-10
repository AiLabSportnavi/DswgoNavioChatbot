# Navio Chatbot

**Navio** — the friendly guide for **Sportnavi.de**, on **Azure OpenAI** (`gpt-4.1`).

### Project structure

```
backend/                 FastAPI app — the API, never shipped to the browser
  app.py                 endpoints, CORS, rate limiting, Turnstile/session hooks
  clerk_auth.py          verifies Clerk login JWTs + admin email-domain allowlist
  supabase_client.py     config storage + consent-gated conversation logging
  SYSTEM_PROMPT.md       full Navio prompt with the knowledge base baked in
  schema.sql             Supabase tables (run once in the SQL editor)
  requirements.txt       Python dependencies
  Dockerfile             builds the backend image
  .env                   backend secrets (git-ignored) — used by `uvicorn` directly
frontend/                React + Vite SPA + the embeddable chat widget
  src/                   app code (components, pages, lib/api.ts)
  Dockerfile             builds the static site into an nginx image
  nginx.conf             serves the SPA + proxies /api to the backend
  .env                   frontend env (git-ignored) — the Clerk publishable key
docker-compose.yml       full-stack server deploy: Caddy + frontend + backend + Redis
Caddyfile                reverse proxy: /api → backend, everything else → frontend
.env                     root env (git-ignored) — read by docker-compose
.env.example             template for the root/backend env (copy → .env)
```

Two deployment models live in this repo:
- **Google Cloud Run** (current production) — backend and frontend as two separate services. See **[DEPLOY.md](DEPLOY.md)**.
- **Docker Compose** — the whole stack on one machine, one command. See [below](#option-b--with-docker-whole-stack-one-command).

## What you need

**Tools**
| Tool | Version | For |
|---|---|---|
| [Node.js](https://nodejs.org) | 20+ | building/running the frontend |
| [Python](https://python.org) | 3.11+ | running the backend |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | latest | **only** for the Docker run mode (Option B) |

**Accounts / keys** (the app talks to three external services)
| Service | What you get | Where it goes |
|---|---|---|
| **Azure OpenAI** | API key + endpoint + deployment name | backend env (secret) |
| **Supabase** | project URL + service-role key | backend env (secret) |
| **Clerk** (login) | publishable key (`pk_…`) + secret key (`sk_…`) | publishable → frontend; secret → backend |

> The app **boots without Supabase or Clerk** (config falls back to disk; admin auth falls back to a token). Only Azure is strictly required to get a chat reply.

---

## 1. Environment setup (do this once)

Secrets live in **git-ignored `.env` files** — never committed. There are three, and which you fill depends on how you run (see the table). Copy each from its `.example` template and fill in the values.

| File | Read by | Needed for |
|---|---|---|
| `frontend/.env` | the frontend (Vite) | **always** |
| `backend/.env` | the backend, when run with `uvicorn` | Option A (no Docker) |
| `.env` (root) | the backend, via Docker Compose | Option B (Docker) |

> `.env` (root) and `backend/.env` hold the **same backend values** — you only fill the one matching your run mode.

```powershell
# Frontend (always)
Copy-Item frontend\.env.example frontend\.env

# Backend — pick ONE depending on how you run:
Copy-Item .env.example backend\.env    # Option A: local dev with uvicorn
Copy-Item .env.example .env            # Option B: Docker Compose
```

Then open each `.env` and fill in:

```ini
# backend/.env  (or root .env)  — secrets
AZURE_AI_CHATBOT_API_KEY=...                 # from Azure portal
AZURE_AI_CHATBOT_OPENAI_ENDPOINT=https://...openai.azure.com/openai/v1
AZURE_AI_CHATBOT_DEPLOYMENT_NAME=gpt-4.1
SUPABASE_URL=https://xxxx.supabase.co        # optional
SUPABASE_SERVICE_ROLE_KEY=...                # optional, secret
CLERK_ISSUER=https://your-app.clerk.accounts.dev
CLERK_SECRET_KEY=sk_test_...                 # secret — admin login
ADMIN_EMAIL_DOMAINS=sportnavi.de             # who may edit the system prompt

# frontend/.env  — browser-safe only
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...        # the login UI key
```

All other settings (rate limits, input caps, Turnstile, Redis) have safe defaults — see the comments in [.env.example](.env.example). Authentication is explained in detail under [Admin login](#admin-login-clerk).

---

## 2. Running the app — two ways

### Option A — without Docker (local development)

Best for coding: hot-reload on both sides. **Two terminals.**

```powershell
# Terminal 1 — backend  (reads backend/.env)
cd backend
pip install -r requirements.txt
uvicorn app:app --reload                 # → http://127.0.0.1:8000

# Terminal 2 — frontend (reads frontend/.env)
cd frontend
npm install
npm run dev                              # → http://localhost:5173
```

Open **http://localhost:5173**. The frontend calls `/api/...`, and Vite proxies that to the backend on port 8000 (see [vite.config.ts](frontend/vite.config.ts)), so the browser stays same-origin — no CORS.

> If you also have the Docker stack running, stop it first (`docker compose down`) — it would otherwise occupy port 8000.

### Option B — with Docker (whole stack, one command)

Best for running the app like production on one machine — no Node/Python needed, just Docker. Caddy serves everything on one port.

```powershell
docker compose up -d --build             # build + start everything
docker compose logs -f                   # watch the logs
docker compose down                      # stop everything
```

Open **http://localhost**. One container set, behind Caddy:

```
http://localhost  ─▶ Caddy ─┬─ /api/*, /health ─▶ backend (FastAPI) ─▶ Redis
                            └─ everything else ─▶ frontend (nginx: SPA + widget)
```

What compose handles for you:
- **Builds both images** — the frontend (static site → nginx) and the backend.
- **Bakes the Clerk key into the frontend** at build time from the committed [frontend/.env.production](frontend/.env.production) (the publishable key is public; Vite inlines it — same path as the Cloud Run build).
- **Redis** is wired automatically for shared rate limits — you don't set `REDIS_URL`.

For a public server, point your domain at the host and set `NAVIO_DOMAIN` in the root `.env` (Caddy then auto-issues HTTPS):

```ini
NAVIO_DOMAIN=navio.sportnavi.de     # ":80" = local/plain-HTTP testing
WORKERS=2                           # ≈ 2 × CPU cores
```

### Which do I use?

| You want to… | Use |
|---|---|
| Edit code with hot-reload | **Option A** (no Docker) |
| Run the whole app like production on one box | **Option B** (Docker) |
| Deploy to the cloud (current production) | Cloud Run — see [DEPLOY.md](DEPLOY.md) |

---

## 3. Deploy on your own server (step by step)

The friendly, start-to-finish version of Option B — host the **whole app** (website
+ chat + login) on one machine, e.g. a VPS from Hetzner, DigitalOcean, or AWS EC2.
Backend and frontend run **together** here; you don't host them separately.

### First — collect these 7 values

Everything you fill in comes from three accounts. Get them once and keep them in a
safe note:

| From | Value | Secret? |
|---|---|---|
| **Azure OpenAI** | API key | 🔒 secret |
| | endpoint URL | public |
| | deployment name (e.g. `gpt-4.1`) | public |
| **Supabase** | project URL | public |
| | service-role key | 🔒 secret |
| **Clerk** | publishable key (`pk_…`) | public |
| | secret key (`sk_…`) | 🔒 secret |

### Step 1 — install Docker on the server

[Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or
`docker` + the compose plugin (Linux). Nothing else — no Node, no Python.

### Step 2 — fill in two files

**📄 `.env`** (project root) — copy the template, then fill it in:

```powershell
Copy-Item .env.example .env
```
```ini
AZURE_AI_CHATBOT_API_KEY=<your Azure key>
AZURE_AI_CHATBOT_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/openai/v1
AZURE_AI_CHATBOT_DEPLOYMENT_NAME=gpt-4.1
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your Supabase service-role key>
CLERK_ISSUER=https://your-app.clerk.accounts.dev
CLERK_SECRET_KEY=<your Clerk sk_ key>
ADMIN_EMAIL_DOMAINS=sportnavi.de            # who may edit the system prompt
NAVIO_DOMAIN=navio.yourdomain.com           # or ":80" to test without a domain
```

**📄 `frontend/.env.production`** — the only value the website's browser needs:

```ini
VITE_CLERK_PUBLISHABLE_KEY=<your Clerk pk_ key>
```

### Step 3 — create the Supabase tables (one time)

Open your Supabase project → **SQL editor** → paste and run the contents of
[backend/schema.sql](backend/schema.sql). (Skip if you reuse an existing Supabase
that already has the tables.)

### Step 4 — start everything

```bash
docker compose up -d --build      # build + start
docker compose logs -f            # watch it
docker compose down               # stop
```

### Step 5 — point your domain at the server

Add a DNS **`A` record** for `navio.yourdomain.com` pointing to the server's IP.
Caddy automatically fetches a free HTTPS certificate for the `NAVIO_DOMAIN` you set.

✅ **Done.** Open `https://navio.yourdomain.com` — website, chat, login, and the
admin editor all run from that one address.

> Just testing with no domain? Set `NAVIO_DOMAIN=:80` and open `http://localhost`.

### Hosting backend and frontend separately instead

If you'd rather host each piece as its own service (cloud platforms like Cloud Run),
the order matters: **deploy the backend first**, copy its URL, then point the
frontend at that URL (`frontend/nginx.conf`) before deploying it, and finally add
the frontend's address to `ALLOWED_ORIGINS`. The full copy-paste runbook is in
**[DEPLOY.md](DEPLOY.md)**.

### The one rule to remember

- **Secret keys** (Azure key, Supabase service-role, Clerk `sk_…`) → only ever on
  the **backend / server**. Never in the frontend.
- **Public values** (Clerk `pk_…`, the backend URL) → fine in the **frontend** —
  they're meant to be seen.

---

## Admin login (Clerk)

Editing Navio's system prompt is restricted. The flow:

1. A visitor clicks **sign in / sign up** in the navbar → Clerk's login modal.
2. The browser sends the signed-in user's Clerk token to the backend on save.
3. The backend (`clerk_auth.py`) verifies the token and checks the user's **verified email domain** against `ADMIN_EMAIL_DOMAINS`. Match → allowed; otherwise `403`.

So only people with an email on an allow-listed domain (e.g. `@sportnavi.de`) can change the prompt. Change `ADMIN_EMAIL_DOMAINS` (comma-separated) to adjust. Leave `CLERK_ISSUER` empty to disable Clerk entirely and fall back to a shared `ADMIN_TOKEN` (dev only).

## API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness check → `{"status":"ok","model":"gpt-4.1","turnstile":false}` |
| `/api/chat` | POST | Chat. Body: `{"message": "...", "history": [{"role":"user","content":"..."}]}` → `{"reply": "..."}`. When Turnstile is ON, also send header `X-Navio-Session: <session_token>`. |
| `/api/session` | POST | Only needed when Turnstile is ON. Body: `{"turnstile_token":"..."}` → `{"session_token":"...","expires_in":1800}` |
| `/api/config` | GET | Returns the current system prompt + whether admin auth is required. |
| `/api/config/system-prompt` | POST | Update the system prompt. **Requires admin** — `Authorization: Bearer <Clerk JWT>` (see [Admin login](#admin-login-clerk)). |

## Security & API Protection

Each measure is explained twice: **🧍 In plain words** (for everyone) and
**⚙️ Technically** (for developers).

### 1. The Azure key never reaches the browser

- **🧍 In plain words:** The "key" that pays for the AI is like a company credit card.
  We never hand it to visitors. Their browser talks only to *our* server, and *our*
  server talks to the AI. So the card stays locked in the back office.
- **⚙️ Technically:** The browser calls our FastAPI backend; only the backend holds
  `AZURE_AI_CHATBOT_API_KEY` and calls Azure OpenAI. The key is read from `.env`,
  never shipped to the client, never in the Docker image (passed at runtime).

### 2. CORS allowlist — only our website may use the bot from a browser

- **🧍 In plain words:** Imagine a guest list at a door. Only pages on `sportnavi.de`
  are on the list. If some other website tries to embed our bot, the browser turns
  them away.
- **⚙️ Technically:** `CORSMiddleware` allows only the origins in `ALLOWED_ORIGINS`.
  Cross-origin browser requests from other domains are blocked. (Note: CORS is a
  *browser* rule — see Turnstile below for protection against non-browser clients.)

### 3. Per-IP rate limiting — "don't be greedy" per visitor

- **🧍 In plain words:** Every device has an address (an "IP"). We let each address
  send up to **15 messages a minute**. A normal person never hits that — but it stops
  one person or bot from spamming Navio thousands of times and running up the bill.
  It limits *each individual*, not the total number of visitors.
- **⚙️ Technically:** `slowapi` `Limiter` keyed on the client IP (honoring
  `X-Forwarded-For` behind a proxy). Limits: `RATE_LIMIT_PER_MIN` (15) and
  `RATE_LIMIT_PER_DAY` (300). Exceeding returns HTTP `429` with a friendly message.

### 4. Input caps — no oversized or malformed requests

- **🧍 In plain words:** Messages can't be absurdly long, and only a short slice of
  recent chat is sent each time. This keeps costs predictable and blocks "giant
  payload" abuse.
- **⚙️ Technically:** Pydantic validation enforces `MAX_MESSAGE_CHARS` (2000) and
  `MAX_HISTORY_TURNS` (10); `MAX_TOKENS` caps the reply. Invalid bodies → HTTP `422`.

### 5. The system prompt is server-side (anti prompt-injection)

- **🧍 In plain words:** Navio's "rule book" (who it is, what it may say) lives on our
  server. Visitors can't swap it out or trick Navio into becoming a different bot.
- **⚙️ Technically:** The `system` message is injected by the backend. Client history
  is restricted to `user`/`assistant` roles only — a request trying to send a `system`
  turn is rejected (`422`). The prompt also contains explicit anti-injection rules.

### 6. Secrets handling

- **🧍 In plain words:** Passwords and keys are kept in a private file that never gets
  uploaded or shared.
- **⚙️ Technically:** All secrets live in `.env` (git-ignored). The Docker image copies
  code + `SYSTEM_PROMPT.md` only; secrets are injected at runtime via `--env-file`.

### 7. Cloudflare Turnstile — the invisible "are you real?" check (go-live, free)

**The problem it solves:** Our chat endpoint is open to the internet, and every message
costs money (the Azure bill). So we must assume **bots** (automated scripts) will try to
hammer it to run up the bill. CORS only stops *other websites' browsers*, and rate
limiting only caps *one address* — neither stops a script that rotates addresses. We need
to answer one question before spending money on a reply: *"is this a real human, or a bot?"*

- **🧍 In plain words:** Turnstile is a free tool from Cloudflare — the modern, *invisible*
  replacement for those annoying "click all the traffic lights" CAPTCHAs. Think of it as an
  **invisible bouncer**: it quietly checks each visitor in the background and hands real
  people a one-time "pass." That pass travels with their message; our server checks it
  before calling the AI. A bot can't get a valid pass, so it never reaches the expensive
  part — **no AI call, no cost.** Real visitors see *nothing* (no clicking, no friction).
  It's free, needs no credit card, and doesn't require hosting the site on Cloudflare.
- **⚙️ Technically:** Env-gated. When `TURNSTILE_SECRET` is set, the client first calls
  `POST /api/session` with a Turnstile token; the backend verifies it with Cloudflare's
  `siteverify` API and returns a short-lived **HMAC-signed session token**. That token is
  required as the `X-Navio-Session` header on every `/api/chat` call (so we verify once per
  session, not per message — smoother UX). This closes the gap CORS can't: non-browser
  clients. When `TURNSTILE_SECRET` is empty, the gate is fully bypassed (dev mode).

**To turn it on at go-live:** create a free Cloudflare account → make a Turnstile widget →
you get a **Site Key** (goes in the webpage) and a **Secret Key** (goes in the server's
`.env` as `TURNSTILE_SECRET`). Set it — no code changes.

### 8. Redis — keeping the rate limit consistent when scaling (only if needed)

**The problem it solves:** Today there is **one** server process, and it counts requests in
its own memory — so "15 per minute per visitor" is exact. But for high traffic you run
**several copies** of the server behind a load balancer. The catch: each copy has its own
separate counter and they don't talk to each other.

> Example with 3 server copies: a visitor's requests get spread across all three. Copy A
> counts 15 and blocks — but the visitor also sent 15 to copy B and 15 to copy C. They got
> through **~45**, not 15. The limit silently became 3× looser.

- **🧍 In plain words:** Redis is a tiny shared "scoreboard" that all the server copies
  write to, so they share **one** count instead of three separate ones. That keeps the
  "15 a minute" rule honest no matter how many copies are running. With a single server
  (today) it's **not needed and not running** — so it costs nothing now.
- **⚙️ Technically:** `Limiter(storage_uri=REDIS_URL)`. Empty → in-memory (per process);
  set → shared store across all workers/containers. The same applies to a single container
  run with multiple workers (`uvicorn --workers N`) — each worker is a separate process, so
  Redis is what unifies their counters. One env var, no code change.

**When to turn it on:** the moment you run more than one worker or container. Source can be
managed (Azure Cache for Redis) or a self-hosted Redis container. Until then, leave
`REDIS_URL` empty.

### What limits the *total* number of users?

- **🧍 In plain words:** The crowd size is set by your **Azure plan's capacity**, not by
  the per-person rule. One server easily handles hundreds of visitors; if everyone
  chats at once, Azure's per-minute capacity is the real ceiling.
- **⚙️ Technically:** A single worker serves ~40 concurrent in-flight requests
  (threadpool); the binding limit is the deployment's **TPM/RPM quota** in Azure. Scale
  by adding workers/containers (then enable Redis) and/or requesting a quota increase.

### Embedding on the website (minimal example)

```html
<script>
const NAVIO_API = "https://YOUR-BACKEND-DOMAIN/api/chat";
let history = [];
async function askNavio(message) {
  const res = await fetch(NAVIO_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: history.slice(-10) }),
  });
  const { reply } = await res.json();
  history.push({ role: "user", content: message }, { role: "assistant", content: reply });
  return reply;
}
</script>
```

## Local CLI (testing)

```powershell
cd backend
python chatbot.py
```

Type questions in German or English at the `You:` prompt. Type `exit` to quit.
