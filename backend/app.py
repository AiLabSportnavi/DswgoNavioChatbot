"""
Navio FastAPI backend.

Exposes the Navio chatbot as an HTTP API for the website widget on sportnavi.de.
The Azure OpenAI key and the system prompt live ONLY here — never in the browser.

Endpoints:
  GET  /health     — liveness/readiness check (no auth)
  POST /api/chat   — main chat: send a message + recent history, get Navio's reply

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
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

# ---------------------------------------------------------------------------
# Configuration (env-driven, with safe defaults)
# ---------------------------------------------------------------------------
load_dotenv()

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

# --- Rate-limit storage: in-memory by default, Redis when REDIS_URL is set ---
REDIS_URL = os.getenv("REDIS_URL", "").strip()

BASE_DIR = Path(__file__).parent
SYSTEM_PROMPT_PATH = BASE_DIR / "SYSTEM_PROMPT.md"
DATENSCHUTZ_PATH = BASE_DIR / "DATENSCHUTZ.md"

# Editable config, persisted to disk and held in memory so /api/chat picks up
# saves immediately. ADMIN_TOKEN (when set) gates the write endpoints.
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "").strip()
_config = {
    "system_prompt": SYSTEM_PROMPT_PATH.read_text(encoding="utf-8"),
    "datenschutz": DATENSCHUTZ_PATH.read_text(encoding="utf-8")
    if DATENSCHUTZ_PATH.exists()
    else "",
}

# Azure OpenAI client (v1-compatible endpoint). Fail fast if misconfigured.
_client = OpenAI(
    api_key=os.environ["AZURE_AI_CHATBOT_API_KEY"],
    base_url=os.environ["AZURE_AI_CHATBOT_OPENAI_ENDPOINT"],
)
_model = os.environ["AZURE_AI_CHATBOT_DEPLOYMENT_NAME"]


# ---------------------------------------------------------------------------
# Rate limiting (per client IP, in-memory)
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
    allow_headers=["Content-Type", "X-Navio-Session", "X-Admin-Token"],
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


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": _model, "turnstile": TURNSTILE_ENABLED}


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


@app.post("/api/chat", response_model=ChatResponse)
@limiter.limit(f"{RATE_LIMIT_PER_MIN}/minute")
@limiter.limit(f"{RATE_LIMIT_PER_DAY}/day")
def chat(
    request: Request,
    body: ChatRequest,
    x_navio_session: str | None = Header(default=None),
) -> ChatResponse:
    # When Turnstile is enabled, require a valid session token (from /api/session).
    if TURNSTILE_ENABLED and not session_token_valid(x_navio_session):
        raise HTTPException(
            status_code=401,
            detail="Sitzung ungültig oder abgelaufen. Bitte Seite neu laden. / "
            "Session invalid or expired. Please reload.",
        )

    # System prompt is injected server-side; client history can only be user/assistant.
    messages = [{"role": "system", "content": _config["system_prompt"]}]
    messages += [{"role": t.role, "content": t.content} for t in body.history]
    messages.append({"role": "user", "content": body.message})

    completion = _client.chat.completions.create(
        model=_model,
        temperature=TEMPERATURE,
        max_tokens=MAX_TOKENS,
        messages=messages,
    )
    return ChatResponse(reply=(completion.choices[0].message.content or "").strip())


# ---------------------------------------------------------------------------
# Admin config: read/write the system prompt and the Datenschutz text.
# Writes are gated by ADMIN_TOKEN when it is set (leave empty only in dev).
# ---------------------------------------------------------------------------
def require_admin(token: str | None) -> None:
    if ADMIN_TOKEN and token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Admin-Token erforderlich. / Admin token required.")


@app.get("/api/config")
def get_config() -> dict:
    return {
        "system_prompt": _config["system_prompt"],
        "datenschutz": _config["datenschutz"],
        "admin_required": bool(ADMIN_TOKEN),
    }


@app.post("/api/config/system-prompt")
def set_system_prompt(
    body: ConfigUpdate, x_admin_token: str | None = Header(default=None)
) -> dict:
    require_admin(x_admin_token)
    SYSTEM_PROMPT_PATH.write_text(body.content, encoding="utf-8")
    _config["system_prompt"] = body.content  # takes effect on the next /api/chat
    return {"status": "saved"}


@app.post("/api/config/datenschutz")
def set_datenschutz(
    body: ConfigUpdate, x_admin_token: str | None = Header(default=None)
) -> dict:
    require_admin(x_admin_token)
    DATENSCHUTZ_PATH.write_text(body.content, encoding="utf-8")
    _config["datenschutz"] = body.content
    return {"status": "saved"}
