# Running Navio Locally

Two ways to run the whole app on your own machine — pick one:

| Way | Best for | You need |
|---|---|---|
| **A. Native** (uvicorn + npm) | coding, fastest hot-reload | Python 3.11+ **and** Node 20+ |
| **B. Docker** | "just run it on any laptop" | only **Docker Desktop** (no Python/Node) |

Both give you the live site at **http://localhost:5173** with hot-reload (edit a file → it
updates instantly). Production is separate — that's [Cloud Run](../cloud-run/README.md) or
[Vercel](../vercel/README.md).

---

## First: the two env files (needed by BOTH ways)

Secrets live in **git-ignored `.env` files**. Copy each template and fill it in.

```powershell
# backend secrets  (Azure key, database, Clerk secret)
Copy-Item backend\.env.example backend\.env

# frontend public key (the login UI key)
Copy-Item frontend\.env.example frontend\.env
```

Then open each and fill in:

**`backend/.env`** — the minimum to get a chat reply is just the three Azure values:
```ini
AZURE_AI_CHATBOT_API_KEY=...                 # required — from Azure portal → Keys and Endpoint
AZURE_AI_CHATBOT_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/openai/v1
AZURE_AI_CHATBOT_DEPLOYMENT_NAME=gpt-4.1
DATABASE_URL=                                # OPTIONAL — see "Database" below (empty = no DB)
CLERK_ISSUER=                                # OPTIONAL — only for admin prompt editing
CLERK_SECRET_KEY=                            # OPTIONAL
ADMIN_EMAIL_DOMAINS=sportnavi.de
```

**`frontend/.env`** — only the public Clerk key:
```ini
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...        # the login UI key (safe in the browser)
VITE_NAVIO_API=                               # leave EMPTY for local dev
```

> **Degrades gracefully:** with no `DATABASE_URL` the app still boots and chats (the prompt
> falls back to the on-disk file; nothing is logged). With no Clerk keys, admin editing is
> just disabled. **Only the Azure OpenAI key is strictly required to get a reply.**

---

## Way A — Native (no Docker)

Best for development — instant hot-reload on both sides. Use **two terminals**.

```powershell
# Terminal 1 — backend
cd backend
pip install -r requirements.txt
uvicorn app:app --reload                      # → http://127.0.0.1:8000
```
```powershell
# Terminal 2 — frontend
cd frontend
npm install
npm run dev                                   # → http://localhost:5173
```

Open **http://localhost:5173**. The website calls `/api/...`, and Vite **proxies** that to the
backend on port 8000 (see [vite.config.ts](../../frontend/vite.config.ts)), so the browser
stays same-origin — no CORS to worry about.

- Backend API docs: **http://127.0.0.1:8000/docs**
- Backend health: **http://127.0.0.1:8000/health**

---

## Way B — Docker (any laptop, no Python/Node)

Best when you just want it running and don't want to install Python or Node. Needs only
[Docker Desktop](https://www.docker.com/products/docker-desktop/).

After filling the two `.env` files above, from the **repo root**:

```powershell
docker compose -f docker-compose.dev.yml up
```

- **First run takes a few minutes** (it builds the backend image and installs frontend
  packages). After that it's fast.
- Open **http://localhost:5173**.
- Edit any file → it hot-reloads inside the container.
- Stop with **Ctrl+C**, or fully clean up with:
  ```powershell
  docker compose -f docker-compose.dev.yml down
  ```
- Changed `requirements.txt` or `package.json`? Rebuild:
  ```powershell
  docker compose -f docker-compose.dev.yml up --build
  ```

In Docker, the website calls the backend at `http://localhost:8000` directly, and the backend
allows that origin (set automatically in the compose file) — so it works the same as native.

---

## Database — three choices

`DATABASE_URL` in `backend/.env` decides where config + chat logs go. All three are fine
locally:

1. **None (simplest).** Leave `DATABASE_URL` empty → the app chats fine, just doesn't save the
   editable prompt or log conversations.
2. **A cloud dev DB.** Point `DATABASE_URL` at a Supabase project (pooler URL) or your Azure DB
   — exactly the same string you'd use in production. Run [backend/sql/schema.sql](../../backend/sql/schema.sql)
   once against it to create the tables.
3. **A throwaway local Postgres (fully offline).** Uncomment the `postgres` block at the bottom
   of [docker-compose.dev.yml](../../docker-compose.dev.yml), then set in `backend/.env`:
   ```ini
   DATABASE_URL=postgresql://navio:navio_local_dev@postgres:5432/navio
   ```
   The schema is created automatically on first start. *(Docker way only.)*

> Note: even with a local DB, the **Azure OpenAI key is still required** — the AI itself runs
> in the cloud, so there's no fully-offline "no accounts needed" mode.

---

## Verify it works

1. **Backend up:** http://127.0.0.1:8000/health → `{"status":"ok", ...}`. `"database": true`
   means a `DATABASE_URL` is set.
2. **Chat:** open http://localhost:5173, accept the privacy notice, send a message → you get a
   reply.
3. **(If you set a DB + Clerk)** sign in with an admin email, edit the system prompt, save —
   it should persist.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Chat says it's unavailable / 500 | The Azure key/endpoint in `backend/.env` is wrong or missing. Check `backend/.env`. |
| Port 8000 or 5173 already in use | Something else is running there. Stop it, or change the port (`uvicorn … --port 8001`; for the frontend, the Vite proxy expects 8000). |
| `pip install` fails (native) | Use Python **3.11+**; on Windows, `py -3.12 -m venv .venv` then activate it before installing. |
| `npm run dev` fails (native) | Use Node **20+**; delete `node_modules` and re-run `npm install`. |
| Docker: "port is already allocated" | Another container/app uses 8000/5173 — stop it, or run `docker compose -f docker-compose.dev.yml down` first. |
| Docker: frontend won't hot-reload | Save the file again; if it persists it's a Docker file-watch quirk — restart `docker compose … up`. |
| Login box blank | `frontend/.env` is missing `VITE_CLERK_PUBLISHABLE_KEY`. |
| `"database": false` but you set a URL | The `DATABASE_URL` value is wrong, or (cloud DB) its firewall blocks your machine. |

---

## Which should I use?

- **Editing code daily** → **Way A (native)** — the fastest feedback loop.
- **Just want to see it run, or no Python/Node installed** → **Way B (Docker)**.
- **Deploying for real** → not here — see [Cloud Run](../cloud-run/README.md) or
  [Vercel](../vercel/README.md).
