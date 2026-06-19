# 05 · Hosting Organization (Repository & Deployment Strategy)

> **Audience:** DevOps and technical leads deciding how the codebase and its
> deployments should be organized. Three approaches are compared in full, followed by
> a single justified recommendation for this project.
> **Last reviewed:** 2026-06-18 · **Owner:** AI Lab (ncr4ailab.de)

Terms are defined in the [Glossary](00-glossary.md). This document is about *how to
organize the code and releases*; *where they run* is in
[Infrastructure & Deployment](04-infrastructure-deployment.md).

---

## 1. The two questions

There are two independent decisions, often conflated:

1. **Repository organization** — one repo (monorepo) or many (polyrepo)?
2. **Deployment coupling** — are frontend and backend released **together** (unified)
   or **independently**?

Navio is today a **monorepo** (`backend/` + `frontend/` in one repository), deployed
as **two independent services** on Cloud Run. The sections below evaluate all three
viable combinations.

---

## 2. Approach 1 — Monorepo, unified deployment

One repository; frontend and backend built and released as a **single unit** (e.g.
one `docker compose up` that ships both).

```
DswgoNavioChatbot/            (one repo, one release)
├── backend/                  ─┐
├── frontend/                  ├─ built & deployed together
├── docker-compose.yml        ─┘
└── Caddyfile
```

| Advantages                                                      | Trade-offs                                                              |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Simplest mental model — one repo, one release.                  | Frontend and backend must ship on the same cadence.                    |
| Atomic cross-cutting commits (API + client together).           | A tiny frontend copy change forces a full-stack release.               |
| One CI pipeline.                                                 | Static frontend can't be cached/scaled independently of the backend.   |
| Matches the **VPS** model exactly (`docker-compose.yml`).        | Coarser blast radius — a bad frontend build can hold up a backend fix.  |

**Maintenance:** lowest setup cost; best for the VPS deployment and for very small
teams. Becomes limiting as release cadences diverge.

---

## 3. Approach 2 — Monorepo, independent deployment

One repository; **two independent build + deploy pipelines** producing two services
that release on their own cadences.

```
DswgoNavioChatbot/            (one repo, TWO releases)
├── backend/   ──► build image ──► deploy "backend" service
├── frontend/  ──► build SPA + widget ──► deploy "frontend" service
└── shared contract: frontend/src/lib/api.ts ⇄ backend/app.py
```

| Advantages                                                                 | Trade-offs                                                            |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Frontend and backend ship independently (fast UI tweaks, careful API rolls).| Two pipelines to maintain.                                           |
| Static frontend scales/caches separately from the dynamic backend.          | Must keep the API contract compatible across independent releases.   |
| Still gets atomic cross-cutting commits and one source of truth.            | Slightly more deployment configuration.                              |
| **Matches the current Cloud Run reality** (two services).                   | Requires discipline on versioning the embeddable widget.             |
| Single PR can change `api.ts` and `app.py` together, reviewed as one unit.   |                                                                      |

**Maintenance:** moderate setup, high day-to-day flexibility. The shared
`bots.ts`/`api.ts` ⇄ `app.py` contract benefits from living in one repo while still
deploying separately.

---

## 4. Approach 3 — Polyrepo (independent repositories)

Frontend and backend in **separate repositories**, each with its own pipeline.

```
navio-backend/     (repo A)  ──► deploy backend
navio-frontend/    (repo B)  ──► deploy frontend + widget
   └─ depends on backend's published API contract
```

| Advantages                                                  | Trade-offs                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Hard ownership boundaries (separate teams, access control). | Cross-cutting changes span **two** PRs in two repos — no atomic commit.         |
| Each repo is smaller and focused.                           | The API contract must be formally versioned and coordinated across repos.       |
| Independent issue trackers / release notes.                 | More infrastructure (two repos, two CI setups, duplicated tooling).             |
|                                                             | Higher coordination cost for a small team.                                      |

**Maintenance:** highest overhead; pays off only with separate teams or strict access
separation.

