# VitalWatch Backend Dockerfile
# Multi-stage build for production optimization

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev for building)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl libc6-compat

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Install production dependencies only
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client for production
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "dist/src/main.js"]
