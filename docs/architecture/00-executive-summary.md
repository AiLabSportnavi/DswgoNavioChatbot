# Executive Summary

> **Audience:** Business owners, managers, and any non-technical stakeholder.
> **Reading time:** ~5 minutes. **No technical background required.**
> **Last reviewed:** 2026-06-18 · **Owner:** AI Lab (ncr4ailab.de)

Words in *italics* are defined in plain language in the [Glossary](00-glossary.md).

---

## 1. What Navio is

**Navio is a friendly digital assistant for SportNavi.** It lives on the SportNavi
website as a small chat bubble. A visitor clicks it, types a question in their own
language, and Navio answers — like a knowledgeable, always-available guide at a
reception desk.

Navio's personality is deliberately warm and approachable: it is the *navigator*
that helps people find their way through everything SportNavi offers.

Navio comes in **two versions**, both powered by the same brain:

| Version        | What the visitor sees                                                            |
| -------------- | -------------------------------------------------------------------------------- |
| **Navio**      | A straight chat — ask a question, get an answer.                                  |
| **Navio Plus** | A small menu first: *either* chat with the assistant *or* fill in a contact form that is sent to SportNavi's customer system. |

---

## 2. The problem it solves

SportNavi serves three very different groups of people, each with their own
questions:

- **Members** — "Where can I do yoga near me?", "How do I check in at a gym?",
  "How do I cancel?"
- **Companies** — "How do we offer SportNavi as a staff benefit?", "What does it
  cost?"
- **Partners** (gyms, studios, pools) — "How do we join the network?", "How do we
  get paid?"

Answering these by hand, around the clock, in multiple languages, is expensive and
slow. **Navio answers them instantly, 24/7, in the visitor's own language**, and
only ever using SportNavi's official, approved information — so it never invents
facts.

---

## 3. Who it serves

```
            ┌──────────────────────────────────────────────┐
            │                  SportNavi                   │
            │              website visitor                 │
            └──────────────────────────────────────────────┘
                  │              │               │
            ┌─────▼────┐   ┌─────▼─────┐   ┌─────▼─────┐
            │ Members  │   │ Companies │   │ Partners  │
            │ find     │   │ learn the │   │ join the  │
            │ offers,  │   │ corporate │   │ network,  │
            │ membership│  │ benefit   │   │ get paid  │
            └──────────┘   └───────────┘   └───────────┘
                  │              │               │
                  └──────────────┼───────────────┘
                                 ▼
                        ┌─────────────────┐
                        │      Navio      │
                        │  (the assistant)│
                        └─────────────────┘
```

---

## 4. How it works, at a glance

You do **not** need to understand the technology to trust the system. In plain
terms:

```
  Visitor types a question
            │
            ▼
  The SportNavi website  ───►  Navio's secure server  ───►  An AI engine
  (the chat bubble)             (does the thinking,            (Microsoft's
                                 keeps the secrets)             Azure OpenAI)
            ▲                          │
            └──────────────────────────┘
                Navio's answer appears in the chat
```

- The **chat bubble** is just the friendly face. It holds no secrets.
- **Navio's secure server** is the part that thinks. It holds the private keys, the
  approved knowledge, and all the safety rules. *Nothing sensitive is ever exposed
  to the visitor's browser.*
- The **AI engine** (Microsoft Azure OpenAI) generates the wording of each answer,
  strictly guided by SportNavi's approved knowledge.

The contact form in *Navio Plus* connects to SportNavi's existing customer system
(*Salesforce*). If that system is ever briefly unavailable, the request is
automatically **emailed to the service team instead, so nothing is ever lost.**

---

## 5. Trust and privacy — in plain terms

Privacy and trust were designed in from the start, not bolted on:

| Principle                       | What it means for a visitor                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Ask before storing**          | Navio shows a clear privacy notice *before* the first message. Message text is only ever recorded if the visitor agrees. |
| **No raw personal identifiers** | The visitor's network address is never stored in a readable form — only as an irreversible fingerprint, used solely to spot abuse. |
| **Secrets stay on the server**  | Passwords and private keys never reach the visitor's browser.                                          |
| **Grounded answers only**       | Navio answers *only* from SportNavi's official knowledge base. It will politely decline anything outside that. |
| **Abuse resistant**             | Built-in limits and an optional human-check stop bots and spam from overwhelming the service.          |
| **Right to be forgotten**       | Stored conversations can be automatically deleted after a set period (e.g. 90 days).                   |

This aligns with **GDPR / DSGVO** expectations for a German service.

---

## 6. Where it runs and what it costs to operate

- **Today, Navio runs on Google Cloud Run** — a modern "pay only for what you use"
  hosting service in a **European data centre** (Frankfurt region), appropriate for
  a German audience and data-residency expectations.
- **It scales automatically.** When nobody is chatting, it costs almost nothing
  ("scales to zero"). When traffic spikes, it expands on its own and shrinks back
  afterwards. There is no fixed server to pay for around the clock.
- **An alternative single-server option exists** (a *VPS* — one rented Linux
  computer) and is fully documented in
  [Infrastructure & Deployment](04-infrastructure-deployment.md). It can be cheaper
  at steady high volume but requires more hands-on maintenance. The choice is a
  business trade-off, explained in that document.

The main running costs are: the AI engine usage (per conversation), the hosting
(near-zero when idle), and an optional small database for conversation analytics.

---

## 7. How it can grow

Navio is built to extend without redesign. Likely future steps include:

- **More assistants** for other brands or topics — the system already supports
  multiple "bots" side by side.
- **A larger, externally-managed knowledge base** — today the knowledge lives
  inside the assistant's instructions; it can later be moved into a searchable
  library for richer answers.
- **Analytics dashboards** — understanding the most common questions to improve
  service.
- **More channels** — the same brain could later answer in app, email, or
  messaging, not just the website.

See [Product Architecture → Future growth](01-product-architecture.md#7-future-growth-considerations)
for the technical view.

---

## 8. One-paragraph summary for a board slide

> *Navio is SportNavi's always-on, multilingual website assistant. It answers
> members', companies', and partners' questions instantly using only SportNavi's
> approved information, and routes contact requests into the existing customer
> system. It is privacy-first by design (consent before storage, no readable
> personal identifiers), runs cost-efficiently on European cloud infrastructure
> that scales to zero when idle, and is architected to add more assistants,
> channels, and a richer knowledge base without rebuilding.*

---

**Next:** [Glossary](00-glossary.md) · [Product Architecture](01-product-architecture.md)
