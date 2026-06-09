# Navio Chatbot

**Navio** — the friendly guide for **Sportnavi.de**, on **Azure OpenAI** (`gpt-4.1`).

### Project structure

```
backend/                 the FastAPI app (see backend/README.md)
  app.py                 endpoints, CORS, rate limiting, Turnstile/session hooks
  SYSTEM_PROMPT.md       full Navio prompt with the knowledge base baked in
  chatbot.py             terminal chat loop for local testing
  requirements.txt       Python dependencies
  Dockerfile             builds the backend image
docker-compose.yml       deployment stack: Caddy + backend + Redis
Caddyfile                reverse proxy + automatic HTTPS
knowledge_base/          source docs (reference for the baked prompt)
.env                     credentials + settings (git-ignored)
```

The backend has its own docs: **[backend/README.md](backend/README.md)**.

## Setup

```powershell
pip install -r backend/requirements.txt
```

Credentials are read from [.env](.env):

```
AZURE_AI_CHATBOT_API_KEY=...
AZURE_AI_CHATBOT_OPENAI_ENDPOINT=https://...openai.azure.com/openai/v1
AZURE_AI_CHATBOT_DEPLOYMENT_NAME=gpt-4.1
```

Optional API tuning (all have safe defaults):

```
ALLOWED_ORIGINS=https://sportnavi.de,https://www.sportnavi.de
RATE_LIMIT_PER_MIN=15
RATE_LIMIT_PER_DAY=300
MAX_MESSAGE_CHARS=2000
MAX_HISTORY_TURNS=10
MAX_TOKENS=800
```

### Go-live hooks (off by default — activate by setting env vars)

```
# Cloudflare Turnstile anti-abuse. Empty = OFF (dev). Set the secret = ON.
TURNSTILE_SECRET=          # from Cloudflare dashboard (free)
SESSION_SECRET=            # any long random string (signs session tokens)
SESSION_TTL_MIN=30

# Rate-limit storage. Empty = in-memory (single container).
# Set a Redis URL only when running multiple workers/containers.
REDIS_URL=                 # e.g. redis://localhost:6379
```

- **Turnstile OFF** (default): `/api/chat` works directly — zero friction for development.
- **Turnstile ON** (secret set): clients must first call `POST /api/session` with a
  Turnstile token to get a `session_token`, then send it as the `X-Navio-Session`
  header on `/api/chat`. No code change — just set the env var.
- **Redis**: unset = in-memory limits (per process); set = shared limits across all
  processes. Flip it only when you scale beyond one worker.

## Run the API

```powershell
uvicorn app:app --app-dir backend --reload     # http://127.0.0.1:8000
```

Or with Docker (secrets passed at runtime — never baked into the image):

```powershell
docker build -t navio backend
docker run -p 8000:8000 --env-file .env navio
```

### Deploy on a dedicated server (docker-compose)

A self-contained stack — **Caddy (auto-HTTPS) + Navio (multiple workers) + Redis** —
lives in [docker-compose.yml](docker-compose.yml) and [Caddyfile](Caddyfile). Caddy is
the only public entry; Redis is internal-only (shared rate limits across workers).

1. Point your domain's DNS A-record at the server, then set it in `.env`:
   ```
   NAVIO_DOMAIN=navio.sportnavi.de    # or ":80" for local/plain-HTTP testing
   WORKERS=2                          # ≈ 2 × CPU cores
   ```
2. Bring it up (Caddy fetches a free HTTPS certificate automatically):
   ```bash
   docker compose up -d --build
   ```

`REDIS_URL` is set automatically by compose to the bundled Redis — you don't touch it.
Scale by raising `WORKERS` (and the server size); the shared Redis keeps rate limits
correct across all workers. To go fully public, set `TURNSTILE_SECRET` (see below).

### Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness check → `{"status":"ok","model":"gpt-4.1","turnstile":false}` |
| `/api/session` | POST | Only needed when Turnstile is ON. Body: `{"turnstile_token":"..."}` → `{"session_token":"...","expires_in":1800}` |
| `/api/chat` | POST | Chat. Body: `{"message": "...", "history": [{"role":"user","content":"..."}]}` → `{"reply": "..."}`. When Turnstile is ON, also send header `X-Navio-Session: <session_token>`. |

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
