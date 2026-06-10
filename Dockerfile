# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* frontend/tsconfig*.json frontend/vite.config.ts frontend/index.html ./
COPY frontend/public ./public
COPY frontend/src ./src
RUN npm ci && npm run build

# Stage 2: Build Backend
FROM node:20-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* backend/tsconfig.json ./
COPY backend/src ./src
RUN npm ci && npm run build

# Stage 3: Runtime
FROM node:20-slim
WORKDIR /app

# Install Nginx and ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy backend built files and install production dependencies
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd ./backend && npm ci --production

# Copy frontend built files to Nginx web root
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# Copy Nginx config (use standard default site path)
COPY frontend/nginx.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Update Nginx config to proxy to local node process instead of "backend" hostname
RUN sed -i 's/http:\/\/backend:5000/http:\/\/127.0.0.1:5000/g' /etc/nginx/sites-available/default

# Update Nginx root path in Nginx config to match /var/www/html
RUN sed -i 's/\/usr\/share\/nginx\/html/\/var\/www\/html/g' /etc/nginx/sites-available/default

# Setup persistent directory paths
RUN mkdir -p /app/assets/videos /app/assets/thumbnails
# Symlink Nginx video/thumbnail paths to matching backend asset dirs
RUN ln -sf /app/assets/videos /var/www/html/videos && \
    ln -sf /app/assets/thumbnails /var/www/html/thumbnails

EXPOSE 80

# Start script to run both Nginx and Node backend
CMD service nginx start && node backend/dist/server.js
