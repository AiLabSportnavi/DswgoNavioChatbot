# Deploying Navio to Google Cloud Run — Complete Guide

A **step-by-step, no-jargon** guide to putting Navio live on Google Cloud Run. Written so
you can follow it even if you've never used Google Cloud. If you just want the quick
command, jump to [The fast path](#the-fast-path). If something breaks, see
[TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## What you're deploying (the 1-minute picture)

Navio is **three independent pieces**:

```
   Visitor's browser
        │  opens the website
        ▼
  navio-frontend  (Cloud Run)  ── the website (static React site)
        │  the site calls the API directly
        ▼
  navio  (Cloud Run)  ── the backend (FastAPI)
        │
        ├──▶  Database  (Azure Postgres OR Supabase)  ── saves the editable prompt + chat log
        └──▶  Azure OpenAI (gpt-4.1)                   ── writes the replies
```

- **`navio`** = the backend (the brain). Holds all the secrets. Never shipped to the browser.
- **`navio-frontend`** = the website. Only public values. Calls the backend over the internet.
- **Database + Azure OpenAI** = outside services the backend talks to.

**The golden rule:** secret keys (Azure key, database password, Clerk `sk_…`) live **only**
on the backend. The website only gets public values (Clerk `pk_…`, the backend URL).

**Deploy order is always:** Database → Backend → Frontend → open CORS. The `deploy.ps1`
script does the last three automatically and in the right order.

This project's specifics:

| Thing | Value |
|---|---|
| Google Cloud project | `navio-sportnavi-prod` |
| Region | `europe-west3` (Frankfurt) |
| Backend service | `navio` |
| Frontend service | `navio-frontend` |
| Database (current) | Azure — `navio-pg-001.postgres.database.azure.com` |
| Live website | https://navio-frontend-309602963301.europe-west3.run.app |
| Live backend | https://navio-309602963301.europe-west3.run.app |

---

## The fast path

Once the one-time setup is done and `deploy.env` is filled in:

```powershell
./deploy.ps1
```

That single command syncs your secrets, deploys both services, wires the website to the
backend, opens CORS, and prints the live URLs. Re-run it any time you change code — it
updates the **same** services at the **same** URLs (a new version, with the old one kept
for rollback). See [Updating later](#updating-later).

---

## One-time setup (first time only)

### Step 1 — Tools you need

| Tool | Why | Get it |
|---|---|---|
| A **Google account** | owns the project | you already have one |
| The **`gcloud` CLI** | runs the deploy | https://cloud.google.com/sdk/docs/install (Windows installer) — *or* use **Cloud Shell** (the `>_` icon in the Google Cloud console; nothing to install) |
| The **project code** on your PC | the thing being deployed | already cloned to this folder |

Check gcloud is installed:
```powershell
gcloud version
```

### Step 2 — Create or pick the Google Cloud project

If the project already exists (`navio-sportnavi-prod`), skip to Step 3. To create a new one:
1. Go to https://console.cloud.google.com → top bar **project dropdown → New Project**.
2. Give it a name, note the **Project ID** (e.g. `navio-sportnavi-prod`), click **Create**.

### Step 3 — Turn on billing (required, even for the free tier)

Cloud Run is almost free for a small app, but Google requires a payment method on file.
1. Console → **☰ menu → Billing**.
2. If you have no billing account: **Create account** → choose country (Germany) → add a
   card. New accounts usually get **€300 free credit for 90 days**.
3. **Link it to the project:** Billing → **Account management** → your project → **⋮ → Change
   billing** → pick your account → **Set account**.
4. ✅ The Billing page should show **"Billing is enabled"** for `navio-sportnavi-prod`.

> **About credits:** check **Billing → Credits** to see what's left. Note that some credits
> are *scoped* (e.g. a "GenAI App Builder" credit only covers Vertex AI products, **not**
> Cloud Run). Cloud Run itself costs only a few cents/month — see [Costs](#costs--monitoring).

### Step 4 — Set a spending limit (budget alert)

1. Billing → **Budgets & alerts → Create budget**.
2. **Scope:** this project. **Amount:** e.g. **€10/month**.
3. **Thresholds:** keep 50% / 90% / 100% (add 120% if you like). You get an **email** at each.
4. **Finish.**

> ⚠️ **Important:** a Google budget is an **email alert, not a hard stop** — at 100% it
> emails you, it does **not** switch anything off. Your real cost guardrail is
> `--max-instances 1` (already set in the deploy), which caps how much Cloud Run can scale.

### Step 5 — Log gcloud into the project

```powershell
gcloud auth login                              # opens a browser, sign in
gcloud config set project navio-sportnavi-prod
```

That's the one-time setup. The deploy script enables the required APIs for you on first run.

---

## Getting your credentials (what goes into `deploy.env`)

You need **3 secret values**. Here's exactly where each comes from. **Never paste these into
chat or email — only into your `deploy.env` file (which is git-ignored).**

### A. Azure OpenAI key

- **Where:** [Azure Portal](https://portal.azure.com) → your **Azure OpenAI** resource →
  **Keys and Endpoint**.
- Copy **KEY 1** → this is `AZURE_AI_CHATBOT_API_KEY`.
- The **endpoint** and **model name** (`gpt-4.1`) are *not* secret and already live in
  [`backend/cloudrun.env.yaml`](../../backend/cloudrun.env.yaml) — no need to touch them.

### B. The database — pick ONE (both are plain Postgres)

#### Option 1 — Azure Database for PostgreSQL *(what this project uses)*

- **Where:** Azure Portal → **`navio-pg-001`** (the PostgreSQL server).
- Build the `DATABASE_URL` (the password is the one set when the DB was created):
  ```
  postgresql://navioadmin:YOUR_DB_PASSWORD@navio-pg-001.postgres.database.azure.com:5432/postgres?sslmode=require
  ```
- 🔥 **Critical one-time step — open the firewall** so Cloud Run can reach it:
  Azure Portal → `navio-pg-001` → **Settings → Networking** → under **Firewall rules** add
  **Start IP `0.0.0.0`, End IP `255.255.255.255`** → **Save**. (Cloud Run's IPs are dynamic
  and are *Google* IPs, so the "Allow Azure services" toggle does **not** cover them. The DB
  stays safe behind the password + SSL.)

#### Option 2 — Supabase

- **Where:** [supabase.com](https://supabase.com) → your project → **Connect** →
  **Session pooler** (port `5432`). Copy that string — **not** the `db.<ref>.supabase.co`
  *direct* one (Cloud Run can't reach that):
  ```
  postgresql://postgres.<project-ref>:YOUR_PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres
  ```
- Forgot the password? Supabase → **Project Settings → Database → Reset database password**.
- **Create the tables once** (new projects are empty): Supabase → **SQL Editor** → paste the
  contents of [`backend/sql/schema.sql`](../../backend/sql/schema.sql) → **Run**.

> To **switch** databases later (Azure ⇄ Supabase), just change the one `DATABASE_URL` line
> in `deploy.env` and re-run `./deploy.ps1`. No code changes — both are plain Postgres.

### C. Clerk (admin login for editing the bot's prompt)

- **Where:** [Clerk dashboard](https://dashboard.clerk.com) → **API Keys**.
- **Secret key** (`sk_…`) → `CLERK_SECRET_KEY` (goes in `deploy.env`).
- **Publishable key** (`pk_…`) → optional `VITE_CLERK_PUBLISHABLE_KEY` (public; leave blank to
  keep the one already in [`frontend/.env.production`](../../frontend/.env.production)).
- The **Clerk issuer URL** and allowed admin email domains are already set in
  [`backend/cloudrun.env.yaml`](../../backend/cloudrun.env.yaml).

---

## Fill in `deploy.env`

1. Make your private copy:
   ```powershell
   Copy-Item deploy.env.example deploy.env
   ```
2. Open **`deploy.env`** in your editor (VS Code) and fill in the **3 secrets**. Everything
   else (project, region, service names) is pre-filled.

| Line | Paste | From |
|---|---|---|
| `AZURE_AI_CHATBOT_API_KEY=` | Azure key | §A above |
| `DATABASE_URL=` | the Postgres connection string | §B above |
| `CLERK_SECRET_KEY=` | Clerk `sk_…` | §C above |
| `VITE_CLERK_PUBLISHABLE_KEY=` | *(optional)* Clerk `pk_…` | leave blank to keep current |

> `deploy.env` is **git-ignored** — it will never be committed. Confirm with:
> `git check-ignore deploy.env` → should print `deploy.env`.

**Want to control the service names / URLs?** Set `BACKEND_SERVICE` / `FRONTEND_SERVICE` in
`deploy.env` (lowercase letters/numbers/hyphens, start with a letter). Changing a name makes
a **new** service with a **new** URL; the old one stays until you delete it.

---

## Deploy

From the repo root, in **PowerShell**:

```powershell
./deploy.ps1
```
*(If Windows blocks it: `powershell -ExecutionPolicy Bypass -File .\deploy.ps1`)*

**What it does, in order (safe to re-run any time):**
1. Points gcloud at your project + enables the required APIs.
2. Puts your 3 secrets into **Secret Manager** (byte-exact — no trailing-newline corruption)
   **and grants Cloud Run permission to read each one** (so a fresh deploy doesn't fail on it).
3. Deploys the **backend** and reads back its URL.
4. Builds the **frontend** image in Cloud Build with that URL **baked in via a build-arg**,
   then deploys it (this avoids the relative-URL / 405 trap entirely).
5. **Opens CORS** — adds the website URL (both Cloud Run URL formats) to `ALLOWED_ORIGINS`.
6. Prints the live **Website / Backend / Health** links.

**What you'll see:** each "Deploying…" step sits quietly for **2–4 minutes** while Google
builds the container in the cloud — that's normal, don't cancel it. The yellow *"quota
project"* and *"environment tag"* warnings are harmless nags — ignore them.

> 💡 Close `deploy.ps1` in your editor before running, so the editor can't save an old copy
> back over the file mid-edit.

---

## Verify it works

1. **Backend health:**
   ```
   https://navio-309602963301.europe-west3.run.app/health
   ```
   → should show `{"status":"ok", ... "database":true, ...}`.

2. **The site:** open the **Website** URL, accept the privacy notice, send a chat → you get a
   reply. (A *network/CORS* error means the website origin isn't in `ALLOWED_ORIGINS` — see
   [TROUBLESHOOTING.md](TROUBLESHOOTING.md).)

3. **The database is *really* connected** (not just configured): `"database":true` only means
   a `DATABASE_URL` is *set*. To prove it actually connects, **sign in** with an admin email
   (`@sportnavi.de`), **edit the system prompt, save**, and reload — if the change sticks, the
   database works. ✅

---

## Updating later

Change code, the prompt, or a value in `deploy.env`, then just:
```powershell
./deploy.ps1
```
- Same service names → **same URLs** (nothing to re-share).
- Each run is a **new version**; Cloud Run keeps the old ones, so you can **roll back**:
  ```powershell
  gcloud run services list --region europe-west3                      # see services
  gcloud run revisions list --service navio --region europe-west3     # see versions
  gcloud run services update-traffic navio --region europe-west3 --to-revisions REVISION=100
  ```
- **Switch database:** change `DATABASE_URL` in `deploy.env` → re-run. (If it's a brand-new
  DB, grant Secret Manager access — see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) → "Permission
  denied on secret".)

---

## Costs & monitoring

- **Cloud Run** for a low-traffic chatbot: typically **cents to ~€1/month** (often €0 while
  free credit lasts). `--max-instances 1` keeps it from scaling up and running a bill.
- **The real cost is Azure OpenAI** — you pay per chat reply there. Your rate limits
  (`15/min`, `300/day` per visitor) cap it, but set a budget on the **Azure** side too
  (Azure Portal → **Cost Management → Budgets**).
- **See your Google spend:** Billing → **Reports** → turn on **Forecasted cost** for a
  month-end estimate. Billing → **Credits** for remaining free credit.

---

## Security notes

- **Secrets live only on the backend** (Secret Manager). The website only ever gets public
  values. Never put a secret in `frontend/`.
- **`deploy.env` is git-ignored** — keep it that way; never commit it.
- **If a secret is ever exposed** (pasted in chat, committed, screenshared), **rotate it**:
  reset the DB password in Supabase/Azure, regenerate the Azure/Clerk key, then re-run
  `./deploy.ps1`. Rotating instantly makes the old value useless.
- **The Azure DB firewall** is currently open to all IPs (protected by password + SSL). For
  tighter security later, give Cloud Run a **static egress IP** (VPC connector + Cloud NAT)
  and allow only that one IP.

---

## Custom domain (optional)

To put the site on e.g. `chat.sportnavi.de`:
- **Simplest, free:** `gcloud beta run domain-mappings create --service navio-frontend
  --domain chat.sportnavi.de --region europe-west3` → add the DNS record it prints → Google
  auto-issues HTTPS. (First verify domain ownership in Google Search Console.)
- **Or** host the frontend on **Vercel** (custom domains there are 2 clicks + auto-SSL, free)
  and keep the backend on Cloud Run.
- **Production scale / global IP / WAF:** an external HTTPS Load Balancer (~€18/month).

---

## Quick reference card

```
Deploy / update ........ ./deploy.ps1
Health check ........... curl https://navio-309602963301.europe-west3.run.app/health
List services .......... gcloud run services list --region europe-west3
View backend logs ...... gcloud run services logs read navio --region europe-west3 --limit 50
Update one setting ..... gcloud run services update navio --region europe-west3 --update-env-vars KEY=value
See spend .............. Billing → Reports (Forecasted cost)
See free credit ........ Billing → Credits
```

Stuck? → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
