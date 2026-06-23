# Navio Knowledge Base — v2

This folder holds the **v2** Sportnavi chatbot system prompt (`SYSTEM_PROMPT_V2.md`), a consolidated,
fact-corrected rewrite of the original prompt.

- **Canonical file (used by the app):** [`backend/prompts/SYSTEM_PROMPT_V2.md`](../../backend/prompts/SYSTEM_PROMPT_V2.md)
- **Review copy (this folder):** [`SYSTEM_PROMPT_V2.md`](./SYSTEM_PROMPT_V2.md) — identical content, kept here for review/version history.
- **v1 (unchanged, rollback):** [`backend/prompts/SYSTEM_PROMPT.md`](../../backend/prompts/SYSTEM_PROMPT.md)

> The two copies are kept in sync manually. `backend/prompts/SYSTEM_PROMPT_V2.md` is the source of truth;
> re-copy it here if you edit it.

---

## Why v2 exists

The chatbot was answering several questions wrong. Root cause: the v1 knowledge base was **5 stacked,
heavily overlapping documents** (~1,485 lines), two of which were explicitly labelled *"Inferred"* and
contained fabricated facts the model repeated as truth.

A Sportnavi staff review (Marina Schnitker, 2026-06-23 — see
[`docs/feedback/Feedback Chatbot.docx`](../feedback/Feedback%20Chatbot.docx)) tested the bot's real
answers and left **10 authoritative corrections**. v2 applies all of them and rebuilds the KB into one
clean, deduplicated source.

---

## The 10 corrections applied (Sportnavi = source of truth)

| # | Topic | v1 was wrong | v2 now says |
|---|-------|--------------|-------------|
| 0 | Tarif **downgrade** | effective next month / "by the 20th" | effective the **month after next** (übernächster Monatserster) |
| 1 | **Mid-month signup** | full monthly fee | **pro-rated** (anteilig) + prompt debit |
| 2 | **Pause on 3-Sterne** | not possible (only 4/5★) | **possible on all private tariffs (3/4/5★)** |
| 3 | Pause request channel | email only | email **or website pause form** |
| 4 | Pause deadline | "ask support" | **by the 15th of the previous month** |
| 5 | **Firmenfitness cancellation** | employer only | **member can also cancel** |
| 6 | Company onboarding contact | email/phone only | **website "Für Unternehmen" form** (+ email/phone) |
| 7 | **Invoice for private fees** | "sure, no problem" | **no invoices**; proof = Aufnahmeantrag + Buchungsbestätigung/Kontoauszug; *Mitgliedsbestätigung* on request |
| 8 | Voucher delivery | "link + code in voucher" | **code communicated by email** |
| 9 | Voucher redemption | "link in voucher" | link **in the email or via website** |

---

## v1 → v2 structural changes

- **Deleted `doc1`** — a broken web-scrape (HTML entities, dangling links, a question with no answer);
  fully superseded by the cleaner `doc2`.
- **Merged** the clean member FAQ (`doc2`) + English partner FAQ (`doc3`) into one KB organised by
  audience + topic (Members / Membership / App & Check-in / Cashback & Vouchers / Fitness-Check /
  Companies / Partners).
- **Pruned the two "inferred" docs** (`doc4`, `doc5`) — kept only facts corroborated by the real source
  docs or the staff feedback; deleted contradicted claims (e.g. "3★ can't pause"); softened
  uncorroborated specifics (e.g. "tablets unsupported" → "for smartphones").
- **Added a binding `HARTE FAKTEN` table** at the top — one authoritative line per number/deadline, so
  the model has a single source of truth and can't blend conflicting copies.
- **Added behavior rule #7** (Abrechnung, Fristen & Wirksamkeitsdaten): for billing/proration/invoice/
  effective-date questions, answer only from KB facts, else defer to the team. This is what stopped the
  "full month" (#1) and "invoice yes" (#7) hallucinations.
- **Net-new facts** added where the staff feedback supplied them: pro-rated start month, no-invoice rule,
  SEPA chargeback handling, member self-cancellation, Wunschpartner form, online-courses-during-pause.
- **Size:** ~55% fewer lines / ~60% fewer characters than v1 — the full prompt ships on every
  `/api/chat` request, so this is a direct latency + cost win.

## Verification status

- ✅ All 10 corrections present; no old/contradicted facts remain (table consistent with body).
- ✅ All 9 staff test questions now produce the corrected answers.
- ✅ German language + Markdown formatting clean; brand spelling "Sportnavi" enforced.
- ✅ Completeness check vs v1: no material fact lost (Wunschpartner gap was found and added back).

---

## How to load v2 into the database (so the live web bot uses it)

The live web bot reads `bot_config.system_prompt` from the **database**, not from the file. Editing the
file alone does **not** change production. To switch the live bot to v2, pick one:

### Option A — Admin Config Editor (no code, reversible)
1. Open the admin Config Editor in the app.
2. Paste the full contents of `backend/prompts/SYSTEM_PROMPT_V2.md`.
3. Save → it writes to the DB via `POST /api/config/system-prompt`.

### Option B — One-off script (writes to `DATABASE_URL`)
```python
# run from backend/, with the backend venv + DATABASE_URL set
from pathlib import Path
import db
content = Path("prompts/SYSTEM_PROMPT_V2.md").read_text(encoding="utf-8")
db.update_config_field("system_prompt", content)
```

**Rollback:** paste v1 (`backend/prompts/SYSTEM_PROMPT.md`) back into the Config Editor, or re-run the
script pointing at the v1 file. The v1 file is never modified.
