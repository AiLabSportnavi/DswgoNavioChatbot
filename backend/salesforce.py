"""
Salesforce connector for the Navio Plus contact form.

Implements the two-step Sportnavi integration:
  1. OAuth token  — POST {token_url}  (grant_type=client_credentials)
  2. Trigger flow — POST {instance_url}/services/data/{ver}/actions/custom/flow/{flow}

The client_id / client_secret are SECRETS, so this runs server-side only (never the
browser). Deliberately OPTIONAL: when SALESFORCE_CLIENT_ID / SALESFORCE_CLIENT_SECRET
are unset, ``salesforce_enabled()`` is False and the /api/contact endpoint runs in a
safe "simulate" mode so the form stays demoable without credentials.

On a flow failure (isSuccess=false) or transport error, the caller emails the request
to CONTACT_FALLBACK_EMAIL (service@…) so no contact request is ever silently lost.
"""

from __future__ import annotations

import logging
import os
import smtplib
import threading
import time
from email.message import EmailMessage

import httpx

log = logging.getLogger("navio.salesforce")

# --- Salesforce config (env-driven) -----------------------------------------
_CLIENT_ID = os.getenv("SALESFORCE_CLIENT_ID", "").strip()
_CLIENT_SECRET = os.getenv("SALESFORCE_CLIENT_SECRET", "").strip()
_TOKEN_URL = os.getenv(
    "SALESFORCE_TOKEN_URL",
    "https://sportnavi.my.salesforce.com/services/oauth2/token",
).strip()
# Fallback instance URL; the token response's instance_url is preferred when present.
_INSTANCE_URL = os.getenv(
    "SALESFORCE_INSTANCE_URL", "https://sportnavi.my.salesforce.com"
).strip().rstrip("/")
_API_VERSION = os.getenv("SALESFORCE_API_VERSION", "v65.0").strip()
_FLOW_API_NAME = os.getenv("SALESFORCE_FLOW_API_NAME", "CaseHandler").strip()
# client_credentials tokens have no expires_in; refresh on our own soft TTL + on 401.
_TOKEN_TTL = float(os.getenv("SALESFORCE_TOKEN_TTL_SEC", "3600"))
_TIMEOUT = float(os.getenv("SALESFORCE_TIMEOUT_SEC", "15"))

# --- Fallback email (SMTP) config -------------------------------------------
_FALLBACK_TO = os.getenv("CONTACT_FALLBACK_EMAIL", "service@sportnavi.de").strip()
_MAIL_FROM = os.getenv("CONTACT_FROM_EMAIL", "").strip() or _FALLBACK_TO
_SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
_SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
_SMTP_USER = os.getenv("SMTP_USER", "").strip()
_SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
_SMTP_STARTTLS = os.getenv("SMTP_STARTTLS", "true").strip().lower() not in ("0", "false", "no")

# Cached token: protected by a lock so concurrent requests don't stampede the token URL.
_token_lock = threading.Lock()
_token: str | None = None
_token_instance_url: str | None = None
_token_fetched_at = 0.0


def salesforce_enabled() -> bool:
    """True when both Salesforce credentials are configured."""
    return bool(_CLIENT_ID and _CLIENT_SECRET)


def smtp_enabled() -> bool:
    """True when an SMTP relay is configured for the fallback email."""
    return bool(_SMTP_HOST)


# ---------------------------------------------------------------------------
# OAuth token (client_credentials), cached with a soft TTL + forced refresh
# ---------------------------------------------------------------------------
def _fetch_token() -> tuple[str, str]:
    """POST the token endpoint, return (access_token, instance_url). Raises on failure."""
    resp = httpx.post(
        _TOKEN_URL,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "grant_type": "client_credentials",
            "client_id": _CLIENT_ID,
            "client_secret": _CLIENT_SECRET,
        },
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    tok = data.get("access_token")
    if not tok:
        raise RuntimeError(f"token response missing access_token: {data}")
    return tok, (data.get("instance_url") or _INSTANCE_URL).rstrip("/")


def _get_token(force: bool = False) -> tuple[str, str]:
    """Return a cached (token, instance_url), refreshing past the TTL or when forced."""
    global _token, _token_instance_url, _token_fetched_at
    with _token_lock:
        fresh = _token and (time.time() - _token_fetched_at) < _TOKEN_TTL
        if force or not fresh:
            _token, _token_instance_url = _fetch_token()
            _token_fetched_at = time.time()
        return _token, _token_instance_url  # type: ignore[return-value]


def _flow_url(instance_url: str) -> str:
    return f"{instance_url}/services/data/{_API_VERSION}/actions/custom/flow/{_FLOW_API_NAME}"


# ---------------------------------------------------------------------------
# Trigger the CaseHandler flow
# ---------------------------------------------------------------------------
def submit_case(inputs: dict) -> tuple[bool, str]:
    """Trigger the flow with one inputs row. Returns (ok, detail).

    Refreshes the token once on a 401 and retries. ``ok`` is True only when the flow
    returns isSuccess=true. ``detail`` carries the error for logging/fallback on failure.
    """
    if not salesforce_enabled():
        return False, "salesforce not configured"

    body = {"inputs": [inputs]}
    for attempt in (1, 2):  # second attempt = after a forced token refresh on 401
        token, instance_url = _get_token(force=(attempt == 2))
        try:
            resp = httpx.post(
                _flow_url(instance_url),
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=body,
                timeout=_TIMEOUT,
            )
        except httpx.HTTPError as e:
            return False, f"transport error: {e}"

        if resp.status_code == 401 and attempt == 1:
            continue  # token likely expired — refresh and retry once

        if resp.status_code >= 400:
            return False, f"HTTP {resp.status_code}: {resp.text[:500]}"

        # Success HTTP — the flow result is a JSON list; isSuccess on the first item.
        try:
            results = resp.json()
            first = results[0] if isinstance(results, list) and results else {}
        except Exception:
            return False, f"unparseable flow response: {resp.text[:500]}"

        if first.get("isSuccess") is True:
            return True, str(first.get("outputValues", ""))
        return False, f"flow isSuccess=false: {first.get('errors') or first}"

    return False, "unreachable"


# ---------------------------------------------------------------------------
# Fallback email — ensure a failed submission still reaches the service team
# ---------------------------------------------------------------------------
def send_fallback_email(subject: str, body: str) -> bool:
    """Email the contact request to CONTACT_FALLBACK_EMAIL. Returns success.

    When no SMTP relay is configured we log the full payload at ERROR level instead,
    so the request is still recoverable from the logs (and the caller knows email
    delivery did not happen)."""
    if not smtp_enabled():
        log.error("CONTACT FALLBACK (no SMTP configured) — %s\n%s", subject, body)
        return False
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = _MAIL_FROM
        msg["To"] = _FALLBACK_TO
        msg.set_content(body)
        with smtplib.SMTP(_SMTP_HOST, _SMTP_PORT, timeout=_TIMEOUT) as s:
            if _SMTP_STARTTLS:
                s.starttls()
            if _SMTP_USER:
                s.login(_SMTP_USER, _SMTP_PASSWORD)
            s.send_message(msg)
        return True
    except Exception as e:  # noqa: BLE001 — never raise into the request path
        log.error("CONTACT FALLBACK email FAILED (%s) — %s\n%s", e, subject, body)
        return False
