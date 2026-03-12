# VitalWatch Frontend Dockerfile
# Multi-stage build for Next.js production

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install libc6-compat for Alpine
RUN apk add --no-cache libc6-compat

# Copy package files (monorepo root lock + frontend package.json)
COPY package-lock.json ./
COPY vitalwatch-frontend/package.json ./

# Install dependencies
RUN npm install

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Next.js public env vars (must be available at build time)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY vitalwatch-frontend/ .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Validate that NEXT_PUBLIC_API_URL has a real domain (not empty or bare protocol)
RUN if [ -z "$NEXT_PUBLIC_API_URL" ] || [ "$NEXT_PUBLIC_API_URL" = "https://" ] || [ "$NEXT_PUBLIC_API_URL" = "http://" ]; then \
      echo "ERROR: NEXT_PUBLIC_API_URL is missing or invalid: '$NEXT_PUBLIC_API_URL'"; \
      echo "Pass --env-file .env to docker compose build"; \
      exit 1; \
    fi && echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

# Build the application
RUN npm run build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set up standalone output directory
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]
