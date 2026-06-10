"""
Navio FastAPI backend.

Exposes the Navio chatbot as an HTTP API for the website widget on sportnavi.de.
The Azure OpenAI key and the system prompt live ONLY here — never in the browser.

Endpoints:
  GET  /health     — liveness/readiness check (no auth)
  POST /api/chat   — main chat: send a message + recent history, get Navio's reply

State: the server is stateless (it holds no session). Chat history is sent by the
client on every request; editable config + a per-request conversation log live in
Supabase (see supabase_client.py + schema.sql). That keeps the app horizontally
scalable — any instance can serve any request.

Security (v1): CORS allowlist + per-IP rate limiting + strict input caps.
Run locally:  uvicorn app:app --reload
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time
import warnings
from pathlib import Path

# Hide an unrelated, harmless plugin warning from the global Python env.
warnings.filterwarnings("ignore", message="ImportError while loading the .* plugin")

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    BadRequestError,
    OpenAI,
    RateLimitError,
)
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

# ---------------------------------------------------------------------------
# Configuration (env-driven, with safe defaults)
# ---------------------------------------------------------------------------
load_dotenv()

# Imported AFTER load_dotenv() so the modules read their env (SUPABASE_*, CLERK_*)
# from .env at import time.
import supabase_client as supa  # noqa: E402
import clerk_auth  # noqa: E402

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "https://sportnavi.de,https://www.sportnavi.de,"
        "https://ncr4ailab.de,https://www.ncr4ailab.de",
    ).split(",")
    if o.strip()
]
RATE_LIMIT_PER_MIN = os.getenv("RATE_LIMIT_PER_MIN", "15")
RATE_LIMIT_PER_DAY = os.getenv("RATE_LIMIT_PER_DAY", "300")
MAX_MESSAGE_CHARS = int(os.getenv("MAX_MESSAGE_CHARS", "2000"))
MAX_HISTORY_TURNS = int(os.getenv("MAX_HISTORY_TURNS", "10"))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "800"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.4"))

# --- Anti-abuse: Cloudflare Turnstile (env-gated; off when secret is empty) ---
TURNSTILE_SECRET = os.getenv("TURNSTILE_SECRET", "").strip()
TURNSTILE_ENABLED = bool(TURNSTILE_SECRET)
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
# Signing key for session tokens; falls back to the Turnstile secret, then a dev default.
SESSION_SECRET = (
    os.getenv("SESSION_SECRET", "") or TURNSTILE_SECRET or "dev-insecure-session-secret"
).encode()
SESSION_TTL_MIN = int(os.getenv("SESSION_TTL_MIN", "30"))

# --- Rate-limit storage: in-memory by default, Redis/Upstash when REDIS_URL is set ---
REDIS_URL = os.getenv("REDIS_URL", "").strip()

BASE_DIR = Path(__file__).parent
SYSTEM_PROMPT_PATH = BASE_DIR / "SYSTEM_PROMPT.md"

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "").strip()

# How long an instance trusts its cached config before re-reading Supabase. Small
# so admin edits propagate across instances within seconds (0 = read every time).
CONFIG_TTL_SEC = int(os.getenv("CONFIG_TTL_SEC", "30"))

# Editable config. Seeded from the on-disk files (the repo is the source of the
# initial prompt), then backed by Supabase: reads refresh from there on a TTL,
# admin saves write there. The disk files are only a seed + offline fallback.
_config = {
    "system_prompt": SYSTEM_PROMPT_PATH.read_text(encoding="utf-8"),
}
_config_loaded_at = 0.0


def _apply_config_row(row: dict | None) -> None:
    """Copy a Supabase bot_config row into the in-memory cache (ignoring blanks)."""
    if not row:
        return
    if row.get("system_prompt"):
        _config["system_prompt"] = row["system_prompt"]


def refresh_config(force: bool = False) -> None:
    """Re-read config from Supabase if the cache is older than CONFIG_TTL_SEC.
    No-op when Supabase is not configured (disk seed stays in effect)."""
    global _config_loaded_at
    if not supa.supabase_enabled():
        return
    now = time.time()
    if not force and (now - _config_loaded_at) < CONFIG_TTL_SEC:
        return
    _apply_config_row(supa.fetch_config())
    _config_loaded_at = now


# Azure OpenAI client (v1-compatible endpoint). Fail fast if misconfigured.
_client = OpenAI(
    api_key=os.environ["AZURE_AI_CHATBOT_API_KEY"],
    base_url=os.environ["AZURE_AI_CHATBOT_OPENAI_ENDPOINT"],
)
_model = os.environ["AZURE_AI_CHATBOT_DEPLOYMENT_NAME"]


# A message that trips Azure's content filter (jailbreak/hate/violence/sexual)
# or any other model error must NOT surface as a scary 500. Map known AI errors
# to a friendly in-chat reply; return None for anything unexpected so it still
# raises (a real bug should not be silently swallowed).
_CONTENT_FILTER_REPLY = (
    "Das kann ich leider nicht beantworten. 💚 Aber zu Sportnavi — Angebote, "
    "Mitgliedschaft, Firmenfitness oder einen Termin — helfe ich dir gern weiter!\n\n"
    "I can’t answer that — but I’m happy to help with anything about Sportnavi."
)
_UNAVAILABLE_REPLY = (
    "Ich bin gerade einen kurzen Moment nicht erreichbar. Bitte versuch es gleich "
    "noch einmal. 🙏🏻\n\nI’m briefly unavailable — please try again in a moment."
)


def friendly_ai_reply(e: Exception) -> str | None:
    """Map an OpenAI/Azure exception to a user-facing reply, or None to re-raise."""
    if isinstance(e, BadRequestError):
        # Content filter (incl. jailbreak detection) and any other 400 from the
        # model: the prompt can't be answered — refuse politely, never 500.
        return _CONTENT_FILTER_REPLY
    if isinstance(e, (APITimeoutError, APIConnectionError, RateLimitError, APIError)):
        # Transient: timeout, dropped connection, rate limit, upstream hiccup.
        return _UNAVAILABLE_REPLY
    return None


# ---------------------------------------------------------------------------
# Rate limiting (per client IP)
# ---------------------------------------------------------------------------
def client_ip(request: Request) -> str:
    """Real client IP, honoring X-Forwarded-For when behind a reverse proxy."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=client_ip, storage_uri=REDIS_URL or "memory://")


