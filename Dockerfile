# Base image: Node.js 20 (Alpine for smaller size)
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies first (leverage Docker cache)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Multi-stage build for a smaller, secure runtime image
FROM node:20-alpine

# Security: Run as non-root user
RUN addgroup -S astra && adduser -S astra -G astra
WORKDIR /app
RUN chown astra:astra /app

# Copy from builder
COPY --from=builder /app /app

# Switch to non-root user
USER astra

# Expose backend port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
