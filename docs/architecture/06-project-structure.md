# 06 · Project Structure

> **Audience:** Developers. Where every kind of file belongs and why — folders,
> documentation, configuration, environment files, assets, and tests.
> **Last reviewed:** 2026-06-18 · **Owner:** AI Lab (ncr4ailab.de)

Terms are defined in the [Glossary](00-glossary.md). This documents the **current
layout** plus the **conventions** that keep it consistent as it grows.

---

## 1. Repository layout

```
DswgoNavioChatbot/                 # Monorepo root
├── backend/                       # FastAPI service (the "brain")
│   ├── app.py                     # HTTP API, guards, orchestration
│   ├── chatbot.py                 # CLI harness for local prompt/model testing
│   ├── clerk_auth.py              # Admin auth (optional)
│   ├── db.py                      # PostgreSQL access (optional)
│   ├── salesforce.py              # Contact-form connector (optional)
│   ├── test_salesforce.py         # Tests (seed of the suite)
│   ├── prompts/                   # SYSTEM_PROMPT.md + DATENSCHUTZ.md
│   ├── sql/                       # schema.sql (run-once database schema)
│   ├── requirements.txt           # Python dependencies
│   ├── cloudrun.env.yaml          # Non-secret Cloud Run config
│   ├── Dockerfile                 # Backend container build
│   └── README.md                  # Backend-specific notes
│
├── frontend/                      # React + Vite app (the "face")
│   ├── src/
│   │   ├── components/            # UI components (see Frontend doc §2)
│   │   ├── pages/                 # Landing · Hub · BotDetail
│   │   ├── lib/                   # api.ts (API client) · router.ts
│   │   ├── data/bots.ts           # Bot definitions (persona-as-data)
│   │   ├── embed/widget.tsx       # Embeddable-widget entry (Shadow DOM)
│   │   ├── App.tsx · main.tsx     # SPA shell + entry
│   │   └── index.css              # Tailwind + base styles
│   ├── public/                    # Static assets copied verbatim
│   ├── dist/ · dist-widget/       # Build outputs (generated — not edited)
│   ├── vite.config.ts             # SPA build + dev proxy
│   ├── vite.config.widget.ts      # Embeddable-widget build
│   ├── nginx.conf                 # Static serving config (frontend container)
│   ├── package.json               # Scripts + JS dependencies
│   ├── Dockerfile                 # Frontend container build (node → nginx)
│   └── README.md                  # Frontend-specific notes
│
├── docs/                          # Documentation
│   ├── architecture/              # THIS blueprint (architecture source of truth)
│   ├── knowledge_base/            # doc1–doc5.md — SportNavi FAQ source content
│   └── NAVIO.md                   # Combined product + developer overview
│
├── test/                          # Cross-cutting / manual test artifacts (index.html)
├── presentation/                  # Stakeholder presentation material (index.html)
│
├── docker-compose.yml             # VPS stack: Caddy + frontend + backend + Redis
├── Caddyfile                      # Reverse-proxy routing (VPS)
├── DEPLOY.md                      # Cloud Run deployment runbook
├── .env.example                   # Template for backend secrets/config (root)
└── README.md                      # Project entry point
```

---

## 2. Purpose of every major directory

