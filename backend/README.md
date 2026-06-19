# Navio — Backend

The **FastAPI** backend that powers Navio, the Sportnavi guide chatbot. It talks to
**Azure OpenAI** (`gpt-4.1`) for replies and to a **Postgres database** — **Supabase**
or **Azure Database for PostgreSQL** — for the editable system prompt and a
consent‑gated conversation log.

This folder is self‑contained — the app, prompts, database schema, dependencies, and
container definition all live here, and it can be **hosted on its own** (the frontend is
a separate service that simply calls this API).

---

## Architecture in one minute

- **Stateless.** The server holds no session. The browser sends the recent chat history
  on every request, so any instance can serve any request (horizontally scalable).
- **Env‑driven.** Everything — secrets, limits, the database — comes from environment
  variables. Nothing is hardcoded; the same image runs locally, in a container, or on
  a serverless host by just changing env vars.
- **Degrades safely.** With no `DATABASE_URL` it still boots and chats (prompt falls back
  to the on‑disk file). With no Clerk config, admin auth falls back to a shared token.
  Only Azure OpenAI is strictly required to get a reply.

```
Browser ──HTTP──▶ this backend ──▶ Azure OpenAI (replies)
                       │
                       └────────▶ Postgres: Supabase or Azure (config + conversation log)
```

---

## Folder layout

```
backend/
├── app.py                 FastAPI app — endpoints, CORS, rate limiting, input caps,
│                          Turnstile/session hooks, admin auth wiring
├── db.py                  PostgreSQL layer (psycopg) — config + conversation logging
├── clerk_auth.py          verifies Clerk login JWTs + admin email‑domain allowlist
├── chatbot.py             terminal chat loop for quick local testing (no server)
├── requirements.txt       Python dependencies
├── Dockerfile             builds the backend container image (Cloud Run / any host)
├── vercel.json            routes all paths to the serverless function (Vercel)
├── api/
│   └── index.py           Vercel ASGI entrypoint — re‑exports app:app
├── cloudrun.env.yaml      non‑secret env values for a Cloud Run deploy (optional)
├── .env                   local secrets (git‑ignored) — never commit
├── prompts/
│   ├── SYSTEM_PROMPT.md    full Navio prompt + knowledge base (read at startup)
│   └── DATENSCHUTZ.md      privacy‑notice reference text
└── sql/
    └── schema.sql          database tables — run ONCE against the server
```

---

## Requirements

