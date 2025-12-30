# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install build dependencies for better-sqlite3 (python, make, g++)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine
WORKDIR /app

# Install runtime dependencies if needed (none for pure node/sqlite mostly, but better-sqlite3 needs bindings)
# Copying node_modules from builder includes the compiled bindings
RUN apk add --no-cache python3 make g++

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Environment variables should be passed at runtime, but setting defaults for safety
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
