# syntax=docker/dockerfile:1

# ---- Stage 1: build the React/Vite frontend into dist/ ----
FROM node:20-alpine AS build
WORKDIR /app

# Install all deps (incl. dev) for the Vite build, leveraging layer caching.
# The Prisma schema must be present BEFORE `npm ci`: the postinstall hook runs
# `prisma generate`, which reads prisma/schema.prisma (same pattern as
# english-test's Dockerfile).
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Build the SPA.
COPY . .
RUN npm run build

# ---- Stage 2: production runtime (Express serves the SPA + /api) ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Production dependencies only. prisma (the CLI) lives in `dependencies`
# because the postinstall `prisma generate` must run here too — and the schema
# has to be in place first.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

# Application code: backend, shared quiz/scoring logic, built frontend, and API docs.
# The server imports from ../src/lib (scoring, quizPath, data), so src/ is required at runtime.
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/docs ./docs

# Run as the unprivileged user that the node image already ships with.
USER node

EXPOSE 3000

# The Express server reads PORT (3000) and serves both the SPA and /api routes.
CMD ["node", "server/index.js"]
