"""
Vercel serverless entrypoint for the Navio backend.

Vercel's Python runtime serves the ``app`` object it finds in this file, and
``backend/vercel.json`` rewrites every request path here so FastAPI does its own
routing. The backend lives one directory up (backend/app.py + sibling modules),
so we put that directory on sys.path before importing.

Everything else (env-driven config, the database, Clerk, Salesforce) is unchanged
— this is a thin re-export of the same ASGI app that ``uvicorn app:app`` runs.

Serverless caveats (see backend/README.md → "Option A — Vercel"):
  - Use the Supabase TRANSACTION pooler (port 6543) in DATABASE_URL.
  - Set REDIS_URL (e.g. Upstash) so per-IP rate limiting works across invocations.
  - Conversation logging is fire-and-forget and best-effort here (the function may
    freeze once the response is sent); it never blocks or breaks a reply.
"""

import os
import sys

# Make the backend root (the parent of this /api dir) importable so `import app`
# resolves to backend/app.py and its siblings (db.py, clerk_auth.py, salesforce.py).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app  # noqa: E402  — FastAPI ASGI app, served by Vercel's Python runtime

__all__ = ["app"]
