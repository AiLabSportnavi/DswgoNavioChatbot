FROM python:3.13-slim

# Don't write .pyc, flush logs immediately.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install deps first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code + the baked system prompt (NOT .env — secrets are passed at runtime).
# Copy all Python modules so local imports (e.g. supabase_client) resolve.
COPY *.py ./
COPY SYSTEM_PROMPT.md ./

EXPOSE 8000

# --forwarded-allow-ips lets rate limiting see the real client IP behind a proxy.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--forwarded-allow-ips", "*"]
