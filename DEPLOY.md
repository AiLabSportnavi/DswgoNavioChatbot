# Deploying Navio to Google Cloud Run

This is a copy-paste runbook for hosting Navio on **your own** Google Cloud Run
project. Navio has two services — a **backend** (FastAPI) and a **frontend**
(static React served by nginx) — plus three external services (**Azure OpenAI**,
a **Postgres database** — Supabase or Azure — and **Clerk** for admin login). You
will deploy both Cloud Run services into your GCP project.

> Prefer Vercel for one or both services? The backend ships a
> [backend/vercel.json](backend/vercel.json) and the frontend a
> [frontend/vercel.json](frontend/vercel.json); see the
> [backend README → Option A](backend/README.md#option-a--vercel-serverless). The two
> services are independent, so you can mix hosts (e.g. backend on Cloud Run, frontend
> on Vercel) — just set `VITE_NAVIO_API` + `ALLOWED_ORIGINS` to match.

Total time: ~30 minutes if you reuse existing resources, longer if you create your own.

---

## 0. What you need before starting

| Thing | How to get it |
|---|---|
| A **Google Cloud project** with billing enabled | https://console.cloud.google.com |
| The **`gcloud` CLI** installed and logged in | https://cloud.google.com/sdk/docs/install — then `gcloud auth login` |
| The **Azure OpenAI key + endpoint** | Reuse the existing one (ask the project owner), or create your own Azure OpenAI resource and deploy a `gpt-4.1` model |
| The **Postgres `DATABASE_URL`** | A **Supabase** project (fastest) or **Azure Database for PostgreSQL** — reuse an existing one, or create your own (see §4) |
| The **Clerk keys** (admin login) | Reuse the existing Clerk app, or create your own at https://clerk.com. You need the **publishable key** (`pk_…`, public) and the **secret key** (`sk_…`). Optional — without Clerk, admin editing falls back to a shared `ADMIN_TOKEN`. |

> **Reuse vs. your own:** the fastest path is to **reuse** the existing Azure
> OpenAI and the database — then you only stand up the two Cloud Run services.
> Creating your own copies (§4) is only needed if you want fully separate infrastructure.

Set these shell variables once (PowerShell shown; for bash use `export NAME=value`):

```powershell
$PROJECT = "my-navio-project"        # your GCP project ID
$REGION  = "europe-west3"            # Frankfurt — keep EU for sportnavi.de
gcloud config set project $PROJECT
```

---

## 1. Enable the required APIs (one time)

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com `
  artifactregistry.googleapis.com secretmanager.googleapis.com
```

---

## 2. Put the two SECRETS into Secret Manager

On Cloud Run, secrets do **not** live in a `.env` file — they live in Secret
Manager and are injected at runtime. Create them once:

```powershell
# Azure OpenAI key
"PASTE_AZURE_KEY"            | gcloud secrets create azure-ai-chatbot-api-key  --data-file=-
# Postgres connection string (use a pooler port: Supabase 6543 / Azure 6432)
"PASTE_DATABASE_URL"        | gcloud secrets create database-url              --data-file=-
# Clerk secret key (admin login). Skip this if you are not using Clerk.
"PASTE_CLERK_SECRET_KEY"     | gcloud secrets create clerk-secret-key          --data-file=-
```

To rotate a key later (new version, no redeploy of the secret name needed):

```powershell
"NEW_VALUE" | gcloud secrets versions add azure-ai-chatbot-api-key --data-file=-
```

---

## 3. Set the non-secret config

Open [backend/cloudrun.env.yaml](backend/cloudrun.env.yaml) and edit the values
for your setup. The ones you will likely change:

- `AZURE_AI_CHATBOT_OPENAI_ENDPOINT` — your Azure endpoint (if not reusing)
- `AZURE_AI_CHATBOT_DEPLOYMENT_NAME` — your model deployment name (e.g. `gpt-4.1`)
- `ALLOWED_ORIGINS` — the website(s) allowed to embed the chatbot
- `CLERK_ISSUER` — your Clerk instance URL (e.g. `https://your-app.clerk.accounts.dev`; decode it from your `pk_` key or copy from the Clerk dashboard). Leave empty to disable Clerk.
- `ADMIN_EMAIL_DOMAINS` — comma-separated email domains allowed to edit the system prompt (e.g. `sportnavi.de`)

Everything else (rate limits, token caps) can stay at the defaults. The `DATABASE_URL`
and the Clerk **secret** key are Secret Manager secrets (§2), not here. The Clerk
**publishable** key is public and lives in [frontend/.env.production](frontend/.env.production) (§7).

---

## 4. (Optional) Create your OWN database + Azure OpenAI

Skip this section if you are reusing the existing services.

**Database — pick one (both are plain Postgres, set via the same `DATABASE_URL`):**

*Option 1 — Supabase (fastest):*
1. Create a project at https://supabase.com (choose an **EU region** for `sportnavi.de`).
2. Create the tables: paste [backend/sql/schema.sql](backend/sql/schema.sql) into the
   dashboard **SQL Editor** and run it.
3. Copy the **transaction pooler** string (port `6543`) from **Connect** → the
   `database-url` Secret Manager secret (§2):
   `postgresql://postgres.<project-ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres`

*Option 2 — Azure Database for PostgreSQL:*
1. Create an **Azure Database for PostgreSQL — Flexible Server** (Burstable `B1ms`,
   an **EU region** such as Germany West Central). Enable **PgBouncer**
   (Server parameters → `pgbouncer.enabled = true`).
2. Create the tables by running [backend/sql/schema.sql](backend/sql/schema.sql) once
   (see the [backend README](backend/README.md#database-setup) for the exact command).
3. Build the connection string (PgBouncer port `6432`) -> the `database-url` Secret
   Manager secret (§2):
   `postgresql://navioadmin:<pw>@<server>.postgres.database.azure.com:6432/postgres?sslmode=require`

**Azure OpenAI:**
1. Create an Azure OpenAI resource and deploy a `gpt-4.1` model.
2. Copy the key -> Secret Manager (§2), the v1 endpoint and deployment name -> §3.

---

## 5. Deploy the BACKEND

From the **repo root**:

```powershell
gcloud run deploy navio --source ./backend --region $REGION --port 8000 `
  --no-cpu-throttling --max-instances 1 --allow-unauthenticated `
  --env-vars-file backend/cloudrun.env.yaml `
  --set-secrets "AZURE_AI_CHATBOT_API_KEY=azure-ai-chatbot-api-key:latest,DATABASE_URL=database-url:latest,CLERK_SECRET_KEY=clerk-secret-key:latest"
```

> **Not using Clerk?** Drop the `CLERK_SECRET_KEY=...` part from `--set-secrets`
> and leave `CLERK_ISSUER` empty in the env file. Admin editing then falls back to
> a shared `ADMIN_TOKEN` (set it as a secret the same way if you want one).

When it finishes, gcloud prints the **Service URL** — something like
`https://navio-XXXXXXXXXX.europe-west3.run.app`. **Copy it**; the frontend needs it.

Why these flags:
- `--no-cpu-throttling` — keeps the CPU on after the HTTP response so the
  background database conversation-logging finishes.
- `--max-instances 1` — the in-memory rate limiter works without Redis. If you
  ever raise this, you must set `REDIS_URL` to an external Redis (e.g. Upstash).
- `--allow-unauthenticated` — the chat API is public (protected by CORS + rate
  limits + optional Turnstile), not by GCP IAM.

**Verify the backend:**

```powershell
curl https://navio-XXXXXXXXXX.europe-west3.run.app/health
# -> {"status":"ok","model":"gpt-4.1", ...}
```

---

## 6. Point the FRONTEND at YOUR backend

The frontend (a static SPA) calls the backend directly at the absolute URL baked into
the bundle as `VITE_NAVIO_API` — the same on Cloud Run and Vercel. nginx no longer
proxies `/api`, so there is nothing host-specific to edit in
[frontend/nginx.conf](frontend/nginx.conf). Just set the backend Service URL from §5:

Add it to [frontend/.env.production](frontend/.env.production) (it's public — committed
alongside the Clerk publishable key; the `--source` build in §7 reads this file):

```ini
# frontend/.env.production
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here
VITE_NAVIO_API=https://navio-XXXXXXXXXX.europe-west3.run.app
```

> Deploying the frontend to **Vercel** instead? Skip this file — set `VITE_NAVIO_API`
> (and `VITE_CLERK_PUBLISHABLE_KEY`) in the project's **Environment Variables** and let
> [frontend/vercel.json](frontend/vercel.json) handle SPA routing.

---

## 7. Deploy the FRONTEND

[frontend/.env.production](frontend/.env.production) holds the two browser-safe values
baked into the bundle at build time — the Clerk **publishable** key (login UI) and
`VITE_NAVIO_API` (the backend URL, set in §6). Both are public and safe to commit:

```ini
# frontend/.env.production
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here
VITE_NAVIO_API=https://navio-XXXXXXXXXX.europe-west3.run.app
```

Then deploy from the **repo root**:

```powershell
gcloud run deploy navio-frontend --source ./frontend --region $REGION --port 8080 `
  --allow-unauthenticated
```

This builds the Vite app (reading `.env.production`) and serves the static site via nginx.
gcloud prints the frontend Service URL — that is the public website address.

> No `--build-arg` is needed: both values are read from `.env.production` during the
> build, so this plain `--source` deploy just works. A blank login box on the live site
> almost always means this file is missing or has the wrong Clerk key; chat that fails
> with a CORS/Network error usually means `VITE_NAVIO_API` is wrong or the frontend
> origin isn't in `ALLOWED_ORIGINS` (§8).

---

## 8. Lock down CORS, then verify end-to-end

1. Put the frontend's public URL (and any real domain you map to it) into
   `ALLOWED_ORIGINS` in [backend/cloudrun.env.yaml](backend/cloudrun.env.yaml).
2. Redeploy just the backend to apply it — rerun the §5 command.
3. Open the frontend Service URL in a browser, accept the privacy notice, and
   send a test message. You should get a reply.

Done. ✅

---

## Updating later

- **Change code / system prompt** → rerun the relevant `gcloud run deploy` from
  §5 (backend) or §7 (frontend).
- **Rotate a secret** → `gcloud secrets versions add ... --data-file=-` (§2), then
  redeploy the backend so it picks up `:latest`.
- **Edit the bot's system prompt without redeploying** → it's stored in the database
  and editable live in the browser: sign in on the site with a Clerk account whose
  email domain is in `ADMIN_EMAIL_DOMAINS`, then edit it on the bot's page.
- **Add a new admin** → no deploy needed if their email is already on an allowed
  domain. To allow a new domain, edit `ADMIN_EMAIL_DOMAINS` in
  [backend/cloudrun.env.yaml](backend/cloudrun.env.yaml) and redeploy the backend.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ModuleNotFoundError` on backend start | Ensure the Dockerfile copies all modules: `COPY *.py ./` (already fixed). |
| Chat works locally but not in browser, CORS error | The frontend origin isn't in `ALLOWED_ORIGINS`. Add it (§8) and redeploy backend. |
| Replies time out / logs missing | You raised `--max-instances` above 1 without setting `REDIS_URL`, or removed `--no-cpu-throttling`. |
| Chat fails with a CORS / Network error | `VITE_NAVIO_API` (§6) points at the wrong backend, or the frontend origin isn't in `ALLOWED_ORIGINS` (§8). Fix and redeploy. |
| Backend 500 on every chat | The Azure secret/endpoint is wrong, or the database tables don't exist (run `sql/schema.sql`, §4). |
| Login box is blank on the live site | `frontend/.env.production` is missing or has the wrong `VITE_CLERK_PUBLISHABLE_KEY` (§7). Fix it and redeploy the frontend. |
| Admin save returns `401` | Not signed in, or the Clerk token is invalid. Sign in again. If it persists, `CLERK_ISSUER` (env) doesn't match the Clerk app that issued the `pk_`/`sk_` keys. |
| Admin save returns `403` | Signed in, but the account's verified email domain isn't in `ADMIN_EMAIL_DOMAINS`. Add it (§3) and redeploy the backend. |
| Admin save returns `500`/`502` Clerk | `CLERK_SECRET_KEY` secret is missing or wrong (§2/§5) — the backend can't look up the user's email. |
