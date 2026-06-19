# 07 · Documentation Standards

> **Audience:** Technical writers and leads. The documentation *system* — which
> documents must exist, who owns them, where they live, and the conventions that keep
> them trustworthy.
> **Last reviewed:** 2026-06-18 · **Owner:** AI Lab (ncr4ailab.de)

Terms are defined in the [Glossary](00-glossary.md).

---

## 1. The framework: Diátaxis

Navio's documentation is organized by the **Diátaxis** model, which sorts every
document into one of four needs. Sorting by need makes **coverage gaps visible** — if
a quadrant is empty, something is missing.

| Quadrant         | Serves                          | Question it answers              | Examples here                                         |
| ---------------- | ------------------------------- | -------------------------------- | ----------------------------------------------------- |
| **Tutorial**     | Learning by doing               | "Get me started step by step."   | Developer getting-started; "run it locally".          |
| **How-to**       | Achieving a specific task       | "How do I deploy / rotate a key?"| `DEPLOY.md`; VPS how-to; runbooks.                    |
| **Reference**    | Looking up precise facts        | "What does this endpoint do?"    | [Backend](02-backend-architecture.md) API/DB tables.  |
| **Explanation**  | Understanding the why           | "Why is it designed this way?"   | This `architecture/` blueprint; the ADRs.             |

---

## 2. Required document set

Each document type below should exist, with a clear owner, audience, and home.

### Technical documentation
| Document               | Location                                      | Status / Note                                  |
| ---------------------- | --------------------------------------------- | ---------------------------------------------- |
| Architecture blueprint | `docs/architecture/` (this set)               | ✅ Source of truth.                             |
| API reference          | `docs/architecture/02-backend-architecture.md` §4 | ✅ Endpoint catalog. Promote to a standalone reference if the API grows. |
| Data model reference   | `docs/architecture/02-backend-architecture.md` §5 + `backend/sql/schema.sql` | ✅ Tables documented. |

