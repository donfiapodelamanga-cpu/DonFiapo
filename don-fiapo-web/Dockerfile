# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY scripts ./scripts
RUN apk add --no-cache python3 make g++ && npm ci --ignore-scripts \
    && node scripts/patch-solana.js
COPY . .
# Next.js build - use webpack (not turbopack) for proper transpilePackages support
# --no-turbopack is REQUIRED to apply webpack loaders that fix octal escape sequences
RUN npx next build --no-turbopack

# Production Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
