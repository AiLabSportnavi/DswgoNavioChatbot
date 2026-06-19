# 03 · Frontend Architecture

> **Audience:** Frontend engineers. How the web application and the embeddable widget
> are structured — components, state, UX, the API contract, and how it scales.
> **Last reviewed:** 2026-06-18 · **Owner:** AI Lab (ncr4ailab.de)

Terms are defined in the [Glossary](00-glossary.md). Source of truth: `frontend/`.

---

## 1. Overview

The frontend is a **React 19 + Vite** TypeScript project (`frontend/package.json`)
that produces **two distinct deliverables from one codebase**:

| Build target          | Command                | Output         | What it is                                                            |
| --------------------- | ---------------------- | -------------- | -------------------------------------------------------------------- |
| **Showcase / Admin SPA** | `npm run build`     | `dist/`        | The marketing/landing site, the chatbot gallery (hub), bot detail pages, and the admin prompt editor. |
| **Embeddable widget** | `npm run build:widget` | `dist-widget/` | A standalone chat bubble that any SportNavi page loads with one `<script>` tag. |

**Stack:** React 19, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), `motion` for
animation, `react-markdown` + `remark-gfm` for rendering replies, and
`@clerk/clerk-react` for admin sign-in.

---

## 2. Structure & component organization

Components live in `frontend/src/components/`, grouped here by responsibility. Pages
live in `frontend/src/pages/`, shared helpers in `frontend/src/lib/`, and the data
that defines each bot in `frontend/src/data/`.

```
frontend/src/
├── main.tsx               App entry (SPA)
├── App.tsx                Top-level shell + routing wiring
├── pages/                 Landing.tsx · Hub.tsx · BotDetail.tsx
├── components/            (grouped below)
├── lib/
│   ├── api.ts             The single API client (chat, config, contact)
│   └── router.ts          Tiny zero-dependency hash router
├── data/
│   └── bots.ts            Bot definitions (persona, greeting, contact-form options)
└── embed/
    └── widget.tsx         Embeddable-widget entry (Shadow DOM mount)
```

### Component groups

| Group              | Components                                                                 | Responsibility                                                            |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Widget shell**   | `ChatWidget`                                                              | The floating launcher → greeting → chat panel; anchors to viewport or a parent; dispatches to the right flow per `bot.flow`. |
| **Conversation**   | `NavioChat`, `NavioMenuChat`, `Markdown`                                  | The chat window (consent gate, messages, quick replies, typing indicator, header controls), the Navio Plus menu wrapper, and Markdown rendering of replies. |
| **Contact**        | `KontaktForm`, `NavioMenu`                                                | The Navio Plus contact form and the FAQ/contact menu layout.             |
| **Admin**          | `ConfigEditor`, `DetailSidebar`                                           | Edit the system prompt (Clerk-gated) and view bot details.               |
| **Showcase / marketing** | `Hero`, `Features`, `Showcase`, `Navbar`, `Footer`, `ChatbotCard`, `CopyEmbed`, `RobotBrain` | The landing/gallery site and the developer embed snippet. |
| **Primitives**     | `icons.tsx`, `widgetThemes.ts`, `PillButton`, `GhostPill`                | Shared SVG icons, widget theming, and small UI atoms.                    |

### Conventions
- **One component per file**, named in `PascalCase.tsx`; co-locate component-specific
  helpers in the same file.
- **Data, not branches, drives bots.** New personas are added to `bots.ts`; components
  read from the `Chatbot` type rather than hard-coding bot logic.
- **The API client is the only place that talks to the backend** (`lib/api.ts`).
  Components never call `fetch` directly.

---

## 3. Routing

Routing is a **tiny zero-dependency hash router** (`lib/router.ts`), deliberately
chosen over a routing library for a small SPA:

| Hash route          | View                          |
| ------------------- | ----------------------------- |
| `#/`                | Landing page                  |
| `#/chatbots`        | Hub gallery                   |
| `#/chatbots/<id>`   | Bot detail / preview          |

Hash routing means the static host needs no server-side route rewrites for the SPA
(any path resolves to `index.html`), which keeps both the nginx and Cloud Run static
hosting trivial.

---

## 4. State management

**Decision:** No global state library (no Redux/Zustand). State is local React hooks,
and the backend is the source of truth for prompt/config.

| State                | Where it lives                                  | Lifetime                          |
| -------------------- | ----------------------------------------------- | --------------------------------- |
| Chat messages        | Component state in `NavioChat`                   | Per open session; reset on reload |
| Consent given        | Component state (gates the input)                | Per session                       |
| System prompt (admin)| Fetched once via `getConfig()`                   | Until reload                      |
| API base URL         | Module variable in `lib/api.ts`                  | Set at runtime by the widget      |
| Current route        | `useRoute()` hook over the URL hash              | Follows the URL                   |

**Why no store:** the app has no cross-view shared mutable state that justifies the
complexity. Each conversation is self-contained; a browser reload starting a fresh
session is acceptable (and privacy-friendly).

