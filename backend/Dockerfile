FROM node:20-alpine AS builder
WORKDIR /app

# install deps and build
COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src
RUN npm ci && npm run build

FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
COPY --from=builder /app/dist ./dist
COPY assets ./assets

RUN npm ci --production

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "dist/server.js"]
