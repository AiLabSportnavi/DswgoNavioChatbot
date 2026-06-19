# =============================================================================
# Navio frontend for Cloud Run / any container — multi-stage build.
#   Stage 1 (node):  install deps + build the Vite SPA into /app/dist
#   Stage 2 (nginx): serve those static files (static-only; no /api proxy)
# The final image is just nginx + static assets (no Node, tiny + fast).
# =============================================================================

# ---- Stage 1: build the static site ----------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first for better layer caching (lockfile -> reproducible installs).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Backend origin baked into the bundle. nginx no longer proxies /api, so the SPA
# calls the backend directly at this absolute URL (CORS-allowed by the backend) —
# the same wiring as the Vercel deploy. Two ways to set it, in order of precedence:
#   1. docker build --build-arg VITE_NAVIO_API=https://your-backend.run.app  (manual builds)
#   2. VITE_NAVIO_API=... in frontend/.env.production  (committed; used by Cloud Run --source)
# We only export the build arg when it's non-empty, so an unset arg lets the value
# from .env.production win instead of clobbering it with an empty string.
ARG VITE_NAVIO_API=

# `npm run build` (Vite production mode) inlines VITE_* vars into the JS bundle and
# reads frontend/.env.production (also the source of the browser-safe Clerk
# PUBLISHABLE key).
RUN if [ -n "$VITE_NAVIO_API" ]; then export VITE_NAVIO_API="$VITE_NAVIO_API"; fi; \
    npm run build
# Also build the standalone embeddable widget (separate IIFE bundle -> dist-widget/).
# The widget gets its backend URL at runtime from the host page's data-api attribute,
# so it doesn't need VITE_NAVIO_API baked in.
RUN npm run build:widget

# ---- Stage 2: serve with nginx ---------------------------------------------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Serve the embeddable widget at the root (/navio-widget.js) for customer <script>
# tags. dist-widget has no index.html, so the SPA's index.html is preserved; the
# shared favicon/icons just overwrite identical copies.
COPY --from=build /app/dist-widget /usr/share/nginx/html
EXPOSE 8080
