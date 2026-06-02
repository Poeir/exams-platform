# syntax=docker/dockerfile:1
# ONE container hosting both assessment engines behind the gateway:
#   /english/* -> english-test (API + SPA)   /mbti/* -> mbti (API + SPA)
# Each app keeps its own node_modules + Prisma client; the gateway (root
# package) mounts both Express apps and is the only listener (PORT 3000).

# ---- english: frontend build (Vite, served under /english/) ---------------
FROM node:20-alpine AS english-frontend
WORKDIR /app
COPY apps/english/package.json apps/english/package-lock.json ./
RUN npm ci
# papers_export_1_full.json is deliberately NOT copied — gitignored seed
# source; the app loads all exam content from the API.
COPY apps/english/vite.config.js apps/english/index.html ./
COPY apps/english/src ./src
COPY apps/english/public ./public
RUN npm run build -- --base=/english/

# ---- english: server production deps ---------------------------------------
# Prisma schema must be present BEFORE `npm ci`: postinstall runs
# `prisma generate`, which reads prisma/schema.prisma.
FROM node:20-alpine AS english-server-deps
WORKDIR /app
COPY apps/english/server/package.json apps/english/server/package-lock.json ./
COPY apps/english/server/prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

# ---- mbti: frontend build (Vite, served under /mbti/) ----------------------
FROM node:20-alpine AS mbti-build
WORKDIR /app
COPY apps/mbti/package.json apps/mbti/package-lock.json ./
COPY apps/mbti/prisma ./prisma
RUN npm ci
COPY apps/mbti/ ./
RUN npm run build -- --base=/mbti/

# ---- mbti: production deps --------------------------------------------------
FROM node:20-alpine AS mbti-deps
WORKDIR /app
COPY apps/mbti/package.json apps/mbti/package-lock.json ./
COPY apps/mbti/prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime: gateway + both apps -------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Gateway (root package: express only)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY gateway ./gateway

# english app: server + built SPA
COPY --from=english-server-deps /app/node_modules ./apps/english/server/node_modules
COPY apps/english/server/package.json ./apps/english/server/package.json
COPY apps/english/server/prisma ./apps/english/server/prisma
COPY apps/english/server/src ./apps/english/server/src
COPY --from=english-frontend /app/dist ./apps/english/dist

# mbti app: server + shared src (scoring/quizPath) + docs (openapi) + built SPA
COPY --from=mbti-deps /app/node_modules ./apps/mbti/node_modules
COPY apps/mbti/package.json ./apps/mbti/package.json
COPY apps/mbti/prisma ./apps/mbti/prisma
COPY apps/mbti/server ./apps/mbti/server
COPY apps/mbti/src ./apps/mbti/src
COPY apps/mbti/docs ./apps/mbti/docs
COPY --from=mbti-build /app/dist ./apps/mbti/dist

# Run as the unprivileged user that the node image already ships with.
USER node
EXPOSE 3000

# Combined liveness probe — /api/health pings the shared DB through BOTH
# engines' Prisma clients. Shell form so ${PORT} resolves at runtime.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1

# No auto-migration: apply schema out-of-band (english `migrate deploy` + seed,
# mbti SQL scripts) before pointing a fresh environment at the image.
CMD ["node", "gateway/index.js"]
