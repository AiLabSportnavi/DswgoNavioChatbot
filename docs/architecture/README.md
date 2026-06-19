# Navio Chatbot — Architecture & Implementation Blueprint

> **What this is.** This folder is the **single source of truth** for how the Navio
> Chatbot is designed, built, deployed, and operated. It explains not just *what*
> the system is, but *why* it is shaped the way it is — so that any stakeholder,
> technical or not, can understand it, review it, and extend it with confidence.
>
> **Last reviewed:** 2026-06-18 · **Owner:** AI Lab (ncr4ailab.de) · **Status:** Living document

---

## What is Navio, in one sentence?

Navio is a **friendly AI assistant for SportNavi** — Germany's corporate-fitness
network — that answers questions for members, companies, and partners on the
website, in any language, grounded only in the official SportNavi knowledge base.

---

## How to read this blueprint

This blueprint is split into focused documents so you only read what is relevant
to you. Use the table below to find your reading path.

| If you are a…                  | Start here                                                                                          | Then read                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Executive / Business owner** | [Executive Summary](00-executive-summary.md)                                                        | [Glossary](00-glossary.md)                                                 |
| **New developer (onboarding)** | [Product Architecture](01-product-architecture.md)                                                  | [Backend](02-backend-architecture.md) → [Frontend](03-frontend-architecture.md) → [Project Structure](06-project-structure.md) |
| **Backend / API engineer**     | [Backend Architecture](02-backend-architecture.md)                                                  | [Infrastructure & Deployment](04-infrastructure-deployment.md)             |
| **Frontend engineer**          | [Frontend Architecture](03-frontend-architecture.md)                                                | [Product Architecture](01-product-architecture.md)                         |
| **DevOps / Platform engineer** | [Infrastructure & Deployment](04-infrastructure-deployment.md)                                       | [Hosting Organization](05-hosting-organization.md)                         |
| **Technical writer**           | [Documentation Standards](07-documentation-standards.md)                                             | [Project Structure](06-project-structure.md)                              |
| **Anyone, for a term**         | [Glossary](00-glossary.md)                                                                           | —                                                                          |

> **Tip for non-technical readers:** every document defines its jargon inline and
> links unfamiliar terms to the [Glossary](00-glossary.md). You can read the
> [Executive Summary](00-executive-summary.md) end-to-end without any technical
> background.

---

## Document map

```
docs/architecture/
├── README.md                       ← you are here (index + reading guide)
├── 00-executive-summary.md         Plain-language overview for non-technical stakeholders
├── 00-glossary.md                  Every technical term, defined in plain words
├── 01-product-architecture.md      The whole system: what it does, who owns what, how it grows
├── 02-backend-architecture.md      The server: modules, APIs, database, security, scaling
├── 03-frontend-architecture.md     The web app + embeddable widget: components, state, UX
├── 04-infrastructure-deployment.md Where & how it runs: Cloud Run (primary) + VPS (alternative)
├── 05-hosting-organization.md      Repository & deployment strategy: options compared + recommendation
├── 06-project-structure.md         Folder layout, config, environments, assets, testing
├── 07-documentation-standards.md   The documentation system: types, ownership, conventions
└── diagrams/                       Editable source for the larger diagrams (Mermaid/ASCII)
```

| Document                                                      | Audience               | Answers the question…                                  |
| ------------------------------------------------------------ | ---------------------- | ------------------------------------------------------ |
| [00 Executive Summary](00-executive-summary.md)              | Non-technical          | "What is this, who is it for, and is it safe?"         |
| [00 Glossary](00-glossary.md)                                | Everyone               | "What does that word mean?"                            |
| [01 Product Architecture](01-product-architecture.md)        | Mixed                  | "How does the whole system fit together?"              |
| [02 Backend Architecture](02-backend-architecture.md)        | Technical              | "How is the server organized and secured?"             |
| [03 Frontend Architecture](03-frontend-architecture.md)      | Technical              | "How is the web app and widget organized?"             |
| [04 Infrastructure & Deployment](04-infrastructure-deployment.md) | DevOps            | "Where does it run and how is it deployed?"            |
| [05 Hosting Organization](05-hosting-organization.md)        | DevOps / Lead          | "Should frontend and backend be deployed together?"    |
| [06 Project Structure](06-project-structure.md)              | Technical              | "Where does each kind of file belong?"                 |
| [07 Documentation Standards](07-documentation-standards.md)  | Tech writer / Lead     | "What documents must exist and how are they written?"  |

---

## How this blueprint is maintained

- **Source of truth.** When code and these documents disagree, that is a bug in
  the documents — open an update. The blueprint describes the system as it *is*,
  plus clearly-labelled *future-growth* notes for where it is *going*.
- **Update triggers.** Each document lists the code changes that should trigger an
  update to it (see [Documentation Standards](07-documentation-standards.md)).
  As a rule: a new API endpoint updates [02](02-backend-architecture.md); a new
  component updates [03](03-frontend-architecture.md); a deployment change updates
  [04](04-infrastructure-deployment.md).
- **Versioning.** Each file carries a **Last reviewed** date and **Owner** at the
  top. Review the whole set at least once per milestone.
- **Decisions.** Significant architectural choices are recorded as **Architecture
  Decision Records (ADRs)** — see the convention in
  [Documentation Standards](07-documentation-standards.md).

---

## Scope of this blueprint

**In scope:** product, backend, frontend, infrastructure, deployment, hosting and
repository organization, project structure, and documentation standards — all as
*planning and explanation*, grounded in the current codebase.

**Out of scope:** this is a planning and documentation deliverable. It contains
**no source code** and changes no runtime behaviour. It does not replace the
operational runbook [`DEPLOY.md`](../../DEPLOY.md) or the product/knowledge-base
docs under [`docs/knowledge_base/`](../knowledge_base/); instead it frames and
links them.
