# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# --- Dependencies (postinstall runs `prisma generate`, so the schema is needed) ---
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# Placeholder only: `prisma generate` reads the config but never connects.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm ci

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build
# Used by the `migrate` service; the real DATABASE_URL is supplied at runtime.
ENV DATABASE_URL=""

# --- Runtime (standalone output) ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:3000/api/stats?dayStart=2000-01-01T00:00:00Z&dayEnd=2000-01-02T00:00:00Z" > /dev/null || exit 1
CMD ["node", "server.js"]