| Tool | Version | For |
|---|---|---|
| [Python](https://python.org) | 3.11+ | running the backend |
| An **Azure OpenAI** resource | — | a deployed `gpt-4.1` model (key + endpoint) |
| A **Postgres database** (Supabase or Azure) | — | optional but recommended (config + logging) |

---

## Run locally

```bash
cd backend
cp ../.env.example .env          # then fill in the values (see below)
pip install -r requirements.txt
uvicorn app:app --reload         # → http://127.0.0.1:8000
```

Open **http://127.0.0.1:8000/docs** for the interactive API, or
**http://127.0.0.1:8000/health** to check status:

```json
{ "status": "ok", "model": "gpt-4.1", "turnstile": false, "database": true }
```

`"database": true` means `DATABASE_URL` is set. To verify the DB actually connects,
send a chat and confirm a row lands in `conversations` (see [Database setup](#database-setup)).

---

## Environment variables

Secrets live in a git‑ignored `.env` (local) or your host's secret store (production).

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `AZURE_AI_CHATBOT_API_KEY` | ✅ | — | Azure OpenAI key (secret). |
| `AZURE_AI_CHATBOT_OPENAI_ENDPOINT` | ✅ | — | v1‑compatible endpoint URL. |
| `AZURE_AI_CHATBOT_DEPLOYMENT_NAME` | ✅ | — | Model deployment, e.g. `gpt-4.1`. |
| `DATABASE_URL` | ➖ | _(empty = no DB)_ | Postgres connection string (secret). Empty → prompt falls back to the on‑disk file, no logging. |
| `ALLOWED_ORIGINS` | ➖ | `https://sportnavi.de,https://www.sportnavi.de` | CORS allowlist (comma‑separated). |
| `RATE_LIMIT_PER_MIN` | ➖ | `15` | Per‑IP requests/minute. |
| `RATE_LIMIT_PER_DAY` | ➖ | `300` | Per‑IP requests/day. |
| `MAX_MESSAGE_CHARS` | ➖ | `2000` | Max length of one message. |
| `MAX_HISTORY_TURNS` | ➖ | `10` | Max recent turns accepted. |
| `MAX_TOKENS` | ➖ | `800` | Max reply length. |
| `TEMPERATURE` | ➖ | `0.4` | Creativity (0 = factual, 1 = playful). |
| `CONFIG_TTL_SEC` | ➖ | `30` | How long an instance caches the prompt before re‑reading the DB. |
| `TURNSTILE_SECRET` | ➖ | _(empty = OFF)_ | Cloudflare Turnstile secret; set to enable bot protection. |
| `SESSION_SECRET` | ➖ | _(falls back to Turnstile secret)_ | Signs session tokens. |
| `SESSION_TTL_MIN` | ➖ | `30` | Session‑token lifetime. |
| `IP_HASH_SALT` | ➖ | _(falls back to `SESSION_SECRET`)_ | Salt for hashing visitor IPs in the log. |
| `CLERK_ISSUER` | ➖ | _(empty = OFF)_ | Clerk instance URL; enables admin auth for prompt edits. |
| `CLERK_SECRET_KEY` | ➖ | — | Clerk secret key (secret) — looks up the admin's verified email. |
| `ADMIN_EMAIL_DOMAINS` | ➖ | — | Comma‑separated domains allowed to edit the prompt. |
| `ADMIN_TOKEN` | ➖ | _(empty = open, dev only)_ | Legacy shared admin password (used only when Clerk is off). |
| `REDIS_URL` | ➖ | _(empty = in‑memory)_ | Shared rate‑limit store; set when running more than one instance. |

---

## API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness → `{"status":"ok","model":"gpt-4.1","turnstile":false,"database":true}` |
| `/api/chat` | POST | `{"message":"...","history":[{"role":"user","content":"..."}],"consent":false}` → `{"reply":"..."}`. When Turnstile is ON, also send header `X-Navio-Session: <token>`. |
| `/api/session` | POST | Only when Turnstile is ON. `{"turnstile_token":"..."}` → `{"session_token":"...","expires_in":1800}` |
| `/api/config` | GET | Current system prompt + whether admin auth is required. |
| `/api/config/system-prompt` | POST | Update the prompt. **Requires admin** — `Authorization: Bearer <Clerk JWT>`. |

> The detailed **Security & API Protection** writeup (CORS, rate limiting, Turnstile,
> prompt‑injection defenses) lives in the [project README](../README.md).

---

## Database setup

The backend talks to a **standard Postgres** database — use **Supabase** or **Azure
Database for PostgreSQL**, whichever you prefer. Both speak the same protocol, so you
only set **one** `DATABASE_URL`; there is no provider switch in the code. Two tables:
`bot_config` (the editable prompt) and `conversations` (consent‑gated chat log).

**One‑time — create the tables.** Run [sql/schema.sql](sql/schema.sql) once against your
server using a **direct** port (`5432`).

- **Supabase:** paste the contents of `sql/schema.sql` into the dashboard **SQL Editor**
  and run it, or use `psql` with the direct connection string from
  **Project → Settings → Database**.
- **Azure:**
  ```bash
  psql "host=YOUR-SERVER.postgres.database.azure.com port=5432 dbname=postgres \
        user=navioadmin password=*** sslmode=require" -f sql/schema.sql
  ```

No `psql`? psycopg is already a dependency, so you can run the schema with Python
(point `DATABASE_URL` at a direct/session port for this one‑off):

```bash
python -c "import psycopg,os; \
c=psycopg.connect(os.environ['DATABASE_URL']); \
c.execute(open('sql/schema.sql',encoding='utf-8').read()); c.commit()"
```

**Connection string** — set `DATABASE_URL` to a **pooler** port for the running app so a
serverless / multi‑instance backend never exhausts the server's connection limit. The app
disables psycopg's server‑side prepared statements ([db.py](db.py)), so a **transaction**
pooler works without the usual "prepared statement does not exist" error.

```
# Supabase — transaction pooler (6543), best for Vercel/serverless:
postgresql://postgres.<project-ref>:PASSWORD@aws-0-<region>.pooler.supabase.com:6543/postgres
# Supabase — session pooler (5432), fine for Cloud Run max-instances=1:
postgresql://postgres.<project-ref>:PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres
# Azure — PgBouncer (6432), keep sslmode=require:
postgresql://navioadmin:PASSWORD@YOUR-SERVER.postgres.database.azure.com:6432/postgres?sslmode=require
```

⚠️ **Port matters:**
- **`5432`** — direct/session connection. Use for the one‑time schema load and local
  single‑process dev.
- **Pooler port** (`6543` Supabase transaction, `6432` Azure PgBouncer) — use for any
  **serverless or multi‑instance** host (e.g. Vercel, Cloud Run) so many app copies share a
  few database connections. On Supabase the pooler is on by default (copy the string from
  the dashboard's **Connect** dialog); on Azure enable it first: **Server parameters** →
  `pgbouncer.enabled = true`.

---

## Hosting the backend (on its own)

The backend is a standard ASGI app (`app:app`). It runs anywhere that runs Python or a
container. Pick whichever fits your platform — the **only** things any host needs are the
environment variables above (at minimum the three Azure ones, plus `DATABASE_URL`).

### Option A — Vercel (serverless)

Vercel runs the app as **serverless Python functions**. The wiring already lives in this
folder: [vercel.json](vercel.json) rewrites every path to [api/index.py](api/index.py),
which re‑exports the same `app:app`. [vercel.json](vercel.json) also sets `maxDuration: 60`
(for slow replies) and bundles `prompts/**` (read at startup).

> **Full step-by-step guide (both services on Vercel, via the dashboard):**
> [docs/vercel/README.md](../docs/vercel/README.md) + [TROUBLESHOOTING](../docs/vercel/TROUBLESHOOTING.md).

To deploy:

1. Create a Vercel project from this repo with **Root Directory = `backend/`** (Vercel
   auto‑installs `requirements.txt`).
2. Set the env vars in **Project → Settings → Environment Variables**: the three Azure
   ones, `DATABASE_URL`, the Clerk keys, and `ALLOWED_ORIGINS` (the frontend's domain).
3. Use a **transaction pooler** `DATABASE_URL` (Supabase `6543` / Azure `6432`) — serverless
   spins up many isolated instances, and the pooler stops them exhausting Postgres
   connections. (The app disables prepared statements so the transaction pooler is safe.)
4. Pin the function **region** close to the database to keep latency low.

**Two serverless caveats** (both fine — just know them; Cloud Run avoids both):

- **Rate limiting** — in‑memory counters don't persist across isolated invocations, so the
  per‑IP limit won't hold on Vercel unless you set **`REDIS_URL`** to a shared store
  (e.g. **Upstash Redis**). See the scaling note below.
- **Conversation logging** — `/api/chat` logs the turn *after* the response via
  `BackgroundTasks`; a serverless function can freeze once the response is sent, so some
  log rows may not be written. Logging is fire‑and‑forget by design (it never blocks or
  breaks a reply), so this only costs you a few analytics rows.

### Option B — Docker container (any host)

Works on Azure Container Apps, Cloud Run, a VPS, or anything that runs containers.

```bash
docker build -t navio-backend backend
docker run -p 8000:8000 --env-file backend/.env navio-backend
```

The image runs `uvicorn app:app --host 0.0.0.0 --port 8000 --forwarded-allow-ips "*"`
(the proxy flag lets rate limiting see the real client IP).

### Option C — Google Cloud Run

A full copy‑paste runbook (secrets, env, deploy) is in [DEPLOY.md](../DEPLOY.md).

### Scaling note

Running **more than one** instance/worker — or **any** serverless deploy (Vercel)? Set
`REDIS_URL` to a shared Redis (e.g. Upstash) so the per‑IP rate limiter stays accurate
across processes/invocations (otherwise each counts separately and the limit loosens).
A single always‑on instance (Cloud Run `max-instances 1`, or `uvicorn` locally) → leave
it empty.

---

## Local CLI (no server)

A quick way to chat with Navio in the terminal — no API, no database:

```bash
cd backend
python chatbot.py
```

Type questions in German or English at the `You:` prompt. Type `exit` to quit.