# ---------------------------------------------------------------------------
# Session tokens (HMAC-signed) + Turnstile verification (per-session model)
# ---------------------------------------------------------------------------
def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def issue_session_token() -> str:
    """Mint a short-lived signed token: '<expiry>.<hmac>'."""
    expiry = str(int(time.time()) + SESSION_TTL_MIN * 60).encode()
    sig = hmac.new(SESSION_SECRET, expiry, hashlib.sha256).digest()
    return f"{_b64(expiry)}.{_b64(sig)}"


def session_token_valid(token: str | None) -> bool:
    """True if the token's signature checks out and it hasn't expired."""
    if not token or "." not in token:
        return False
    try:
        exp_b64, sig_b64 = token.split(".", 1)
        expiry = _b64d(exp_b64)
        expected = hmac.new(SESSION_SECRET, expiry, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64d(sig_b64)):
            return False
        return int(expiry.decode()) > int(time.time())
    except Exception:
        return False


def _session_id(token: str | None) -> str | None:
    """A short, non-reversible fingerprint of the session token — groups a
    visitor's turns in the log without storing the token itself."""
    if not token:
        return None
    return hashlib.sha256(token.encode()).hexdigest()[:16]


def verify_turnstile(token: str, ip: str) -> bool:
    """Ask Cloudflare whether a Turnstile token is genuine."""
    try:
        resp = httpx.post(
            TURNSTILE_VERIFY_URL,
            data={"secret": TURNSTILE_SECRET, "response": token, "remoteip": ip},
            timeout=5,
        )
        return bool(resp.json().get("success"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Request / response schemas (input caps enforced here)
# ---------------------------------------------------------------------------
class Turn(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")  # system is server-only
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    history: list[Turn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS)
    # The widget shows a Datenschutz gate before any message can be sent. We record
    # that consent here so the conversation log only stores message TEXT with
    # consent; without it we keep a metrics-only row (no text).
    consent: bool = False


class ChatResponse(BaseModel):
    reply: str


class SessionRequest(BaseModel):
    turnstile_token: str = Field(min_length=1, max_length=4000)


class ConfigUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=400_000)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Navio API", version="1.0.0")
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Navio-Session", "X-Admin-Token", "Authorization"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Zu viele Anfragen — bitte einen Moment warten. / "
            "Too many requests — please slow down."
        },
    )


@app.on_event("startup")
def _startup() -> None:
    # Load editable config from Supabase. If the table has no row yet, seed it from
    # the on-disk prompt so the very first deploy works without a manual SQL insert.
    global _config_loaded_at
    if not supa.supabase_enabled():
        return
    row = supa.fetch_config()
    if row is None:
        supa.seed_config(_config["system_prompt"])
    else:
        _apply_config_row(row)
    _config_loaded_at = time.time()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model": _model,
        "turnstile": TURNSTILE_ENABLED,
        "supabase": supa.supabase_enabled(),
    }


@app.post("/api/session")
@limiter.limit(f"{RATE_LIMIT_PER_MIN}/minute")
def create_session(request: Request, body: SessionRequest) -> dict:
    # When Turnstile is enabled, prove a real browser before issuing a session token.
    if TURNSTILE_ENABLED and not verify_turnstile(body.turnstile_token, client_ip(request)):
        raise HTTPException(
            status_code=403,
            detail="Turnstile-Verifizierung fehlgeschlagen. / Turnstile verification failed.",
        )
    return {"session_token": issue_session_token(), "expires_in": SESSION_TTL_MIN * 60}


