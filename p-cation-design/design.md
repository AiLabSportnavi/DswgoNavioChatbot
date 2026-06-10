# P-CATION / LIVOI — Design System

> Reverse-engineered design documentation for **https://p-cation.de/**
> Captured 2026-06-09. Source: live site inspection (computed styles + screenshots).

P-CATION is a German B2B consultancy selling **LIVOI**, a GDPR-compliant ("DSGVO-konform")
AI assistant for the Mittelstand (mid-sized companies). The site's job is trust: it sells a
serious, regulated AI product to risk-averse business owners. The design language reflects
that — clean, bright, corporate-tech, heavy on proof (certifications, sources, testimonials)
and light on hype.

---

## 1. Brand Personality

| Trait | How the design expresses it |
|---|---|
| **Trustworthy / regulated** | DSGVO + EU-AI-Act badges, "Hosted in Germany", source citations on every claim |
| **Modern / technical** | Geometric `Exo 2` typeface, bright electric-blue accent, subtle gradients |
| **Approachable** | Friendly robot mascot, conversational German ("Jeder spricht über KI…"), WhatsApp-green chat entry |
| **Premium B2B SaaS** | Generous whitespace, soft shadows, rounded cards, restrained palette |

Tone of voice: direct, plain-German, no jargon. Headlines are short questions and promises
("Wir ändern das.", "Bevor Sie investieren, schaffen wir Klarheit.").

---

## 2. Color Palette

The palette is a **monochrome blue + neutral slate** system. One saturated brand blue carries
all the energy; everything else is slate gray on white. Color values harvested from computed
styles (the site mixes `rgb`, `oklch` slate scale, and tinted overlays).

### Brand (primary)

| Token | Hex | Usage |
|---|---|---|
| `brand-500` | `#0D9DDB` | Primary brand blue — buttons, links, accents, icons |
| `brand-600` | `#0B8AC2` | Hover / gradient mid-stop |
| `brand-700` | `#086E9C` | Gradient end, pressed state |
| `brand-800` | `#065A80` | Deep blue, dark UI accents |

The primary CTA uses a **left-to-right blue gradient** (`#0D9DDB → #086E9C`) on a fully-rounded
pill, often paired with a circular WhatsApp-green glyph.

### Brand tints (backgrounds)

| Token | Hex | Usage |
|---|---|---|
| `brand-50` | `#EDF8FF` | Section / card wash, icon chips |
| `brand-100` | `#D6EFFF` | Hover wash, soft fills |
| `brand-glow` | `rgba(13,157,219,0.2–0.3)` | Focus rings, soft glows behind cards |

### Neutrals (slate scale — Tailwind `slate`)

| Token | Approx hex | oklch (as found) | Usage |
|---|---|---|---|
| `slate-900` | `#0F172A` | `rgb(15,23,42)` | Primary text, headings |
| `slate-800` | `#1E293B` | `oklch(0.279 0.041 260)` | Dark surfaces |
| `slate-700` | `#334155` | `oklch(0.372 0.044 257)` | Body text strong |
| `slate-600` | `#475569` | `oklch(0.446 0.043 257)` | Secondary text |
| `slate-500` | `#64748B` | `oklch(0.554 0.046 257)` | Muted text, labels |
| `slate-400` | `#94A3B8` | `oklch(0.704 0.04 257)` | Placeholder, icons |
| `slate-200` | `#E2E8F0` | `oklch(0.929 0.013 256)` | Borders, dividers |
| `slate-100` | `#F1F5F9` | `oklch(0.968 0.007 248)` | Card / section backgrounds |
| `slate-50`  | `#F8FAFC` | `oklch(0.984 0.003 248)` | Page section wash |
| `white`     | `#FFFFFF` | — | Base background, cards |

### Semantic accents

| Token | Hex | Usage |
|---|---|---|
| `success` | `#25D366` | WhatsApp green on chat CTA / contact |
| `mascot-orange` | `#EC6607`* | Robot mascot accent (warm highlight) |

\* approximate — read from the mascot illustration, not a UI token.

---

## 3. Typography

| Property | Value |
|---|---|
| **Primary family** | `"Exo 2", "Trebuchet MS", "Segoe UI", sans-serif` |
| **Character** | Geometric, slightly condensed, techy — reads modern + engineered |
| **Body color** | `#0F172A` (slate-900) |
| **Heading color** | `#0F172A` on light, `#FFFFFF` on dark/photo hero |

### Type scale (observed)

| Role | Size | Weight | Notes |
|---|---|---|---|
| Hero H1 | `72px` (≈4.5rem) | `700` | Bold, tight leading, white over photo |
| Section H2 | ~`36–44px` | `700` | Slate-900, often a short statement |
| Card / sub H3 | ~`20–24px` | `600–700` | |
| Body | `16–18px` | `400` | slate-600/700, relaxed line-height |
| **Eyebrow label** | `12–13px` | `600` | **UPPERCASE, wide letter-spacing, brand-blue** — e.g. `SICHERHEIT`, `INTEGRATIONEN`, `BRANCHE` |
| Small / meta | `12–14px` | `400–500` | slate-400/500 |

The **uppercase letter-spaced blue eyebrow** above each section heading is a signature pattern.

---

## 4. Layout & Spacing

