"""
Supabase access for Navio — editable config + conversation logging.

Talks to Supabase over its PostgREST REST API using the service-role key
(server-only; bypasses Row-Level Security). Deliberately OPTIONAL: when
SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is unset, ``supabase_enabled()`` is
False and every function is a safe no-op, so the app boots and chats fine
without Supabase configured (config then falls back to the on-disk files).

This replaces the old local Postgres/SQLAlchemy layer. We store NO leads and NO
bookings anymore — only:
  - bot_config     : one row (id='navio') holding the editable system prompt
  - conversations  : one row per /api/chat request — full text (consent-gated) + metrics

See schema.sql for the table definitions to run once in the Supabase SQL editor.
"""

from __future__ import annotations

import hashlib
import os

import httpx

_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
_REST = f"{_URL}/rest/v1" if _URL else ""
_TIMEOUT = float(os.getenv("SUPABASE_TIMEOUT_SEC", "5"))

# Salt for hashing client IPs. We never store a raw IP (GDPR) — only sha256(salt+ip).
# Falls back to SESSION_SECRET, then a constant, so behaviour is deterministic in dev.
_SALT = (
    os.getenv("IP_HASH_SALT", "") or os.getenv("SESSION_SECRET", "") or "navio-ip-salt"
).encode()

CONFIG_ID = "navio"


def supabase_enabled() -> bool:
    """True when both the project URL and the service-role key are configured."""
    return bool(_URL and _KEY)


def _headers(extra: dict | None = None) -> dict:
    h = {
        "apikey": _KEY,
        "Authorization": f"Bearer {_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def hash_ip(ip: str | None) -> str | None:
    """Stable, non-reversible IP fingerprint for abuse analysis — never the raw IP."""
    if not ip:
        return None
    return hashlib.sha256(_SALT + ip.encode()).hexdigest()[:32]


# ---------------------------------------------------------------------------
# Conversation logging (fire-and-forget — must NEVER raise into the chat path)
# ---------------------------------------------------------------------------
def log_conversation(row: dict) -> None:
    """Insert one conversation row. Swallows every error: monitoring must never
    degrade the user experience or crash the request."""
    if not supabase_enabled():
        return
    try:
        httpx.post(
            f"{_REST}/conversations",
            headers=_headers({"Prefer": "return=minimal"}),
            json=row,
            timeout=_TIMEOUT,
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Editable config (system prompt + Datenschutz) — replaces the on-disk writes
# ---------------------------------------------------------------------------
def fetch_config() -> dict | None:
    """Return the single bot_config row, or None if missing / unavailable."""
    if not supabase_enabled():
        return None
    try:
        resp = httpx.get(
            f"{_REST}/bot_config",
            headers=_headers(),
            params={"id": f"eq.{CONFIG_ID}", "select": "system_prompt,updated_at"},
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        rows = resp.json()
        return rows[0] if rows else None
    except Exception:
        return None


def seed_config(system_prompt: str) -> None:
    """Insert the initial config row from the on-disk seed (upsert by id, no-op if
    a row already exists thanks to merge-duplicates → we never clobber live edits
    because callers only seed when fetch_config() returned None)."""
    if not supabase_enabled():
        return
    try:
        httpx.post(
            f"{_REST}/bot_config",
            headers=_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
            json={"id": CONFIG_ID, "system_prompt": system_prompt},
            timeout=_TIMEOUT,
        )
    except Exception:
        pass


def update_config_field(field: str, value: str) -> bool:
    """Persist one config field (system_prompt). Returns success."""
    if field not in ("system_prompt",):
        raise ValueError(f"unknown config field: {field!r}")
    if not supabase_enabled():
        return False
    try:
        resp = httpx.patch(
            f"{_REST}/bot_config",
            headers=_headers({"Prefer": "return=minimal"}),
            params={"id": f"eq.{CONFIG_ID}"},
            json={field: value},
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        return True
    except Exception:
        return False