### Non-technical documentation
| Document               | Location                                      | Status / Note                                  |
| ---------------------- | --------------------------------------------- | ---------------------------------------------- |
| Executive summary      | `docs/architecture/00-executive-summary.md`   | ✅ Board-ready overview.                        |
| Product overview       | `docs/NAVIO.md` + [Product Architecture](01-product-architecture.md) | ✅ |
| Trust & privacy explainer | [Executive Summary §5](00-executive-summary.md#5-trust-and-privacy--in-plain-terms) | ✅ Plain-language privacy stance. |

### Onboarding documentation
| Document               | Location                                      | Status / Note                                  |
| ---------------------- | --------------------------------------------- | ---------------------------------------------- |
| Developer getting-started | `backend/README.md`, `frontend/README.md`  | ✅ Tier quick-starts. Add a top-level "first hour" tutorial if onboarding grows. |
| Run-it-locally how-to  | [Infra §4](04-infrastructure-deployment.md#4-environment-organization-dev--staging--production) | ✅ Dev environment row. |

### Deployment documentation
| Document               | Location                                      | Status / Note                                  |
| ---------------------- | --------------------------------------------- | ---------------------------------------------- |
| Cloud Run runbook      | `DEPLOY.md`                                   | ✅ Step-by-step.                                |
| VPS how-to             | _to create_ — `docs/` (additive)              | ⬜ Recommended: a how-to mirroring `docker-compose.yml` + `Caddyfile`. |

### Operational documentation (runbooks)
| Runbook                | Location                                      | Status / Note                                  |
| ---------------------- | --------------------------------------------- | ---------------------------------------------- |
| Secret rotation        | _to create_                                   | ⬜ Covers Secret Manager versions / `.env` updates. |
| Scaling                | [Infra §7](04-infrastructure-deployment.md#7-monitoring-logging-backup--recovery) | ✅ Outline (instances / `WEB_CONCURRENCY`). |
| Retention purge        | `backend/sql/schema.sql` (pg_cron block)      | ✅ Documented.                                  |
| Incident response      | _to create_                                   | ⬜ Recommended: who/what/rollback steps.        |

### Troubleshooting documentation
A symptom → cause → fix table, kept close to operations. Seed entries:

| Symptom                              | Likely cause                                  | Fix                                                                 |
| ------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------- |
| Chat returns "I can't answer that"   | Azure content filter / 400                     | Expected for off-topic/abusive prompts (`friendly_ai_reply`).        |
| `429 Too many requests`              | Per-IP rate limit hit                          | Wait; tune `RATE_LIMIT_PER_MIN/DAY`; check for abuse.                |
| CORS error in browser console        | Origin not in `ALLOWED_ORIGINS`                | Add the origin to the allowlist and redeploy.                       |
| Contact form "simulated"             | Salesforce not configured                      | Set `SALESFORCE_CLIENT_ID/SECRET` (expected in dev/demo).            |
| Admin save returns 401/403           | Missing/invalid Clerk JWT or off-allowlist email | Sign in; ensure the email domain is in `ADMIN_EMAIL_DOMAINS`.      |
| No conversation logs                 | `DATABASE_URL` unset                           | Expected — logging is optional; set the URL to enable.              |
| Chat works but nothing is stored     | Visitor declined consent                       | By design — text is stored only with consent.                       |

### Architecture documentation
This blueprint, **plus an ADR convention** (below) for recording future decisions.

---

## 3. Architecture Decision Records (ADRs)

Significant decisions get a short, immutable record so future readers know *why*.

- **Where:** `docs/architecture/decisions/NNNN-title.md` (create when the first ADR is
  written).
- **When:** any choice that is costly to reverse — a new integration, a datastore
  change, an auth model change, a hosting-model change.
- **Shape:** Context → Decision → Status (proposed/accepted/superseded) → Consequences.
- **Immutable:** don't rewrite an accepted ADR; supersede it with a new one and link
  back. Examples already visible in the code's history: "replace Supabase with direct
  psycopg", "make every integration optional", "two Cloud Run services".

---

## 4. Writing standards

| Standard            | Rule                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| **File naming**     | `NN-kebab-case.md` for ordered docs; `NNNN-title.md` for ADRs.                                     |
| **Front-matter**    | Every doc opens with a blockquote stating **Audience**, **Last reviewed** date, and **Owner**.     |
| **Tone by audience**| Non-technical docs avoid jargon and define terms inline; technical docs may assume the glossary.   |
| **Define terms**    | First use of a term links to the [Glossary](00-glossary.md).                                       |
| **Diagrams**        | Prefer Mermaid (renders on GitHub) or aligned ASCII; keep editable sources in `diagrams/`.         |
| **Decision + why**  | State the decision *and* its justification — never an unexplained mandate.                         |
| **Ground in code**  | Reference real files/paths; the docs describe the system as it *is*, with future notes labelled.   |
| **Cross-link**      | Link related sections rather than duplicating them.                                                |

---

## 5. Update triggers

Documentation drift is the main risk; tie each doc to the code changes that must
update it.

| When this changes in code…                       | Update this document                                        |
| ------------------------------------------------ | ----------------------------------------------------------- |
| A new/changed API endpoint                       | [02 Backend](02-backend-architecture.md) §4                 |
| The database schema (`sql/schema.sql`)           | [02 Backend](02-backend-architecture.md) §5                 |
| A security control (auth, limits, CORS)          | [02 Backend](02-backend-architecture.md) §6                 |
| A new integration / `*_enabled()` module         | [01 Product](01-product-architecture.md) §3 + [02](02-backend-architecture.md) §3 |
| A component group / routing / widget model        | [03 Frontend](03-frontend-architecture.md)                  |
| A deployment or environment change               | [04 Infrastructure](04-infrastructure-deployment.md) + `DEPLOY.md` |
| A repo/deploy strategy change                     | [05 Hosting](05-hosting-organization.md)                    |
| A folder/config/env/asset/test convention         | [06 Project Structure](06-project-structure.md)             |
| A persona/prompt change (`bots.ts`, system prompt)| [01 Product](01-product-architecture.md) + the knowledge-base sync (below) |
| A new significant decision                        | Add an ADR (§3)                                             |

**Knowledge-base sync rule:** when SportNavi FAQ content changes, edit the source in
`docs/knowledge_base/`, then fold it into `backend/prompts/SYSTEM_PROMPT.md` (what the
model actually reads). The two must not diverge.

---

## 6. Documentation health checklist (per milestone)

- [ ] Every Diátaxis quadrant has at least the required documents (§2).
- [ ] Every doc's **Last reviewed** date is current.
- [ ] Diagrams render and match the described architecture.
- [ ] The [Glossary](00-glossary.md) covers every term used.
- [ ] The [Executive Summary](00-executive-summary.md) still reads correctly end-to-end
      for a non-technical stakeholder.
- [ ] No secret values have leaked into any committed doc.
- [ ] Open `⬜ to create` items (VPS how-to, secret-rotation + incident-response
      runbooks) are tracked.

---

**Back to:** [README index](README.md) · [Project Structure](06-project-structure.md)
