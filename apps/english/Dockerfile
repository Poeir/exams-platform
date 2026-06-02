# syntax=docker/dockerfile:1

# ---- Stage 1: build the Vite/React frontend -> dist/ ----------------------
FROM node:20-alpine AS frontend
WORKDIR /app

# No build args: the frontend bakes in NO config. All env lives on the server
# and the browser fetches what it needs at runtime via GET /api/config.

# Install root deps against the lockfile (reproducible).
COPY package.json package-lock.json ./
RUN npm ci

# Copy only what the build needs, then build. NOTE: papers_export_1_full.json
# is deliberately NOT copied — it's gitignored (absent from CI checkouts) and
# the app loads all exam content from the API; the JSON is only an out-of-band
# seed source (`npm --prefix server run seed`).
COPY vite.config.js index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# ---- Stage 2: install production server deps ------------------------------
FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
# Prisma schema must be present before `npm ci`: the postinstall hook runs
# `prisma generate`, which reads prisma/schema.prisma to build the client.
COPY server/prisma ./prisma
RUN npm ci --omit=dev

# ---- Stage 3: runtime -----------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Express serves the API (/api) AND the static frontend (/) on this port.
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/package.json ./server/package.json
COPY server/prisma ./server/prisma
COPY server/src ./server/src
COPY --from=frontend /app/dist ./dist

# Run as the built-in unprivileged user.
USER node
EXPOSE 3000

# Liveness probe against the API's own health route. Shell form so ${PORT}
# resolves at runtime; busybox wget ships with alpine (no curl needed).
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1

# No auto-migration: run `npm --prefix server run migrate` out-of-band before deploy.
CMD ["node", "server/src/index.js"]
