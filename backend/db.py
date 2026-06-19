"""
Postgres access for Navio — editable config + conversation logging.

Talks to a standard PostgreSQL database (e.g. Azure Database for PostgreSQL
Flexible Server) over a pooled psycopg (v3) connection. This replaces the
previous Supabase / PostgREST layer; the data model is unchanged — see
sql/schema.sql for the table definitions to run once on the server.

Deliberately OPTIONAL: when DATABASE_URL is unset, ``db_enabled()`` is False and
every function is a safe no-op, so the app boots and chats fine with no database
configured (config then falls back to the on-disk SYSTEM_PROMPT.md).

We store NO leads and NO bookings — only:
  - bot_config     : one row (id='navio') holding the editable system prompt
  - conversations  : one row per /api/chat request — full text (consent-gated) + metrics

Works with any standard Postgres host. Two common ones, both via a connection
pooler so a serverless / multi-instance backend never exhausts Postgres connections:

  Supabase (transaction pooler, port 6543 — best for Vercel/serverless):
    postgresql://postgres.<project-ref>:PASSWORD@aws-0-<region>.pooler.supabase.com:6543/postgres
  Azure Database for PostgreSQL (PgBouncer, port 6432):
    postgresql://navioadmin:PASSWORD@navio-pg-xxxx.postgres.database.azure.com:6432/postgres?sslmode=require

A *transaction* pooler (Supabase 6543 / Azure PgBouncer) reuses one server
connection across clients and does not support server-side prepared statements, so
we disable psycopg's auto-prepare below (``prepare_threshold = None``). That keeps
the SAME DATABASE_URL working on a direct connection, a session pooler, OR a
transaction pooler — no per-host code paths.
"""

from __future__ import annotations

import hashlib
import os

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

_DSN = os.getenv("DATABASE_URL", "").strip()
_TIMEOUT = float(os.getenv("DB_TIMEOUT_SEC", "5"))

# Salt for hashing client IPs. We never store a raw IP (GDPR) — only sha256(salt+ip).
# Falls back to SESSION_SECRET, then a constant, so behaviour is deterministic in dev.
_SALT = (
    os.getenv("IP_HASH_SALT", "") or os.getenv("SESSION_SECRET", "") or "navio-ip-salt"
).encode()

CONFIG_ID = "navio"

# Conversation-row columns, in insert order. Kept explicit so a caller dict with
# extra/missing keys can never desync the parameterised INSERT below.
_CONV_KEYS = (
    "session_id",
    "bot_id",
    "consent",
    "user_message",
    "assistant_reply",
    "history_len",
    "latency_ms",
    "prompt_tokens",
    "completion_tokens",
    "total_tokens",
    "model",
    "finish_reason",
    "ip_hash",
)

_INSERT_CONVERSATION = f"""
insert into conversations ({", ".join(_CONV_KEYS)})
values ({", ".join(f"%({k})s" for k in _CONV_KEYS)})
"""

# Lazily-created connection pool. min_size=0 so an unconfigured or briefly
# unreachable database never blocks startup; connections open on demand and are
# reused across requests (cheap, and friendly to serverless + PgBouncer).
_pool: ConnectionPool | None = None


def db_enabled() -> bool:
    """True when a database connection string is configured."""
    return bool(_DSN)


def _configure(conn) -> None:
    """Run once per new pooled connection. Disable psycopg's automatic server-side
    prepared statements so the same DATABASE_URL works behind a TRANSACTION pooler
    (Supabase 6543 / Azure PgBouncer), which reuses server connections across
    clients and would otherwise error on a prepared statement it never saw. The
    queries here are tiny and infrequent, so skipping preparation costs nothing."""
    conn.prepare_threshold = None


def _get_pool() -> ConnectionPool | None:
    """Return the shared pool, creating it on first use. None when no DATABASE_URL."""
    global _pool
    if not _DSN:
        return None
    if _pool is None:
        _pool = ConnectionPool(
            _DSN,
            min_size=0,
            max_size=int(os.getenv("DB_POOL_MAX", "5")),
            timeout=_TIMEOUT,
            kwargs={"connect_timeout": int(_TIMEOUT)},
            configure=_configure,
            open=True,
        )
    return _pool


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
    pool = _get_pool()
    if pool is None:
        return
    try:
        params = {k: row.get(k) for k in _CONV_KEYS}
        with pool.connection() as conn:
            conn.execute(_INSERT_CONVERSATION, params)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Editable config (system prompt) — replaces the on-disk writes
# ---------------------------------------------------------------------------
def fetch_config() -> dict | None:
    """Return the single bot_config row, or None if missing / unavailable."""
    pool = _get_pool()
    if pool is None:
        return None
    try:
        with pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "select system_prompt, updated_at from bot_config where id = %s",
                (CONFIG_ID,),
            )
            return cur.fetchone()
    except Exception:
        return None


def seed_config(system_prompt: str) -> None:
    """Insert the initial config row from the on-disk seed. ON CONFLICT DO NOTHING
    so we never clobber a live edit (callers only seed when fetch_config() was None)."""
    pool = _get_pool()
    if pool is None:
        return
    try:
        with pool.connection() as conn:
            conn.execute(
                "insert into bot_config (id, system_prompt) values (%s, %s) "
                "on conflict (id) do nothing",
                (CONFIG_ID, system_prompt),
            )
    except Exception:
        pass


def update_config_field(field: str, value: str) -> bool:
    """Persist one config field (system_prompt). Returns success."""
    if field not in ("system_prompt",):
        raise ValueError(f"unknown config field: {field!r}")
    pool = _get_pool()
    if pool is None:
        return False
    try:
        with pool.connection() as conn:
            # `field` is whitelisted above, so interpolating the identifier is safe;
            # the value is always passed as a bound parameter.
            conn.execute(
                f"update bot_config set {field} = %s where id = %s",
                (value, CONFIG_ID),
            )
        return True
    except Exception:
        return False