def _log_row(
    *,
    ip: str | None,
    session_token: str | None,
    body: ChatRequest,
    reply: str,
    finish_reason: str,
    usage,
    latency_ms: int,
) -> dict:
    """Build a conversation-log row. Message text is included ONLY with consent;
    otherwise the row is metrics-only (text columns left null)."""
    consent = bool(body.consent)
    return {
        "session_id": _session_id(session_token),
        "bot_id": "navio",
        "consent": consent,
        "user_message": body.message if consent else None,
        "assistant_reply": reply if consent else None,
        "history_len": len(body.history),
        "latency_ms": latency_ms,
        "prompt_tokens": getattr(usage, "prompt_tokens", None),
        "completion_tokens": getattr(usage, "completion_tokens", None),
        "total_tokens": getattr(usage, "total_tokens", None),
        "model": _model,
        "finish_reason": finish_reason,
        "ip_hash": supa.hash_ip(ip),
    }


@app.post("/api/chat", response_model=ChatResponse)
@limiter.limit(f"{RATE_LIMIT_PER_MIN}/minute")
@limiter.limit(f"{RATE_LIMIT_PER_DAY}/day")
def chat(
    request: Request,
    body: ChatRequest,
    background: BackgroundTasks,
    x_navio_session: str | None = Header(default=None),
) -> ChatResponse:
    # When Turnstile is enabled, require a valid session token (from /api/session).
    if TURNSTILE_ENABLED and not session_token_valid(x_navio_session):
        raise HTTPException(
            status_code=401,
            detail="Sitzung ungültig oder abgelaufen. Bitte Seite neu laden. / "
            "Session invalid or expired. Please reload.",
        )

    # Pick up any admin prompt edits (TTL-gated read from Supabase).
    refresh_config()

    # System prompt is injected server-side; client history can only be user/assistant.
    messages = [{"role": "system", "content": _config["system_prompt"]}]
    messages += [{"role": t.role, "content": t.content} for t in body.history]
    messages.append({"role": "user", "content": body.message})

    usage = None
    finish_reason = "error"
    started = time.perf_counter()
    try:
        completion = _client.chat.completions.create(
            model=_model,
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
            messages=messages,
        )
        choice = completion.choices[0]
        reply = (choice.message.content or "").strip()
        finish_reason = choice.finish_reason or "stop"
        usage = completion.usage
    except Exception as e:  # noqa: BLE001 — AI errors become a graceful reply, not a 500
        friendly = friendly_ai_reply(e)
        if friendly is None:
            raise
        reply = friendly
        finish_reason = "content_filter" if isinstance(e, BadRequestError) else "error"
    latency_ms = int((time.perf_counter() - started) * 1000)

    # Log the turn for monitoring — fire-and-forget AFTER the response is sent, so
    # Supabase latency never adds to the visitor's wait. Values are captured now
    # (the Request is gone by the time the background task runs).
    if supa.supabase_enabled():
        background.add_task(
            supa.log_conversation,
            _log_row(
                ip=client_ip(request),
                session_token=x_navio_session,
                body=body,
                reply=reply,
                finish_reason=finish_reason,
                usage=usage,
                latency_ms=latency_ms,
            ),
        )

    return ChatResponse(reply=reply)


# ---------------------------------------------------------------------------
# Admin config: read/write the system prompt. (The Datenschutz text is not stored
# here — the widget links straight to the live sportnavi.de/datenschutz page.)
# Persisted to Supabase (so edits survive restarts + reach every instance);
# falls back to the on-disk file only when Supabase is not configured.
#
# Auth: when Clerk is configured (CLERK_ISSUER set), writes require a valid Clerk
# session JWT in `Authorization: Bearer <jwt>` whose verified email is on an
# allow-listed domain (ADMIN_EMAIL_DOMAINS). When Clerk is NOT configured we fall
# back to the legacy shared `X-Admin-Token` header (empty = open, dev only).
# ---------------------------------------------------------------------------
def require_admin(authorization: str | None, admin_token: str | None) -> None:
    if clerk_auth.clerk_enabled():
        clerk_auth.require_admin(authorization)  # raises 401/403 on failure
        return
    # Legacy fallback when Clerk isn't wired up.
    if ADMIN_TOKEN and admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Admin-Token erforderlich. / Admin token required.")


@app.get("/api/config")
def get_config() -> dict:
    refresh_config()
    return {
        "system_prompt": _config["system_prompt"],
        # The editor is locked whenever an auth layer is active (Clerk or token).
        "admin_required": clerk_auth.clerk_enabled() or bool(ADMIN_TOKEN),
    }


@app.post("/api/config/system-prompt")
def set_system_prompt(
    body: ConfigUpdate,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> dict:
    require_admin(authorization, x_admin_token)
    _config["system_prompt"] = body.content  # takes effect on the next /api/chat
    if supa.supabase_enabled():
        if not supa.update_config_field("system_prompt", body.content):
            raise HTTPException(status_code=502, detail="Konnte nicht in Supabase speichern.")
    else:
        SYSTEM_PROMPT_PATH.write_text(body.content, encoding="utf-8")
    return {"status": "saved"}
