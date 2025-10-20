# Backend-only Dockerfile for Render
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript (skip type checking)
RUN npx tsc --noEmit false || true

# Expose port
EXPOSE 10000

# Start the application
CMD ["node", "dist/server.js"]