**When to introduce a store (criteria):** add a lightweight store only if one of these
becomes true — (a) conversations must persist across reloads or views, (b) multiple
distant components must share and mutate the same live state, or (c) an authenticated
multi-screen admin area grows beyond the single editor. Until then, local state is the
simpler, more maintainable choice.

---

## 5. User-experience considerations

The conversation UX is designed around trust and clarity (`NavioChat`,
`NavioMenuChat`):

- **Consent gate first.** The Datenschutz notice (from each bot's `privacy` config in
  `bots.ts`) is shown before any message; the input stays disabled until the visitor
  agrees — matching the backend's consent-gated logging.
- **Always-visible privacy link.** A link to the live SportNavi Datenschutz page
  remains in the footer throughout.
- **Quick replies** seed common questions ("Angebote finden", "Wie checke ich ein?",
  "Partner werden", "Sportnavi für Firmen") from `bot.quickReplies`.
- **Typing indicator** while awaiting the model.
- **Markdown replies** rendered safely via `react-markdown` + `remark-gfm`.
- **Friendly error bubbles** — backend errors (rate limit, unavailable) surface as in-
  chat messages, never raw failures (`api.ts` parses `detail` and handles 429).
- **Two widget placement modes** — anchored to the viewport (`fixed`) for production,
  or contained within a parent for demos on the showcase pages.
- **Multilingual** — the visitor writes in any language and Navio replies in it; there
  is no language switch to manage.

---

## 6. The API contract (`lib/api.ts`)

`lib/api.ts` is the single, typed client between frontend and backend. It mirrors the
backend's input caps so the browser never sends an over-limit payload.

| Function                          | Calls                                  | Notes                                                                 |
| --------------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| `sendChat(message, history, opts)`| `POST /api/chat`                       | Trims message to `MAX_MESSAGE_CHARS` (2000) and history to the last 10 turns; sends `consent: true` (it is only called past the gate); handles 429 + error `detail`. |
| `getConfig(signal)`               | `GET /api/config`                      | Returns the current system prompt + whether admin auth is required.   |
| `saveSystemPrompt(content, token)`| `POST /api/config/system-prompt`       | Sends the Clerk session JWT as `Authorization: Bearer <jwt>`; maps 401/403 to readable messages. |
| `submitContact(payload, signal)`  | `POST /api/contact`                    | Navio Plus contact form → backend → Salesforce (server-side).         |

**Backend origin resolution:**
- **Dev:** `VITE_NAVIO_API` is unset, so requests are relative (`/api/chat`) and Vite
  proxies them to `http://127.0.0.1:8000` (`vite.config.ts`) — same-origin, no CORS.
- **Production SPA:** set `VITE_NAVIO_API` to the backend origin for absolute URLs.
- **Embeddable widget:** `setApiBase(url)` is called at runtime. The widget prefers an
  explicit `data-api` attribute on its `<script>` tag, otherwise derives the backend
  origin from the script's own URL — so the embed "just works" wherever it is hosted
  (`embed/widget.tsx`).

---

## 7. The embeddable widget (isolation model)

`embed/widget.tsx` is what makes Navio droppable into any page without breaking:

- It mounts into a **Shadow DOM** host pinned to the viewport, so **the host page's CSS
  cannot reach in and the widget's CSS cannot leak out**.
- Tailwind's `:root` theme variables are remapped to `:host` so they resolve inside the
  shadow root; the Google Fonts `@import` is lifted to a document-level `<link>` so it
  cascades in.
- It guards against double-loading and re-enables pointer events only for the widget
  region (the rest of the fixed overlay is click-through).
- It reads an optional `data-policy-url` to point the consent link at the right privacy
  page.

This is why the widget is built as a **separate target** (`build:widget`) — it is a
self-contained IIFE bundle, not part of the SPA.

---

## 8. Scalability & maintainability

- **Bot-as-data** (`bots.ts`) is the primary extension point: new personas, greetings,
  quick replies, and contact-form picklists are data edits, not new components.
  *Important:* the contact-form `grundOptions`/`themaOptions` must be the **exact**
  Salesforce picklist values — they are sent verbatim to the flow.
- **Single API client** keeps backend coupling in one file; a contract change touches
  `api.ts` only.
- **Two build targets** keep the heavyweight SPA and the lightweight embeddable widget
  independent — the widget stays small for third-party pages.
- **Theming** is centralized in `widgetThemes.ts`.
- **Env strategy:** `VITE_NAVIO_API` selects the backend origin; the **public** Clerk
  key lives in `frontend/.env.production` (publishable keys are safe to commit — see
  [Project Structure → Environments](06-project-structure.md#5-environment-file-organization)).

---

## 9. What triggers a doc update

Update this document when: a component group changes, the routing model changes, the
API client contract changes, or the widget isolation approach changes. See
[Documentation Standards → Update triggers](07-documentation-standards.md#5-update-triggers).

---

**Next:** [Infrastructure & Deployment](04-infrastructure-deployment.md) ·
[Product Architecture](01-product-architecture.md)
