# Navio — Frontend

The **React + Vite + TypeScript** single-page app for Navio: the Sportnavi landing /
hub, the chatbot pages, the admin prompt editor, and an **embeddable chat widget** that
can be dropped onto any website.

It is a **pure static frontend** — it ships no secrets and talks to the
[backend](../backend/README.md) only over HTTP (`/api/...`). It can be **hosted on its
own** (Vercel, any static host, or nginx) independently of the backend.

---

## How it talks to the backend

The app calls the backend's `POST /api/chat`, `GET /api/config`, etc. ([src/lib/api.ts](src/lib/api.ts)).
The base URL is resolved in this order:

| Mode | How `/api` reaches the backend |
|---|---|
| **Local dev** | Vite dev server **proxies** `/api` and `/health` → `http://127.0.0.1:8000` ([vite.config.ts](vite.config.ts)). Calls stay relative, so no CORS. |
| **Production (direct)** | Set `VITE_NAVIO_API` to the backend origin (e.g. `https://api.navio.de`). The browser calls it directly — the backend must allow the frontend's domain in `ALLOWED_ORIGINS`. |
| **Production (reverse proxy)** | Serve behind nginx ([nginx.conf](nginx.conf)) that proxies `/api` → backend. Same-origin, so no CORS and `VITE_NAVIO_API` stays empty. |
| **Embedded widget** | The widget sets the backend URL at runtime via `setApiBase()` — see [Embeddable widget](#embeddable-widget). |

---

## Folder layout

```
frontend/
├── index.html               SPA entry HTML
├── src/
│   ├── main.tsx             app bootstrap (mounts <App/>, Clerk provider)
│   ├── App.tsx              top-level routes
│   ├── pages/               route screens (Landing, Hub, BotDetail)
│   ├── components/          UI components (chat, widget, navbar, editor, …)
│   ├── lib/                 api.ts (backend client) + router.ts
│   ├── data/                bots.ts (bot catalog/config)
│   ├── embed/               widget.tsx — the standalone embeddable build entry
│   ├── assets/              images (hero, logos)
│   └── index.css            Tailwind entry + global styles
├── public/                  static files served as-is (favicon, icons.svg)
├── vite.config.ts           main SPA build + dev proxy
├── vite.config.widget.ts    separate build for the embeddable widget
├── nginx.conf               static server + /api reverse proxy (container/Cloud Run)
├── Dockerfile               builds the SPA into an nginx image
├── .env.production          committed — holds ONLY the public Clerk publishable key
└── .env                     local env (git-ignored) — never commit
```

---

## Requirements

| Tool | Version |
|---|---|
| [Node.js](https://nodejs.org) | 20+ |

---

## Run locally

```bash
cd frontend
cp .env.example .env          # fill in the Clerk publishable key
npm install
npm run dev                   # → http://localhost:5173
```

> For chat to work locally, run the backend too (`uvicorn app:app` on port 8000) — Vite
> proxies `/api` to it. See the [backend README](../backend/README.md#run-locally).

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload. |
| `npm run build` | Type-check (`tsc -b`) + production SPA build → `dist/`. |
| `npm run build:widget` | Build the standalone embeddable widget → `dist-widget/`. |
| `npm run preview` | Serve the production `dist/` locally to sanity-check a build. |
| `npm run lint` | ESLint over the project. |

---

## Environment variables

Only **public** values belong here — anything with the `VITE_` prefix is inlined into the
browser bundle. **Never** put a secret (Clerk `sk_…`, the Azure key, `DATABASE_URL`) here;
those live on the [backend](../backend/README.md#environment-variables).

| Variable | Required | Meaning |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key (`pk_…`) for the login UI. Public by design. |
| `VITE_NAVIO_API` | ➖ | Backend origin in production (e.g. `https://api.navio.de`). Leave **empty** in dev or when serving behind the nginx `/api` proxy. Also where the Navio Plus contact form posts (`/api/contact`). |

> `.env.production` (committed) holds the **public** Clerk key so cloud builds are
> reproducible. `.env` (git-ignored) is for local overrides.

---

## Hosting the frontend (on its own)

The build output is **static files** — host it anywhere that serves static assets. The
only decision is **how `/api` reaches the backend** (see the table at the top).

### Option A — Vercel (planned target)

1. **Project settings:** Framework = *Vite*, build = `npm run build`, output = `dist`.
2. **Env var:** set `VITE_CLERK_PUBLISHABLE_KEY`, and `VITE_NAVIO_API` = your backend URL.
3. **CORS:** add the Vercel domain to the backend's `ALLOWED_ORIGINS` so the browser may
   call it. *(Alternatively, add a `vercel.json` rewrite of `/api/*` → backend to stay
   same-origin and skip CORS.)*

### Option B — Any static host (Netlify, S3+CloudFront, GitHub Pages, …)

```bash
npm run build      # → dist/
```
Upload `dist/`. Set `VITE_NAVIO_API` at build time and allow the host's domain in the
backend `ALLOWED_ORIGINS`. Configure an **SPA fallback** (all routes → `index.html`) so
client-side routing works.

### Option C — Docker / nginx (container hosts, Cloud Run)

The included [Dockerfile](Dockerfile) builds the SPA into an nginx image that also
reverse-proxies `/api` to the backend (no CORS needed). The backend URL is set in
[nginx.conf](nginx.conf) — update the `proxy_pass`/`Host` lines to your backend before
building. Full Cloud Run runbook: [DEPLOY.md](../DEPLOY.md).

```bash
docker build -t navio-frontend frontend
docker run -p 8080:8080 navio-frontend
```

---

## Embeddable widget

Besides the full site, the app builds a standalone **chat widget** that any external
website can embed with one script tag — it mounts a floating chat bubble and points
itself at the backend at runtime.

```bash
npm run build:widget         # → dist-widget/navio-widget.js
```

Host `navio-widget.js` (e.g. on the same static host) and embed it. The in-app
[CopyEmbed](src/components/CopyEmbed.tsx) component shows the exact snippet, and
[widget-test.html](widget-test.html) is a local harness to try it. The widget calls
`setApiBase()` so the embedding site doesn't need to be same-origin with the backend
(ensure that origin is in the backend `ALLOWED_ORIGINS`).

---

## Admin prompt editor (Clerk)

Signed-in users whose **verified email domain** is on the backend's `ADMIN_EMAIL_DOMAINS`
allowlist can edit Navio's system prompt live from the bot page
([ConfigEditor](src/components/ConfigEditor.tsx)). The browser sends the Clerk session
JWT to the backend, which verifies it. Full flow: [project README](../README.md#admin-login-clerk).
