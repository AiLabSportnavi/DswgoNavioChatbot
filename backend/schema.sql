-- =============================================================================
-- Navio — Supabase schema. Run ONCE in the Supabase SQL editor
-- (Dashboard → SQL Editor → paste → Run). Idempotent: safe to re-run.
--
-- Replaces the old local Postgres. We store NO leads and NO bookings — only:
--   bot_config     : the editable system prompt (one row, id='navio')
--   conversations  : one row per chat request — full text (consent-gated) + metrics
--
-- Already created bot_config with a datenschutz column? Drop it (we link straight
-- to the live sportnavi.de/datenschutz page instead of storing a copy):
--   alter table public.bot_config drop column if exists datenschutz;
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Editable bot config. The backend reads this on startup (and on a short TTL)
-- and writes admin edits here, so prompts persist + propagate across instances
-- instead of being written to a local disk that vanishes on a stateless host.
-- ---------------------------------------------------------------------------
create table if not exists public.bot_config (
  id            text primary key,
  system_prompt text        not null,
  updated_at    timestamptz not null default now()
);

-- Keep updated_at fresh on every edit.
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bot_config_set_updated_at on public.bot_config;
create trigger bot_config_set_updated_at
  before update on public.bot_config
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Conversation log: one row per /api/chat request. Message text is stored ONLY
-- when the visitor gave Datenschutz consent (consent=true); otherwise the text
-- columns stay null and we keep metrics-only. IPs are hashed, never raw (GDPR).
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
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

create index if not exists conversations_created_at_idx on public.conversations (created_at desc);
create index if not exists conversations_bot_id_idx     on public.conversations (bot_id);

-- ---------------------------------------------------------------------------
-- Lock the tables down. RLS ON with NO policies => the public/anon key can
-- neither read nor write. The backend uses the service_role key, which bypasses
-- RLS, so this is invisible to the app but keeps the data private.
-- ---------------------------------------------------------------------------
alter table public.bot_config    enable row level security;
alter table public.conversations enable row level security;

-- ---------------------------------------------------------------------------
-- OPTIONAL — 90-day retention purge. Requires the pg_cron extension
-- (Dashboard → Database → Extensions → enable "pg_cron"), then uncomment:
--
-- select cron.schedule(
--   'navio-conversations-purge',
--   '0 3 * * *',                              -- daily at 03:00 UTC
--   $$ delete from public.conversations where created_at < now() - interval '90 days' $$
-- );
-- ---------------------------------------------------------------------------