---

## 5. Independent frontend deployment architecture

(Applies to Approaches 2 and 3.)

- **Artifacts:** the SPA (`dist/`) and the embeddable widget (`dist-widget/`),
  produced by `npm run build` and `npm run build:widget`.
- **Hosting:** static — served by nginx (the `frontend` container) or any static/CDN
  host. Hash routing means no server-side rewrites are needed.
- **Config injection:** `VITE_NAVIO_API` selects the backend origin at build time; the
  widget can also be pointed at runtime via `data-api`. The public Clerk key is baked
  in from `frontend/.env.production`.
- **Widget versioning (important):** the embeddable widget may be cached on third-party
  SportNavi pages. Treat its URL/bundle as a public contract — prefer additive changes,
  and coordinate breaking changes with a versioned script URL so old embeds keep
  working.

## 6. Independent backend deployment architecture

- **Artifact:** the `backend/` container image (FastAPI + Uvicorn).
- **Hosting:** a stateless service (Cloud Run service or the `navio` container),
  scaled by instances (Cloud Run) or `WEB_CONCURRENCY` workers (VPS).
- **Secrets:** Secret Manager (Cloud Run) or `.env` (VPS).
- **Data:** the optional PostgreSQL database is external to the service; the backend
  connects via the PgBouncer port. The service can be redeployed freely without data
  loss because it is stateless.
- **Contract:** the API surface in `app.py` is the boundary the frontend depends on —
  see [Backend → API versioning](02-backend-architecture.md#api-versioning-posture).

## 7. Unified deployment architecture

(Approach 1.) One release ships both tiers together — the `docker-compose.yml` stack
(Caddy + frontend + backend + Redis) is the canonical example. Shared lifecycle means
a single command brings the whole system up or rolls it back, at the cost of coupling
the two release cadences.

---

## 8. Recommendation

> **Recommended: Approach 2 — Monorepo with independent deployment.**

**Why this one, for this project:**

1. **It matches reality.** Production already runs two independent Cloud Run services
   from one repository — this codifies what is working.
2. **The contract lives together, ships apart.** The frontend↔backend contract is
   small but tightly linked (`frontend/src/lib/api.ts` ⇄ `backend/app.py`, plus the
   Salesforce picklists in `bots.ts` that must match the flow). A monorepo lets a
   single reviewed PR change both sides atomically — something polyrepo cannot do —
   while independent pipelines still let a frontend copy tweak ship without a backend
   release.
3. **Right-sized for the team.** One small team maintains both tiers; polyrepo's
   ownership boundaries would add coordination cost without benefit.
4. **Independent scaling.** The static frontend and the dynamic, secret-holding backend
   have different scaling and caching needs; independent deployment serves both.

**Keep the unified path (Approach 1) available** for the VPS model, where one
`docker compose up` is genuinely the simplest correct thing.

**When to revisit (move toward polyrepo):** split into separate repositories only if
**(a)** distinct teams take ownership of frontend vs backend, **(b)** access control or
compliance requires hard repository boundaries, or **(c)** the API contract becomes
formally versioned and externally consumed by parties who can't track a monorepo.
Until then, the coordination cost of polyrepo outweighs its benefits.

| Criterion                | Approach 1 (unified) | **Approach 2 (recommended)** | Approach 3 (polyrepo) |
| ------------------------ | :------------------: | :--------------------------: | :-------------------: |
| Setup simplicity         | ●●●                  | ●●                           | ●                     |
| Atomic cross-cutting PRs | ●●●                  | ●●●                          | ✗                     |
| Independent release      | ✗                    | ●●●                          | ●●●                   |
| Independent scaling      | ✗                    | ●●●                          | ●●●                   |
| Team/ownership separation| ●                    | ●●                           | ●●●                   |
| Fit to current setup     | VPS only             | **Cloud Run + repo today**   | ✗                     |

---

**Next:** [Project Structure](06-project-structure.md) ·
[Infrastructure & Deployment](04-infrastructure-deployment.md)
