# Deploying Navio to Vercel — Complete Guide

A **step-by-step, no-jargon** guide to running **both** Navio services on **Vercel**, using
**Git integration** (connect your repo, set env vars, push → it deploys). If something breaks,
see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

> Prefer Cloud Run, or want the backend there and only the frontend on Vercel? See
> [../cloud-run/README.md](../cloud-run/README.md). The two services are independent — you can
> mix hosts.

---

## What you're deploying (and the honest caveats)

You'll create **two Vercel projects from the same GitHub repo**:

| Vercel project | Root Directory | What it is |
|---|---|---|
| **navio-backend** | `backend` | FastAPI as **Python serverless functions** |
| **navio-frontend** | `frontend` | The website (static Vite SPA — Vercel is *ideal* for this) |

```
   Visitor's browser
        │  opens the website (Vercel)
        ▼
   navio-frontend  (Vercel static)
        │  calls the API at VITE_NAVIO_API + CORS
        ▼
   navio-backend  (Vercel Python functions)
        ├──▶  Postgres (Supabase/Azure) — use a POOLER URL
        └──▶  Azure OpenAI (gpt-4.1)
```

**⚠️ Three serverless caveats for the BACKEND** (the frontend has none of these):

1. **Function timeout.** Vercel functions have a max run time. A slow `gpt-4.1` reply can be
   several seconds, so `backend/vercel.json` sets **`maxDuration: 60`**. On the **Hobby** (free)
   plan the ceiling is **60s**; on **Pro** it's 300s. If replies still cut off, you're on a
   plan whose limit is lower — upgrade or lower `MAX_TOKENS`.
2. **Rate limiting needs an external Redis.** Each serverless invocation is isolated, so the
   in-memory limiter doesn't add up. Set **`REDIS_URL`** to a free **Upstash** Redis (Part 5),
   or per-IP limits won't really hold.
3. **Conversation logging is best-effort.** It runs *after* the response via background tasks,
   and a serverless function can freeze once the response is sent — so a few log rows may not
   be written. This never blocks or breaks a reply (logging is fire-and-forget by design).

> The config in this repo already handles #1 and the cold-start file bundling. You handle the
> rest by setting env vars below.

---

## Prerequisites

| Need | How |
|---|---|
| Your code on **GitHub** | push this repo to a GitHub repository |
| A **Vercel account** | sign up at https://vercel.com (free Hobby plan is fine to start) |
| Your credentials | the same values as `deploy.env` / `backend/cloudrun.env.yaml` (Azure key + endpoint + model, `DATABASE_URL`, Clerk keys) |

> **Database note:** use a **pooler** `DATABASE_URL` (Supabase transaction pooler **`6543`**,
> or Azure PgBouncer **`6432`**) — serverless opens many short-lived connections, and the
> pooler stops them exhausting Postgres. The app already disables prepared statements so a
> transaction pooler works. If you use **Azure DB**, its firewall must allow Vercel's IPs
> (Vercel IPs are dynamic → allow `0.0.0.0`–`255.255.255.255`, same as for Cloud Run).

---

## Part 1 — Push the repo to GitHub

If it's not already on GitHub: create a repo and push. Vercel deploys *from* GitHub.

---

## Part 2 — Deploy the BACKEND (Python serverless)

1. Vercel dashboard → **Add New… → Project** → import your GitHub repo.
2. **Root Directory → `backend`.** (Critical — click *Edit* next to Root Directory and pick
   `backend`.) Vercel detects Python from `requirements.txt` + the `api/` folder; the
   [`backend/vercel.json`](../../backend/vercel.json) routes all paths to the function.
