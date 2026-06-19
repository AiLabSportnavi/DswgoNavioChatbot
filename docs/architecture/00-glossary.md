# Glossary

> **Audience:** Everyone. Every technical term used across this blueprint is
> defined here in plain language, with a note on how it applies *in this project*.
> **Last reviewed:** 2026-06-18 · **Owner:** AI Lab (ncr4ailab.de)

Terms are alphabetical. Each entry has a plain definition and an "**In Navio:**"
line explaining its specific role here.

---

### API (Application Programming Interface)
A defined set of requests one program can send to another, and the responses it
gets back — like a restaurant menu of available actions.
**In Navio:** the *frontend* talks to the *backend* through a small API (e.g.
"send this chat message", "submit this contact form").

### Backend
The server-side part of the system that the user never sees directly — it does the
thinking, holds the secrets, and talks to other services.
**In Navio:** a *FastAPI* program (`backend/`) that talks to the AI engine,
database, and Salesforce.

### CORS (Cross-Origin Resource Sharing)
A browser security rule that controls which websites are allowed to call a given
backend.
**In Navio:** only approved SportNavi domains may call the backend; everything else
is blocked (an *allowlist*).

### Cloud Run
Google's "serverless" hosting service: you give it a *container*, it runs it on
demand, scales it up under load, and down to zero when idle — you pay per use.
**In Navio:** the **current/primary** way Navio is hosted, in Google's European
region.

### Consent gate
A screen shown before a user can proceed, asking them to agree to a privacy notice.
**In Navio:** the chat input stays disabled until the visitor accepts the
*Datenschutz* (privacy) notice; only then may message text be stored.

### Container / Docker
A standard, self-contained package holding an application plus everything it needs
to run, so it behaves identically on any machine. *Docker* is the most common tool
for building containers.
**In Navio:** both the backend and frontend ship as containers
(`backend/Dockerfile`, `frontend/Dockerfile`).

### Datenschutz / DSGVO
German for "data protection" / the German name for GDPR (the EU data-protection
law).
**In Navio:** drives the consent-first design — store message text only with
consent, never store raw IP addresses.

### Embeddable widget
A small piece of software a third-party website can drop in with a single line, to
show a feature (here, the chat) without rebuilding anything.
**In Navio:** a standalone chat bubble (`frontend/src/embed/widget.tsx`) that any
SportNavi page can load with one `<script>` tag; it isolates itself so the host
page's styling can't break it (see *Shadow DOM*).

### FastAPI
A modern Python framework for building web *APIs* quickly and safely.
**In Navio:** the technology the backend is written in (`backend/app.py`).

### Frontend
The part of the system the user sees and interacts with in their browser.
**In Navio:** a *React* web application plus the embeddable widget (`frontend/`).

### GDPR
EU General Data Protection Regulation — the law governing personal data in Europe.
See *Datenschutz / DSGVO*.

### HMAC-signed token
A short string stamped with a secret "signature" so the server can later confirm it
issued the string and that it hasn't been tampered with or expired.
**In Navio:** used for short-lived *session tokens* that prove a chat session passed
the bot check.

### IP hashing
Converting a visitor's network address (IP) into an irreversible fingerprint, so
abuse can be detected without ever storing the real address.
**In Navio:** the database stores only `sha256(salt + ip)`, never the raw IP
(`backend/db.py`).

### JWT (JSON Web Token)
A compact, digitally-signed token that proves who a user is, issued after they log
in.
**In Navio:** *Clerk* issues a JWT when an administrator signs in; the backend
verifies it before allowing config changes.

### Clerk
A third-party service that handles user sign-in and identity so the project doesn't
build login from scratch.
**In Navio:** secures the **admin** screen used to edit Navio's instructions; only
verified emails on approved domains may save changes (`backend/clerk_auth.py`).

### Knowledge base
The approved set of facts an assistant is allowed to use when answering.
**In Navio:** SportNavi's official FAQs for members, companies, and partners,
currently embedded inside the *system prompt*.

