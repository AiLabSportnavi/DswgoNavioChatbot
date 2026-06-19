# Vercel Deploy — Troubleshooting

Common problems running Navio on Vercel, with fixes. For the full guide, see
[README.md](README.md).

> **How to read errors:** Vercel → your **backend** project → **Logs** (runtime) or a failed
> **Deployment → Building** log. The real error is almost always there.

---

## Quick lookup

| What you see | Cause | Fix |
|---|---|---|
| Chat fails after a few seconds / **504** | Function timed out | [Jump](#504--function-timeout) |
| Backend **500** on first call; logs show `SYSTEM_PROMPT.md` / `FileNotFoundError` | `prompts/` not bundled | [Jump](#500--prompt-file-not-found) |
| Backend **500**; logs show `KeyError: 'AZURE_AI_CHATBOT_API_KEY'` | Required env var missing | [Jump](#500--missing-required-env-var) |
| Chat shows a **CORS / network error** | Frontend origin not allowed | [Jump](#cors--network-error) |
| **Blank login box** | Frontend Clerk key missing | [Jump](#blank-login-box) |
| **404** when refreshing a page / on a route | SPA routing / wrong root dir | [Jump](#404-on-routes) |
| Backend build **fails** | Python deps / wrong root dir | [Jump](#backend-build-fails) |
| DB: `too many connections` / timeouts | Not using a pooler | [Jump](#database-connection-errors) |
| Rate limit doesn't hold | No shared Redis | [Jump](#rate-limit-not-enforced) |
| Changed an env var, nothing changed | Needs a redeploy | [Jump](#env-var-change-not-applied) |

---

## 504 / function timeout

A chat starts but errors after several seconds.

**Why:** the `gpt-4.1` reply took longer than the function's max run time.

**Fix:** [`backend/vercel.json`](../../backend/vercel.json) already sets `maxDuration: 60`.
If it still cuts off:
- You may be on a plan whose ceiling is lower than 60s → **upgrade to Pro** (300s), or
- Lower `MAX_TOKENS` (e.g. `500`) in the backend env vars to make replies shorter/faster, and
- Pick a function **region** near your Azure OpenAI resource (Settings → Functions).

---

## 500 / prompt file not found

The backend 500s on the first request; logs mention `prompts/SYSTEM_PROMPT.md` or
`FileNotFoundError`.

**Why:** `app.py` reads `prompts/SYSTEM_PROMPT.md` at startup, and serverless bundles only
include files they're told to.

**Fix:** [`backend/vercel.json`](../../backend/vercel.json) already declares
`"includeFiles": "prompts/**"`. If it still fails, confirm the **Root Directory is `backend`**
(so `vercel.json` and `prompts/` are at the project root), then redeploy.

---

## 500 / missing required env var

Logs show `KeyError: 'AZURE_AI_CHATBOT_API_KEY'` (or the endpoint/deployment name).

**Why:** `app.py` reads the three Azure values at import — without them the function crashes
on cold start.

**Fix:** in the **backend** project → Settings → Environment Variables, set
`AZURE_AI_CHATBOT_API_KEY`, `AZURE_AI_CHATBOT_OPENAI_ENDPOINT`,
`AZURE_AI_CHATBOT_DEPLOYMENT_NAME` → **redeploy**.

---

## CORS / network error

The site loads but sending a chat fails with a CORS/network error in the browser console.

**Why:** the backend only answers origins in `ALLOWED_ORIGINS`, and your frontend URL isn't
listed.

**Fix:** backend project → env var `ALLOWED_ORIGINS=https://navio-frontend.vercel.app` (plus
any custom domain, comma-separated) → **redeploy the backend**. A `405` instead of a CORS
error means the frontend is calling itself — check `VITE_NAVIO_API` is set to the **backend**
URL in the frontend project.

---

## Blank login box

The site loads but the sign-in box is empty.

**Why:** the Clerk **publishable** key wasn't baked into the frontend build.

**Fix:** **frontend** project → env var `VITE_CLERK_PUBLISHABLE_KEY=pk_…` → **redeploy** (it's a
build-time value, so it needs a fresh build). For a production Clerk instance use `pk_live_…`
and add your Vercel domain in the Clerk dashboard.

---

## 404 on routes

Refreshing a non-home page, or visiting a deep link, returns 404.

**Why:** SPA routes are client-side; the server must fall back to `index.html`.

**Fix:** [`frontend/vercel.json`](../../frontend/vercel.json) already rewrites everything to
`/index.html`. If you still get 404s, confirm the **Root Directory is `frontend`** and the
framework preset is **Vite**.

---

## Backend build fails

The backend deployment fails during build.

**Common causes:**
- **Wrong Root Directory** — it must be `backend` (so Vercel sees `requirements.txt` + `api/`).
- **Python deps** — check the build log; `requirements.txt` must install cleanly. `psycopg[binary]`
  ships prebuilt wheels, so it should. If a package needs a newer Python, set the project's
  Python version (Settings) — the app needs **3.11+** (Vercel defaults to 3.12, which is fine).

---

## Database connection errors

Logs show `too many connections`, connection timeouts, or `prepared statement does not exist`.

**Fix:**
- Use a **pooler** `DATABASE_URL` — Supabase **transaction pooler `6543`**, or Azure
  **PgBouncer `6432`**. Serverless opens many connections; the pooler is essential.
- **Azure DB only:** open its firewall to Vercel — Azure Portal → your server → Networking →
  allow `0.0.0.0`–`255.255.255.255` (Vercel IPs are dynamic). The password + SSL still protect it.
- `prepared statement` errors mean you're on a transaction pooler without the app's fix — this
  repo's `db.py` already disables prepared statements, so just redeploy with the latest code.

---

## Rate limit not enforced

A single visitor can exceed `15/min`.

**Why:** serverless invocations are isolated, so in-memory counters don't add up.

**Fix:** set `REDIS_URL` to a free **Upstash** Redis (`rediss://…`) in the backend project →
redeploy. See [README.md → Part 5](README.md#part-5--rate-limiting-with-upstash-redis-recommended).

---

## Env var change not applied

You changed an environment variable but the app behaves the same.

**Why:** Vercel bakes env vars at **deploy/build** time. A change only takes effect on the next
deployment — and `VITE_*` (frontend) values are baked into the **build**, so the frontend must
**rebuild**.

**Fix:** the project → **Deployments → ⋯ → Redeploy** after changing env vars.

---

## Note: this setup is configured but verify on your account

The repo's `vercel.json` files handle the known serverless gotchas (timeout, file bundling, SPA
routing), but a Vercel deploy runs on **your** account — so do the **Part 6** end-to-end check
after the first deploy, and read the **Logs** tab if anything 500s. The error there tells you
exactly which env var or file is the problem.
