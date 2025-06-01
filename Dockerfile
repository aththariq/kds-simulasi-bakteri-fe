# Frontend Dockerfile for Bacterial Simulation Application
# Multi-stage build for optimal image size and security

# Base image with Node.js
FROM node:20-alpine AS base

# Install system dependencies only if needed
RUN apk add --no-cache libc6-compat curl

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Dependencies stage
FROM base AS deps

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install dependencies using npm ci for faster, reliable, reproducible builds
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Builder stage
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build the application
RUN npm run build

# Production stage
FROM base AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create app directory and set ownership
RUN mkdir -p /app && chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME "0.0.0.0"
ENV PORT 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"] 