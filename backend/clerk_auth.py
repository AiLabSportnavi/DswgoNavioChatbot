"""
Clerk authentication for Navio's admin endpoints.

Strategy (matches the app's architecture):
  - Clerk owns identity + the login UI in the browser.
  - The browser sends a short-lived Clerk session JWT as `Authorization: Bearer <jwt>`.
  - Here we VERIFY that JWT (RS256, against Clerk's public JWKS) and then authorize
    the caller by EMAIL DOMAIN — only verified emails on an allow-listed domain may
    write config.

Why look the email up instead of reading it from the token? Clerk's *default*
session token does not carry the user's email, only their user id (`sub`). So we
verify the token, then fetch the user from Clerk's Backend API with the secret key
to read their primary, verified email. (Admin saves are rare, so the extra call is
cheap.) If you later add a Clerk JWT template that injects an `email` claim, this
module will prefer that claim and skip the lookup automatically.

Deliberately OPTIONAL, like supabase_client: when CLERK_ISSUER is unset,
``clerk_enabled()`` is False and ``require_admin`` falls back to the legacy
ADMIN_TOKEN check in app.py. So the app still boots and runs without Clerk.

Env vars:
  CLERK_ISSUER          e.g. https://normal-joey-58.clerk.accounts.dev  (required to enable)
  CLERK_SECRET_KEY      sk_test_... / sk_live_...  (needed only for the email lookup)
  ADMIN_EMAIL_DOMAINS   comma-separated allowlist, e.g. "sportnavi.de,ncr4ailab.de"
"""

from __future__ import annotations

import os

import httpx
import jwt
from fastapi import HTTPException
from jwt import PyJWKClient

_ISSUER = os.getenv("CLERK_ISSUER", "").strip().rstrip("/")
_SECRET = os.getenv("CLERK_SECRET_KEY", "").strip()
_JWKS_URL = f"{_ISSUER}/.well-known/jwks.json" if _ISSUER else ""
_CLERK_API = "https://api.clerk.com/v1"
_TIMEOUT = float(os.getenv("CLERK_TIMEOUT_SEC", "5"))

# Lower-cased domain allowlist. A verified email must end in one of these.
_DOMAINS = [
    d.strip().lower().lstrip("@")
    for d in os.getenv("ADMIN_EMAIL_DOMAINS", "").split(",")
    if d.strip()
]

# PyJWKClient caches the fetched signing keys, so we don't hit Clerk's JWKS on
# every request. Created lazily (only when Clerk is enabled).
_jwks_client: PyJWKClient | None = PyJWKClient(_JWKS_URL) if _JWKS_URL else None


def clerk_enabled() -> bool:
    """True when a Clerk issuer is configured (admin auth runs through Clerk)."""
    return bool(_ISSUER)


def _verify_jwt(token: str) -> dict:
    """Verify a Clerk session JWT's signature + claims; return its payload.

    Raises HTTPException(401) on any failure (bad signature, expired, wrong issuer)."""
    assert _jwks_client is not None  # guaranteed by clerk_enabled() gate
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=_ISSUER,
            # Clerk session tokens carry no `aud`; don't require one.
            options={"verify_aud": False, "require": ["exp", "iat", "sub"]},
            leeway=30,  # small clock-skew tolerance
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Ungültige oder abgelaufene Anmeldung. / Invalid or expired sign-in.",
        )


def _lookup_email(user_id: str) -> str | None:
    """Fetch a user's primary, VERIFIED email from Clerk's Backend API.

    Returns None if the key is missing, the user has no verified primary email,
    or the call fails."""
    if not _SECRET:
        return None
    try:
        resp = httpx.get(
            f"{_CLERK_API}/users/{user_id}",
            headers={"Authorization": f"Bearer {_SECRET}"},
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        user = resp.json()
        primary_id = user.get("primary_email_address_id")
        for addr in user.get("email_addresses", []):
            if addr.get("id") != primary_id:
                continue
            if (addr.get("verification") or {}).get("status") != "verified":
                return None  # primary email isn't verified — don't trust it
            return (addr.get("email_address") or "").strip().lower()
    except Exception:
        return None
    return None


def _email_allowed(email: str | None) -> bool:
    """True when the email's domain is on the allowlist (and an allowlist exists)."""
    if not email or "@" not in email or not _DOMAINS:
        return False
    domain = email.rsplit("@", 1)[1].lower()
    return domain in _DOMAINS


def require_admin(authorization: str | None) -> str:
    """Authorize an admin request from an `Authorization: Bearer <jwt>` header.

    Verifies the Clerk JWT and checks the caller's verified email domain against
    ADMIN_EMAIL_DOMAINS. Returns the admin's email on success.

    Raises 401 (not signed in / bad token) or 403 (signed in but not allowed)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Anmeldung erforderlich. / Sign-in required.",
        )
    token = authorization.split(" ", 1)[1].strip()
    claims = _verify_jwt(token)

    # Prefer an `email` claim if a JWT template provides one; else look it up.
    email = (claims.get("email") or "").strip().lower() or _lookup_email(claims.get("sub", ""))

    if not _DOMAINS:
        raise HTTPException(
            status_code=403,
            detail="Admin-Zugang ist nicht konfiguriert (ADMIN_EMAIL_DOMAINS fehlt).",
        )
    if not _email_allowed(email):
        raise HTTPException(
            status_code=403,
            detail="Dieses Konto ist nicht berechtigt. / This account is not authorized.",
        )
    return email  # type: ignore[return-value]
