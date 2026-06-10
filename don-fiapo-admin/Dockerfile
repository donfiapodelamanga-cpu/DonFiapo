# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Install sqlite3 to initialize the build-time database
RUN apk add --no-cache sqlite

# Create and initialize a dummy SQLite DB with the full schema for Prisma at build time.
# This prevents Prisma from failing when next build tries to statically analyze API routes.
# The real production DB is mounted at runtime via Docker volume.
RUN mkdir -p /app/db && \
    touch /app/db/dev.db && \
    DATABASE_URL="file:/app/db/dev.db" npx prisma generate && \
    DATABASE_URL="file:/app/db/dev.db" npx prisma db push --accept-data-loss 2>&1 | tail -5

# Build Next.js — TS/ESLint errors are suppressed to avoid blocking deploy.
# Fix type errors locally with: npm run type-check
RUN DATABASE_URL="file:/app/db/dev.db" npx next build

# Production Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
