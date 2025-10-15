# Multi-stage Docker build for ACORD Intake Platform

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-build
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    redis \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S acord -u 1001

# Set working directory
WORKDIR /app

# Copy backend build
COPY --from=backend-build --chown=acord:nodejs /app/dist ./backend/dist
COPY --from=backend-build --chown=acord:nodejs /app/node_modules ./backend/node_modules
COPY --from=backend-build --chown=acord:nodejs /app/package*.json ./backend/

# Copy frontend build
COPY --from=frontend-build --chown=acord:nodejs /app/dist ./frontend/dist
COPY --from=frontend-build --chown=acord:nodejs /app/public ./frontend/public

# Copy configuration files
COPY --chown=acord:nodejs docker/entrypoint.sh ./
COPY --chown=acord:nodejs docker/nginx.conf /etc/nginx/nginx.conf

# Install nginx
RUN apk add --no-cache nginx

# Create necessary directories
RUN mkdir -p /var/log/nginx /var/lib/nginx /app/uploads /app/logs
RUN chown -R acord:nodejs /var/log/nginx /var/lib/nginx /app/uploads /app/logs

# Switch to non-root user
USER acord

# Expose ports
EXPOSE 3001 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start services
ENTRYPOINT ["./entrypoint.sh"]

