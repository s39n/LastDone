# syntax=docker/dockerfile:1

# ── Stage 1: build the frontend PWA ──────────────────────────────────────────
FROM node:22-slim AS web
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js tailwind.config.js postcss.config.js index.html ./
COPY src ./src
COPY public ./public
# Same-origin API, so no VITE_PUSH_URL needed (app defaults to '/push').
RUN npm run build

# ── Stage 2: API server + bundled PWA ────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/index.js server/store.js ./
COPY --from=web /web/dist ./public
RUN mkdir -p /app/data
EXPOSE 4000
VOLUME ["/app/data"]
CMD ["node", "index.js"]