### LLM (Large Language Model) / Azure OpenAI
The AI "engine" that generates human-like text. *Azure OpenAI* is Microsoft's
hosted version of OpenAI's models.
**In Navio:** generates the wording of every answer (model `gpt-4.1`), strictly
guided by the system prompt.

### Monorepo
A single code repository that holds multiple parts of a system (e.g. both frontend
and backend) together.
**In Navio:** the project is a monorepo — `backend/` and `frontend/` live in one
repository.

### PostgreSQL / PgBouncer
*PostgreSQL* is a widely-used open-source database. *PgBouncer* is a "connection
pooler" that lets many short-lived app instances share a small number of database
connections efficiently.
**In Navio:** an optional PostgreSQL database stores the editable instructions and a
consent-gated conversation log; the *PgBouncer* port (6432) is used so serverless
instances don't exhaust the database.

### Rate limiting
Capping how many requests a single visitor can make in a period, to prevent abuse
and runaway costs.
**In Navio:** e.g. 15 requests/minute and 300/day per visitor (`slowapi`),
optionally shared across instances via *Redis*.

### React / Vite
*React* is a popular library for building interactive web interfaces. *Vite* is the
fast build tool that bundles a React app for the browser.
**In Navio:** the frontend is React 19 built with Vite.

### Redis
A very fast in-memory data store, often used for counters and caches.
**In Navio:** optional — when multiple backend copies run at once, Redis keeps the
*rate-limit* counters consistent across all of them.

### Reverse proxy (Caddy / nginx)
A "front door" server that receives all web traffic and forwards each request to the
right internal service, often handling HTTPS encryption.
**In Navio:** *Caddy* plays this role in the single-server (*VPS*) setup;
*nginx* serves the static frontend.

### Salesforce / CaseHandler flow
*Salesforce* is a widely-used customer-relationship (CRM) platform. A "flow" is an
automated process inside it; *CaseHandler* is the one that creates support cases.
**In Navio:** the *Navio Plus* contact form sends submissions into SportNavi's
Salesforce via the CaseHandler flow (`backend/salesforce.py`).

### Secret Manager
A secure vault for storing passwords and private keys, separate from the code and
configuration.
**In Navio:** on Cloud Run, the AI key, database URL, and Clerk key live in Google
Secret Manager — never in the code or in plain config files.

### SPA (Single-Page Application)
A website that loads once and then updates the view in the browser without full page
reloads.
**In Navio:** the showcase/admin website is an SPA with a tiny hash-based router
(`frontend/src/lib/router.ts`).

### Shadow DOM
A browser feature that "seals" a component so the host page's styles can't leak in
and its styles can't leak out.
**In Navio:** the embeddable widget mounts inside a Shadow DOM so it looks correct on
any SportNavi page regardless of that page's styling (`frontend/src/embed/widget.tsx`).

### Stateless service
A server that keeps no memory of past requests between calls — every request carries
everything needed to handle it.
**In Navio:** the backend is stateless; the browser sends the recent chat history
with each message. This is what lets many copies run in parallel and scale freely.

### System prompt
The hidden instruction set that tells the AI engine who it is, how to behave, and
what facts it may use.
**In Navio:** defines Navio's personality, tone, languages, brand spelling, and the
embedded knowledge base (`backend/prompts/SYSTEM_PROMPT.md`). It is editable by
admins.

### Turnstile (Cloudflare)
A privacy-friendly "are you human?" check, an alternative to traditional CAPTCHAs.
**In Navio:** optional bot protection — when enabled, a visitor must pass it before a
chat *session* is granted.

### VPS (Virtual Private Server)
A single rented Linux computer in the cloud that you manage yourself.
**In Navio:** the documented **alternative** to Cloud Run — run the whole stack on
one server with *Docker Compose* and *Caddy*.

---

**Next:** [Product Architecture](01-product-architecture.md)
