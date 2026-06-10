# =============================================================================
# Navio frontend for Cloud Run — multi-stage build.
#   Stage 1 (node):  install deps + build the Vite SPA into /app/dist
#   Stage 2 (nginx): serve those static files AND reverse-proxy /api -> backend
# The final image is just nginx + static assets (no Node, tiny + fast).
# =============================================================================

# ---- Stage 1: build the static site ----------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first for better layer caching (lockfile -> reproducible installs).
COPY package.json package-lock.json ./
RUN npm ci

# Build. VITE_NAVIO_API is intentionally left UNSET so the SPA uses relative
# URLs (/api/chat) — nginx proxies them to the backend below, keeping the browser
# same-origin (no CORS).
COPY . .

# `npm run build` (Vite production mode) inlines VITE_* vars into the JS bundle.
# The Clerk PUBLISHABLE key comes from the committed frontend/.env.production
# (browser-safe — it ships in the bundle anyway). This works the same for
# `docker compose` and Cloud Run `--source`, so no build args are needed.
RUN npm run build
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
