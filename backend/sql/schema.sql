-- =============================================================================
-- Navio — PostgreSQL schema for Azure Database for PostgreSQL (Flexible Server).
-- Run ONCE against the server, e.g.:
--   psql "host=navio-pg-xxxx.postgres.database.azure.com port=5432 dbname=postgres \
--         user=navioadmin password=*** sslmode=require" -f sql/schema.sql
-- Idempotent: safe to re-run.
--
-- We store NO leads and NO bookings — only:
--   bot_config     : the editable system prompt (one row, id='navio')
--   conversations  : one row per chat request — full text (consent-gated) + metrics
--
-- Unlike the old Supabase schema, there is NO Row-Level Security here: only the
-- backend ever connects, with full credentials, and never an exposed anon key.
--
-- gen_random_uuid() is built into PostgreSQL 13+ core, so no extension is needed
-- (Azure allow-lists extensions separately, and we deliberately avoid that).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Editable bot config. The backend reads this on startup (and on a short TTL)
-- and writes admin edits here, so prompts persist + propagate across instances
-- instead of being written to a local disk that vanishes on a stateless host.
-- ---------------------------------------------------------------------------
create table if not exists bot_config (
  id            text primary key,
  system_prompt text        not null,
  updated_at    timestamptz not null default now()
);

-- Keep updated_at fresh on every edit.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bot_config_set_updated_at on bot_config;
create trigger bot_config_set_updated_at
  before update on bot_config
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Conversation log: one row per /api/chat request. Message text is stored ONLY
-- when the visitor gave Datenschutz consent (consent=true); otherwise the text
-- columns stay null and we keep metrics-only. IPs are hashed, never raw (GDPR).
-- ---------------------------------------------------------------------------
create table if not exists conversations (
  id                uuid        primary key default gen_random_uuid(),
  session_id        text,                       -- hashed session token (nullable)
  bot_id            text        not null default 'navio',
  consent           boolean     not null default false,
  user_message      text,                       -- null when consent = false
  assistant_reply   text,                       -- null when consent = false
  history_len       integer,                    -- # of prior turns sent as context
  latency_ms        integer,                    -- model round-trip time
  prompt_tokens     integer,
  completion_tokens integer,
  total_tokens      integer,
  model             text,
  finish_reason     text,                       -- stop | length | content_filter | error
  ip_hash           text,                       -- sha256(salt + ip); never the raw IP
  created_at        timestamptz not null default now()
);

create index if not exists conversations_created_at_idx on conversations (created_at desc);
create index if not exists conversations_bot_id_idx     on conversations (bot_id);

-- ---------------------------------------------------------------------------
-- OPTIONAL — 90-day retention purge. Azure supports pg_cron: in the portal go to
-- Server parameters -> azure.extensions -> add PG_CRON, then run once:
--
--   create extension if not exists pg_cron;
--   select cron.schedule(
--     'navio-conversations-purge',
--     '0 3 * * *',                              -- daily at 03:00 UTC
--     $$ delete from conversations where created_at < now() - interval '90 days' $$
--   );
-- ---------------------------------------------------------------------------
