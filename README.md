# DAD TV Video Stream

A simple video streaming and media management platform for internal TV displays and web clients.

## Overview

This repository contains a TypeScript/React frontend and a TypeScript Node backend for uploading, managing, and streaming video content to web and TV display clients. The project is containerized with Docker and includes deployment helpers.

## Tech Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS
- Backend: Node.js, TypeScript (Express-style server in `backend/src/server.ts`)
- Real-time: WebSockets for stream control and signalling
- Storage: Local filesystem for videos, thumbnails (configured under `backend/assets/`)
- Dev / Infra: Docker, Docker Compose, nginx (frontend Dockerfile + `nginx.conf`), deployment scripts (`vm-deploy.sh`, `cloud-init.yaml`)

## Basic Features

- Upload and manage videos (Media Library)
- Create and manage playlists
- Live queue and stream-now controls for scheduled playback
- TV Display mode for fullscreen playback on dedicated devices
- Role-based access and authentication (basic Gate components present)
- Automatic thumbnail generation and assets library
- API client in frontend: `frontend/src/services/api.ts`

## Quick Start (development)

1. Start backend

```powershell
cd backend
npm install
npm run dev
```

2. Start frontend

```powershell
cd frontend
npm install
npm run dev
```

3. Or run with Docker Compose

```powershell
docker compose up --build
```

## Useful Paths

- Backend server: `backend/src/server.ts`
- Frontend entry: `frontend/src/main.tsx`
- Stream protocol docs: `STREAM_PROTOCOL.md`
- Deployment: `vm-deploy.sh`, `cloud-init.yaml`, `docker-compose.yml`

## Contributing

Contributions welcome — open an issue or PR describing the change.

## License

MIT (or specify your preferred license)
