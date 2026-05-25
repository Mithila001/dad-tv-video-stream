FROM node:20-slim AS builder
WORKDIR /app

# install deps and build
COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src
RUN npm ci && npm run build

FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json* ./
COPY --from=builder /app/dist ./dist
COPY assets ./assets

# Install ffmpeg (provides ffmpeg and ffprobe) for thumbnail and metadata extraction
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg \
	&& rm -rf /var/lib/apt/lists/*

RUN npm ci --production

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "dist/server.js"]