| Directory               | Purpose                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `backend/`              | The stateless FastAPI service: API, safety, AI orchestration, optional integrations.      |
| `backend/prompts/`      | The system prompt (Navio's behaviour + knowledge) and the privacy notice text.            |
| `backend/sql/`          | The database schema, run once on the server. Idempotent.                                   |
| `frontend/src/components/` | All UI components, grouped by responsibility (see [Frontend §2](03-frontend-architecture.md#2-structure--component-organization)). |
| `frontend/src/lib/`     | Cross-cutting helpers — the single API client and the hash router.                         |
| `frontend/src/data/`    | Bot definitions as data (`bots.ts`) — the extension point for new personas.                |
| `frontend/src/embed/`   | The embeddable-widget entry point (separate build target).                                 |
| `frontend/public/`      | Static files served as-is (favicons, etc.).                                                |
| `docs/architecture/`    | This blueprint — the authoritative architecture documentation.                             |
| `docs/knowledge_base/`  | Source FAQ content for members/companies/partners (curated into the system prompt).        |
| `test/`                 | Cross-cutting/manual test artifacts.                                                        |
| `presentation/`         | Material for presenting the project to stakeholders.                                        |
| (root)                  | Deployment + entry files shared by both tiers (`docker-compose.yml`, `Caddyfile`, `DEPLOY.md`, `README.md`, `.env.example`). |

---

## 3. Documentation organization

Documentation is split by **purpose**, not dumped in one place:

| Location                | Holds                                                            | Audience              |
| ----------------------- | --------------------------------------------------------------- | --------------------- |
| `docs/architecture/`    | How the system is designed/deployed/operated (this blueprint)    | Technical + business  |
| `docs/knowledge_base/`  | The *content* Navio answers from (SportNavi FAQs)                | Product / content     |
| `docs/NAVIO.md`         | Combined product + developer overview                            | Mixed                 |
| `backend/README.md`, `frontend/README.md` | Tier-specific quick-start notes                | Developers            |
| `DEPLOY.md` (root)      | The operational deployment runbook                               | DevOps                |

**The relationship between the prompt and the knowledge base:** the curated FAQ
content in `docs/knowledge_base/doc*.md` is the *source*; it is consolidated into
`backend/prompts/SYSTEM_PROMPT.md`, which is what the model actually reads (and which
admins can edit live via the config API). Keep the two in sync: edit the source docs,
then fold changes into the system prompt. See
[Documentation Standards](07-documentation-standards.md) for the rule.

---

## 4. Configuration management organization

The guiding principle is a strict **secret vs non-secret split**:

| Kind                  | Lives in                                            | Examples                                                                 |
| --------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| **Secrets**           | Secret Manager (Cloud Run) / `.env` (VPS/dev) — never committed | `AZURE_AI_CHATBOT_API_KEY`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `SALESFORCE_CLIENT_SECRET`, `SESSION_SECRET`, `IP_HASH_SALT` |
| **Non-secret runtime**| `backend/cloudrun.env.yaml` (Cloud Run) / `.env` (VPS) | Azure endpoint + deployment name, `ALLOWED_ORIGINS`, rate limits, `MAX_*`, `CLERK_ISSUER`, `ADMIN_EMAIL_DOMAINS`, Salesforce URLs |
| **Frontend config**   | Build-time env + `bots.ts`                          | `VITE_NAVIO_API`, the public Clerk key; bot personas/options in `bots.ts` |

**Rule:** anything that grants access (keys, passwords, connection strings) is a
secret and must never appear in `cloudrun.env.yaml`, `bots.ts`, or any committed file.
The `cloudrun.env.yaml` header documents this boundary explicitly.

---

## 5. Environment file organization

| File                        | Committed?         | Holds                                                            |
| --------------------------- | ------------------ | --------------------------------------------------------------- |
| `.env.example` (root)       | ✅ template only    | Documents every backend variable with placeholder values.       |
| `.env` (root)               | ❌ never            | Real backend secrets/config for local dev or the VPS.           |
| `frontend/.env.example`     | ✅ template only    | Documents frontend variables.                                   |
| `frontend/.env.production`  | ✅ (public key only)| The **publishable** Clerk key (`pk_...`) + `VITE_NAVIO_API` — publishable keys are safe to commit. |

**Never commit:** any `.env` containing real secrets, any private key (`sk_...`),
database URLs, or Salesforce credentials. The only committable env file with values is
`frontend/.env.production`, and only because publishable keys are public by design.

---

## 6. Asset organization

| Asset type             | Lives in                              | Notes                                                       |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------- |
| UI icons               | `frontend/src/components/icons.tsx`   | SVG components, imported by `bots.ts` and components.       |
| Widget theming         | `frontend/src/components/widgetThemes.ts` | Centralized colors/fonts/animation for the widget.     |
| Static web assets      | `frontend/public/`                    | Served verbatim (favicons, images).                        |
| Build outputs          | `frontend/dist/`, `frontend/dist-widget/` | **Generated** — never hand-edit; produced by the build. |
| Presentation assets    | `presentation/`                       | Stakeholder-facing material.                               |
| Diagram sources        | `docs/architecture/diagrams/`         | Editable Mermaid/ASCII sources for this blueprint.         |

---

## 7. Testing organization

**Current state:** `backend/test_salesforce.py` is the seed; `test/` holds cross-
cutting artifacts. **Recommended structure** as the suite grows:

```
backend/
└── tests/
    ├── test_api.py            # endpoint contract + input caps + consent gating
    ├── test_rate_limit.py     # per-IP minute/day limits
    ├── test_salesforce.py     # success / failure / email fallback (exists)
    └── test_clerk_auth.py     # JWT verification + domain allowlist
frontend/
└── src/**/__tests__/          # component + api-client tests (co-located)
```

**Priority order (what to test first):**
1. **API contract & input caps** — the public surface and its limits (`ChatRequest`,
   `ContactRequest`).
2. **Consent gating of stored text** — text is null without consent (`_log_row`).
3. **Rate-limit behaviour** — 429 mapping and per-IP counting.
4. **Salesforce path** — success, flow failure → email fallback, simulate mode.
5. **Clerk auth** — valid/invalid JWT and on/off-allowlist email domains.

**Conventions:** name backend tests `test_*.py`; mirror the module under test; keep
each integration's tests independent so an optional integration can be tested in
isolation (matching the [graceful-degradation design](02-backend-architecture.md#3-service-boundaries--graceful-degradation)).

---

**Next:** [Documentation Standards](07-documentation-standards.md) ·
[Backend Architecture](02-backend-architecture.md)
