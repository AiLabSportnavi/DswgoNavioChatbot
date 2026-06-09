---
name: stitch-sportnavi-hub
description: Stitch project + screen IDs for the Sportnavi Hub landing/home design
metadata:
  type: reference
---

Stitch design work for the "Sportnavi Hub" (a hub on sportnavi.de hosting multiple embeddable chatbot versions like Navio).

- Stitch project: `projects/1571333331168721257` (title "Sportnavi Hub — Landing + Chatbot Hub")
- Landing page screen: `cdb10d5f533543318fa1a300df42ba81`
- Hub/Chatbots gallery screen: `66256be62139490584f547f7c86546e5`
- Chatbot detail/preview screen (sidebar + slide deck): `508057c179244625b9607261cbf159ca`
- Clover icon asset (SVG): `6495cd0c4a334e7e98f7c0e9f464c5ff`

Downloaded HTML + screenshots live in `.stitch/designs/` (landing, hub, detail — each .html/.png).

Detail page = opened from a card's "preview" button. Layout: sticky left white sidebar (back link, Navio identity, slide navigator [overview/capabilities/live demo/how it works/embedding], GitHub repo card, embed snippet) + main scroll-snap slide deck. Stitch rendered the shell + overview slide; the other 4 slides authored in React.

Brand system to keep: brand-green `#9fff00` (sparing accent only), light base `#EDEEF5`, ink `#1a1a1a`, white cards, Outfit (display) + Inter (body), lowercase nav, rounded-full pills, glassmorphic header, four-petal clover mark. Frontend is React 19 + Vite + Tailwind v4 + Motion in `frontend/`.

Use `mcp__stitch__edit_screens` with these IDs for iteration.
