# Stream Socket Protocol

This project uses a small WebSocket contract for live stream synchronization between the backend, admin UI, and TV client.

## Connection

Clients connect to:

- `ws://<host>/ws?client=tv`
- `ws://<host>/ws?client=admin`

## Event Types

### `CLIENT_READY`
Sent by a client after the socket opens.

```json
{
  "type": "CLIENT_READY",
  "clientKind": "tv"
}
```

### `INITIAL_STATE`
Sent by the backend on connect so clients can hydrate immediately.

```json
{
  "type": "INITIAL_STATE",
  "stream": {
    "videoId": "uploaded-123",
    "videoUrl": "/videos/example.mp4",
    "durationSeconds": 320,
    "currentTime": 12,
    "startedAtMs": 1710000000000,
    "serverNowMs": 1710000001000,
    "isPlaying": true
  },
  "assets": []
}
```

### `STREAM_SYNC`
Broadcast after play, pause, next, or previous control actions.

```json
{
  "type": "STREAM_SYNC",
  "command": "pause",
  "stream": {
    "videoId": "uploaded-123",
    "videoUrl": "/videos/example.mp4",
    "durationSeconds": 320,
    "currentTime": 18,
    "startedAtMs": 1710000002000,
    "serverNowMs": 1710000002000,
    "isPlaying": false
  }
}
```

### `ASSET_ADDED`
Broadcast when a new upload is persisted.

```json
{
  "type": "ASSET_ADDED",
  "asset": {
    "id": "uploaded-123",
    "title": "New Clip",
    "category": "Uploaded",
    "duration": "05:20",
    "size": "12.40 MB",
    "format": "MP4",
    "uploadDate": "2026-05-25",
    "thumbnailUrl": "/thumbnails/example-thumb.png",
    "videoUrl": "/videos/example.mp4"
  }
}
```

### `HEARTBEAT`
Sent periodically by the backend so receivers can mark the connection as alive.

```json
{
  "type": "HEARTBEAT",
  "serverTime": 1710000005000
}
```

## Rules

- REST remains the source of truth for uploads and control routes.
- WebSockets are used only for push updates and instant synchronization.
- TV clients should apply `STREAM_SYNC` immediately to the HTML5 video element.
- Admin clients should update their dashboard, queue, and library views from the same pushed state.