- **Container:** centered, ~max-width 1200–1280px, generous side gutters.
- **Rhythm:** large vertical section padding (≈80–120px) — the page breathes.
- **Grid:** responsive card grids (integrations, industries, pricing) collapse to single column on mobile.
- **Alignment:** section headers center-aligned; content blocks often two-column (text + visual) on desktop, stacked on mobile.
- **Carousels:** industry references + step process use horizontal carousels with circular arrow buttons and dot pagination.

### Breakpoints (Tailwind-style, inferred)

| Name | Width |
|---|---|
| mobile | 375px (single column, stacked nav → hamburger) |
| tablet | 768px |
| desktop | 1280px+ |

---

## 5. Components

### Buttons
- **Primary:** fully-rounded **pill**, blue gradient (`#0D9DDB → #086E9C`), white text, soft blue glow shadow. Often has a leading circular icon (WhatsApp green).
- **Secondary / outline:** pill, white fill, slate border, slate text → blue on hover.
- **Ghost / link:** brand-blue text with `→` arrow ("Mehr erfahren →", "Weiter scrollen").

### Cards
- White surface, `border: 1px solid slate-200`, **large border-radius (16–24px)**, soft diffuse shadow.
- Light-blue (`#EDF8FF`) inner chips for icons/logos.
- Used for: integrations, industry references, testimonials, pricing, security panels.

### Navigation (top bar)
- Sticky, white/translucent, `//P-CATION` wordmark left.
- Center: dropdown menu items (Produkte, Referenzen, Über uns…).
- Right: **dark/light mode toggle** (sun/moon) + primary pill CTA ("KI-Einschätzung erhalten").

### Badges / trust chips
- Pill or rounded-rect, light fill, small icon + label: `DSGVO Konform`, `EU-KI-Verordnung`, `Gehostet in Deutschland`.

### Chat widget (LIVOI assistant)
- Fixed bottom-right card with **robot mascot** illustration peeking out.
- Greeting copy + two stacked CTAs: blue "Mit LIVOI reden" + outline "Gespräch vereinbaren".
- Dismiss `×`. This is the product's signature surface.

### Pricing cards
- Two side-by-side cards (Standard `ab 49 EUR`, Pilotphase `499 EUR`), feature checklist with check glyphs, pill CTA each.

### Source-citation panel (security section)
- Mock chat answer with numbered **"Quellen"** (sources) + a `92%` confidence bar — visual proof of "nachvollziehbar statt generisch" (traceable, not generic).

---

## 6. Iconography & Imagery

- **Icons:** thin-line / duotone, slate or brand-blue, housed in rounded chips.
- **Logos:** integration partners (WhatsApp, Teams, OpenAI, DATEV, Gmail, Drive…) in white rounded squares.
- **Photography:** hero uses a desaturated, blue-graded photo of a person at a workstation — human + warm, overlaid with a dark gradient for text contrast.
- **Mascot:** friendly blue/orange robot character used in chat and section accents — humanizes the AI.

---

## 7. Motion (observed / inferred)

- Smooth scroll, "Weiter scrollen" / "Nach rechts scrollen" prompts.
- Carousel slide transitions with arrow + dot controls.
- Hover: buttons lift/deepen gradient; cards raise shadow; links shift to brand-blue.
- Subtle entrance reveals on scroll for sections (fade/slide-up — standard for this style).

---

## 8. Theming

- **Light mode** is default (white base, slate text).
- A **dark-mode toggle** exists in the nav (sun/moon). Hero already runs dark over the photo.
- Brand blue is the constant across both modes.

---

## 9. Quick Reference (copy-paste tokens)

```css
:root {
  /* Brand */
  --brand-50:  #EDF8FF;
  --brand-100: #D6EFFF;
  --brand-500: #0D9DDB;
  --brand-600: #0B8AC2;
  --brand-700: #086E9C;
  --brand-800: #065A80;

  /* Neutrals (slate) */
  --slate-900: #0F172A;
  --slate-700: #334155;
  --slate-600: #475569;
  --slate-500: #64748B;
  --slate-400: #94A3B8;
  --slate-200: #E2E8F0;
  --slate-100: #F1F5F9;
  --slate-50:  #F8FAFC;
  --white:     #FFFFFF;

  /* Semantic */
  --success-green: #25D366;
  --mascot-orange: #EC6607;

  /* Type */
  --font-sans: "Exo 2", "Trebuchet MS", "Segoe UI", sans-serif;

  /* Shape */
  --radius-card: 20px;
  --radius-pill: 9999px;

  /* Gradient */
  --grad-primary: linear-gradient(90deg, #0D9DDB 0%, #086E9C 100%);
}
```

---

## 10. Screenshots

| File | Shows |
|---|---|
| `screenshots/01-hero-viewport.png` | Hero — dark photo, white H1, pill CTAs |
| `screenshots/02-fullpage.png` | Full landing page (long) |
| `screenshots/03-section-livoi.png` | Integrations + security source-citation cards + chat widget |
| `screenshots/04-section-security.png` | Industry reference carousel + testimonial card |
| `screenshots/responsive-mobile.png` | 375px mobile layout |
| `screenshots/responsive-tablet.png` | 768px tablet layout |
| `screenshots/responsive-desktop.png` | 1280px desktop layout |
| `design-card.html` / `design-card.png` | One-page visual design card (palette + type + components) |