3. **Project name:** e.g. `navio-backend`.
4. **Environment Variables** — add these (you can paste them all at once in Vercel's bulk
   editor as `KEY=value` lines). 🔒 = secret, keep it safe:

   **Required (the app won't boot without these):**
   ```
   AZURE_AI_CHATBOT_API_KEY=...            🔒
   AZURE_AI_CHATBOT_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/openai/v1
   AZURE_AI_CHATBOT_DEPLOYMENT_NAME=gpt-4.1
   ```
   **Database + admin login:**
   ```
   DATABASE_URL=postgresql://...pooler...:6543/postgres   🔒   (use a POOLER port)
   CLERK_ISSUER=https://your-app.clerk.accounts.dev
   CLERK_SECRET_KEY=sk_...                  🔒
   ADMIN_EMAIL_DOMAINS=sportnavi.de
   ```
   **CORS + rate-limit store** (set `ALLOWED_ORIGINS` properly in Part 4):
   ```
   ALLOWED_ORIGINS=https://TEMP-set-in-part-4
   REDIS_URL=rediss://...upstash...          (add in Part 5; leave unset for now)
   ```
   **Optional** (have safe defaults — copy from [backend/cloudrun.env.yaml](../../backend/cloudrun.env.yaml)
   if you want to override): `RATE_LIMIT_PER_MIN`, `RATE_LIMIT_PER_DAY`, `MAX_MESSAGE_CHARS`,
   `MAX_HISTORY_TURNS`, `MAX_TOKENS`, `TEMPERATURE`, `SESSION_TTL_MIN`, `CONFIG_TTL_SEC`, and
   the `SALESFORCE_*` / `CONTACT_FALLBACK_EMAIL` values for the contact form.
5. **Deploy.** When it finishes, copy the backend URL, e.g. `https://navio-backend.vercel.app`.
6. **Test:** open `https://navio-backend.vercel.app/health` → `{"status":"ok", ... "database":true}`.

> **Region:** in the project's **Settings → Functions**, pick a region near your database
> (e.g. Frankfurt `fra1`) to keep latency low.

---

## Part 3 — Deploy the FRONTEND (the website)

1. Dashboard → **Add New… → Project** → import the **same repo** again.
2. **Root Directory → `frontend`.** Framework preset: **Vite** (auto-detected;
   [`frontend/vercel.json`](../../frontend/vercel.json) handles SPA routing).
3. **Project name:** e.g. `navio-frontend`.
4. **Environment Variables** (these are public — they're baked into the browser bundle):
   ```
   VITE_NAVIO_API=https://navio-backend.vercel.app     (the backend URL from Part 2)
   VITE_CLERK_PUBLISHABLE_KEY=pk_...                    (Clerk publishable key)
   ```
   > Unlike a file, Vercel injects these at **build time**, so there's no "did the env file
   > get uploaded?" problem — they're always baked in.
5. **Deploy.** Copy the website URL, e.g. `https://navio-frontend.vercel.app`.

---

## Part 4 — Connect them (CORS)

The backend only answers browsers it trusts. Add the **frontend's** URL to the backend:

1. Vercel → **navio-backend** project → **Settings → Environment Variables** → edit
   `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://navio-frontend.vercel.app
   ```
   (Add your custom domain too, comma-separated, once you set one.)
2. **Redeploy the backend** so it picks up the change: project → **Deployments → ⋯ → Redeploy**
   (env-var changes need a redeploy to take effect).

---

## Part 5 — Rate limiting with Upstash Redis (recommended)

Without this, per-IP rate limits don't hold on serverless. It's free:

1. Create a database at https://upstash.com (Redis) — pick a region near your backend.
2. Copy the **`rediss://…` connection URL** (the TLS one).
3. Vercel → **navio-backend** → **Settings → Environment Variables** → add
   `REDIS_URL=rediss://…` → **redeploy**.

> Skip this only for a quick test. With it unset, a single visitor could exceed `15/min`
> because each serverless instance counts separately.

---

## Part 6 — Verify end-to-end

1. **Backend:** `https://navio-backend.vercel.app/health` → `"database": true`.
2. **Website:** open the frontend URL, accept the privacy notice, **send a chat** → you get a
   reply. (A *network/CORS* error → `ALLOWED_ORIGINS` doesn't match; fix Part 4 + redeploy.)
3. **Database really connected:** sign in with an admin email (`@sportnavi.de`), **edit the
   system prompt + save**; if it persists after reload, the DB is wired. ✅

---

## Auto-deploy from here on

With Git integration, **every push to your main branch auto-deploys** both projects. Pull
requests get **preview URLs** too. (Heads-up: preview URLs are different origins, so the chat
won't pass CORS on a preview unless you add that preview URL to `ALLOWED_ORIGINS` — usually you
only test the frontend UI on previews.)

---

## Custom domain

Vercel → the **frontend** project → **Settings → Domains → Add** `chat.sportnavi.de` → add the
one DNS record it shows. SSL is automatic and free. Then add that domain to the backend's
`ALLOWED_ORIGINS` (Part 4) and redeploy the backend.

---

## Costs

- **Hobby (free):** fine to start — includes serverless function invocations + bandwidth
  within limits. Function `maxDuration` capped at 60s.
- **The real cost is still Azure OpenAI** (per reply) — watch that budget, not Vercel.
- Heavy traffic or longer function times → **Pro** ($20/mo) raises limits (300s duration, more
  invocations).

---

## The env-var cheat sheet

| Project | Variable | Notes |
|---|---|---|
| **backend** | `AZURE_AI_CHATBOT_API_KEY` 🔒 | required |
| backend | `AZURE_AI_CHATBOT_OPENAI_ENDPOINT` | required |
| backend | `AZURE_AI_CHATBOT_DEPLOYMENT_NAME` | required (`gpt-4.1`) |
| backend | `DATABASE_URL` 🔒 | **pooler** port (6543/6432) |
| backend | `CLERK_ISSUER`, `CLERK_SECRET_KEY` 🔒, `ADMIN_EMAIL_DOMAINS` | admin login |
| backend | `ALLOWED_ORIGINS` | the frontend URL(s) |
| backend | `REDIS_URL` | Upstash — for rate limiting |
| **frontend** | `VITE_NAVIO_API` | the backend URL |
| frontend | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk `pk_…` (public) |

> **Note on the embeddable widget:** Vercel builds only the main site (`npm run build` → `dist`).
> The standalone embed (`dist-widget/navio-widget.js`) isn't served from Vercel by default — if
> you need it, serve it from Cloud Run/other hosting, or add a build step that outputs it into
> `dist`. The main chat site is unaffected.

Stuck? → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
