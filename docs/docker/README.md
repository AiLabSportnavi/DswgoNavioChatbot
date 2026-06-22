# Deploy Navio with plain Docker (any host)

Run Navio on **any server that has Docker** — a VPS, Render, Railway, Fly.io, a
company VM, etc. This is the host-agnostic path: the same two images Cloud Run
builds, run wherever you like.

Navio is **two independent images**:

| Image | Folder | What it is | Port |
|---|---|---|---|
| **backend** | `backend/` | FastAPI (the bot + DB + admin) | 8000 |
| **frontend** | `frontend/` | static website + widget (nginx) | 8080 |

They're independent — you can run **both**, or just one (e.g. backend on a VM,
frontend on Vercel). Each reads **only its own** settings.

> This is the **production** Docker guide. For local development with hot-reload,
> use [docker-compose.dev.yml](../../docker-compose.dev.yml) instead — see
> [docs/local/README.md](../local/README.md).

---

## 0. Fill in the two env files first

The whole point of the template: **one file per part.**

```powershell
Copy-Item backend\.env.example  backend\.env      # backend secrets + config
Copy-Item frontend\.env.example frontend\.env.production   # frontend public values
```

- **`backend/.env`** — Azure key, `DATABASE_URL` (Supabase pooler), Clerk secret,
  `ALLOWED_ORIGINS` (set this to your frontend's public URL), etc. All server-side.
- **`frontend/.env.production`** — the Clerk **publishable** key + `VITE_NAVIO_API`
  (your backend's public URL). Public-safe — these get baked into the website.

See [docs/ENV-FILES.md](../ENV-FILES.md) for the full map of which value goes where.

---

## 1. Backend image

From the **repo root**:

```bash
# Build (same Dockerfile Cloud Run uses):
docker build -t navio-backend ./backend

# Run — secrets are passed at runtime from backend/.env, never baked into the image:
docker run -d --name navio-backend -p 8000:8000 --env-file backend/.env navio-backend
```

Verify:
```bash
curl http://localhost:8000/health
# -> {"status":"ok","model":"gpt-4.1","database":true, ...}
```

Notes:
- The image holds **no secrets** — `--env-file backend/.env` injects them at start.
  Keep `backend/.env` on the server, readable only by the deploy user.
- The container already runs `uvicorn ... --forwarded-allow-ips "*"` so rate-limiting
  sees the real client IP behind your reverse proxy / load balancer.
- Put your real frontend URL in `ALLOWED_ORIGINS` (in `backend/.env`) or the browser
  will be blocked by CORS.

---

## 2. Frontend image

The frontend bakes the backend URL into the bundle **at build time**, so pass it as
a build-arg (or set `VITE_NAVIO_API` in `frontend/.env.production`):

```bash
docker build -t navio-frontend \
  --build-arg VITE_NAVIO_API=https://your-backend-url ./frontend

docker run -d --name navio-frontend -p 8080:8080 navio-frontend
```

Open <http://localhost:8080> — the website, and the embeddable widget at
`http://localhost:8080/navio-widget.js`.

> The Clerk **publishable** key is read from `frontend/.env.production` during the
> build. It's public and safe to bake in. (Never put a secret here — see the warning
> in [frontend/.env.example](../../frontend/.env.example).)

---

## 3. Putting it on a real host

The two images run the same on any Docker host. Typical setup:

1. Push the images to a registry (Docker Hub, GHCR, your host's registry) **or** let
   the host build from this repo (Render/Railway can build a Dockerfile directly —
   point them at `backend/` and `frontend/` as separate services).
2. Set env on the host:
   - Backend service → upload `backend/.env` or set the same keys as the host's
     "environment variables".
   - Frontend service → set the `VITE_NAVIO_API` build-arg / env to the backend's URL.
3. Put the backend behind HTTPS (most hosts do this automatically). Set
   `ALLOWED_ORIGINS` (backend) to the frontend's HTTPS URL.

> **Database reminder:** use a **pooler** `DATABASE_URL` (Supabase transaction pooler
> `:6543`), not the direct `db.<ref>.supabase.co` host — that one is IPv6-only and most
> serverless/container hosts can't reach it. Run [backend/sql/schema.sql](../../backend/sql/schema.sql)
> once against your database to create the tables.

---

## 4. Scaling past one container

The in-memory rate limiter only works for a **single** backend container. If you run
more than one, set `REDIS_URL` (e.g. Upstash) in `backend/.env` so the per-IP limits
are shared across containers. One container needs nothing extra.

---

## Which env file does each piece use?

| You deploy… | You fill in… | You can ignore… |
|---|---|---|
| **Backend only** | `backend/.env` | `frontend/.env.production` |
| **Frontend only** | `frontend/.env.production` (+ build-arg) | `backend/.env` |
| **Both** | both files | — |

That's the separation: each part only needs its own file.
