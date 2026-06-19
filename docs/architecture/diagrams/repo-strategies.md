# Repository & deployment strategy diagrams

Source for the three approaches compared in
[05 Hosting Organization](../05-hosting-organization.md).

## Approach 1 — Monorepo, unified deployment

```
DswgoNavioChatbot/            (one repo, one release)
├── backend/                  ─┐
├── frontend/                  ├─ built & deployed together
├── docker-compose.yml        ─┘
└── Caddyfile
```

## Approach 2 — Monorepo, independent deployment  ★ recommended

```
DswgoNavioChatbot/            (one repo, TWO releases)
├── backend/   ──► build image ──► deploy "backend" service
├── frontend/  ──► build SPA + widget ──► deploy "frontend" service
└── shared contract: frontend/src/lib/api.ts ⇄ backend/app.py
```

## Approach 3 — Polyrepo (independent repositories)

```
navio-backend/     (repo A)  ──► deploy backend
navio-frontend/    (repo B)  ──► deploy frontend + widget
   └─ depends on backend's published API contract
```
