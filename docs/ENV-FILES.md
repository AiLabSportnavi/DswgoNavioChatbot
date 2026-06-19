# Env files, explained (no more confusion)

Navio has a few environment files. They look similar but each has **one** job. Here's the
whole map — and which ones *you* touch for each task.

## The rule that makes it simple

- **`*.example`** = a **template**, committed to git, **no real secrets** — you copy it and
  fill it in.
- **`.env` / `deploy.env`** = your **filled-in copy**, **git-ignored**, holds **real secrets** —
  never committed, never pasted in chat.
- **`cloudrun.env.yaml` / `.env.production`** = **committed**, but they only hold **non-secret**
  / public values (URLs, the public Clerk key).

## Every env file

| File | Committed? | Who reads it | What's in it |
|---|---|---|---|
| `backend/.env.example` | ✅ template | you (copy it) | the template for `backend/.env` |
| **`backend/.env`** | 🔒 ignored | the backend (`uvicorn`) **locally** | backend secrets for **local dev** |
| `backend/cloudrun.env.yaml` | ✅ committed | Cloud Run deploy | backend **non-secret** config (Azure endpoint, model, Clerk issuer, admin domains, Salesforce URLs) |
| `frontend/.env.example` | ✅ template | you (copy it) | the template for `frontend/.env` |
| **`frontend/.env`** | 🔒 ignored | the frontend (Vite) **locally** | the public Clerk key for **local dev** |
| `frontend/.env.production` | ✅ committed | the frontend **build** | public values baked into the site (Clerk `pk_…`, backend URL) |
| `deploy.env.example` | ✅ template | you (copy it) | the template for `deploy.env` |
| **`deploy.env`** | 🔒 ignored | `deploy.ps1` (Cloud Run) | secrets **+** GCP project/region for the **Cloud Run deploy** |

> **Why are there two secret files (`backend/.env` and `deploy.env`)?** They hold the *same*
> secret values but for two different jobs: `backend/.env` runs the app **on your laptop**;
> `deploy.env` pushes those secrets to **Google Secret Manager** when you deploy. Local vs.
> cloud — that's the only reason.

## Which files do I touch for each task?

| I want to… | Edit these | Ignore the rest |
|---|---|---|
| **Run locally** | `backend/.env` + `frontend/.env` | — |
| **Deploy to Cloud Run** (`./deploy.ps1`) | `deploy.env` (secrets+project) and, for non-secret tweaks, `backend/cloudrun.env.yaml` | — |
| **Deploy to Vercel** | *none* — you paste the values into the Vercel **dashboard** | all `.env` files |

So: **3 files total** ever need *your* secrets — `backend/.env` (local), `deploy.env` (Cloud
Run), and the Vercel dashboard (Vercel). Everything else is templates or public config.

## ⚠️ One file to delete

There's a leftover **root `.env`** (git-ignored) from the old `docker-compose` setup —
**nothing reads it anymore**. Delete it to remove the confusion:
```powershell
Remove-Item .env
```
(The backend's env now lives in `backend/.env`, not the root.)

---

## Bonus: where the Salesforce contact form is configured

The "Navio Plus / Kontakt" form (→ Salesforce **CaseHandler** flow) has three parts:

| Part | File(s) |
|---|---|
| **The form UI** (fields + dropdowns) | `frontend/src/components/KontaktForm.tsx` + `frontend/src/data/salesforceOptions.ts` |
| **The backend handler** | `backend/app.py` → `POST /api/contact` → `backend/salesforce.py` |
| **Secrets** (client id/secret) | `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET` → in `backend/.env` (local) / Vercel env / a Cloud Run secret |
| **Non-secret config** (URLs, API version, flow name, fallback email) | `backend/cloudrun.env.yaml` (and `backend/.env.example`): `SALESFORCE_TOKEN_URL`, `SALESFORCE_INSTANCE_URL`, `SALESFORCE_API_VERSION`, `SALESFORCE_FLOW_API_NAME`, `CONTACT_FALLBACK_EMAIL` |

It's **optional**: with `SALESFORCE_CLIENT_ID`/`_SECRET` unset, `/api/contact` runs in a safe
"simulate" mode (logs + returns success) so the form stays demoable. On a real failure it
emails the request to `CONTACT_FALLBACK_EMAIL` so nothing is lost.

> **Deploying it:** `deploy.ps1` now pushes the Salesforce secrets **automatically** when
> `SALESFORCE_CLIENT_ID` + `SALESFORCE_CLIENT_SECRET` are present in `deploy.env` (otherwise the
> form stays in simulate mode). On **Vercel**, add the same two values as env vars in the
> backend project. Check `/health` → `"salesforce": true` means it's connected.
