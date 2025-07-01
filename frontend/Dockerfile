# Multi-stage build for production
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:1.27-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user (nginx user already exists in nginx:alpine image)
# Just ensure proper permissions for existing nginx user

# Change ownership of nginx directories and create necessary directories
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid && \
    chown -R nginx:nginx /usr/share/nginx/html

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Switch to non-root user
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
