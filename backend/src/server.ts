import express from "express";
import cors from "cors";
import http from "http";
import type { IncomingMessage } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import WebSocket, { WebSocketServer, type RawData } from "ws";

type VideoFormat = "MP4" | "MOV";
type LiveQueueStatus = "playing" | "upcoming";
type UserRole = "Network Operator" | "Viewer";

interface VideoAsset {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly duration: string;
  readonly size: string;
  readonly format: VideoFormat;
  readonly uploadDate: string;
  readonly thumbnailUrl: string;
  readonly videoUrl: string;
}

interface LiveQueueItem {
  readonly id: string;
  readonly title: string;
  readonly thumbnailUrl: string;
  readonly status: LiveQueueStatus;
  readonly startsInMinutes?: number;
  readonly sourceVideoId: string;
}

interface LoginRequestBody {
  readonly username?: string;
  readonly password?: string;
}

interface AuthenticatedUser {
  readonly username: string;
  readonly email: string;
  readonly role: UserRole;
}

type StreamControlCommand = "play" | "pause" | "next" | "previous";

interface StreamSyncResponse {
  readonly videoId: string;
  readonly videoUrl: string;
  readonly durationSeconds: number;
  readonly currentTime: number;
  readonly startedAtMs: number;
  readonly serverNowMs: number;
  readonly isPlaying: boolean;
}

type WebSocketClientKind = "tv" | "admin" | "unknown";

type WebSocketEvent =
  | {
      readonly type: "CLIENT_READY";
      readonly clientKind: WebSocketClientKind;
    }
  | {
      readonly type: "INITIAL_STATE";
      readonly stream: StreamSyncResponse | null;
      readonly assets: ReadonlyArray<VideoAsset>;
      readonly liveQueue: ReadonlyArray<LiveQueueItem>;
    }
  | {
      readonly type: "STREAM_SYNC";
      readonly command: StreamControlCommand;
      readonly stream: StreamSyncResponse;
    }
  | {
      readonly type: "ASSET_ADDED";
      readonly asset: VideoAsset;
    }
  | {
      readonly type: "HEARTBEAT";
      readonly serverTime: number;
    }
  | {
      readonly type: "QUEUE_UPDATE";
      readonly liveQueue: ReadonlyArray<LiveQueueItem>;
      readonly stream: StreamSyncResponse | null;
    };

const authUsers: ReadonlyArray<
  AuthenticatedUser & { readonly password: string }
> = [
  {
    username: "admin",
    password: "admin123",
    email: "admin@lobbystream.tv",
    role: "Network Operator",
  },
  {
    username: "tv-lobby",
    password: "tv123",
    email: "tv-lobby@lobbystream.tv",
    role: "Viewer",
  },
];

const app = express();
const port = 5000;
const server = http.createServer(app);
const wsServer = new WebSocketServer({ server, path: "/ws" });
const serverBaseUrl = "";

const assetsRootDir = path.resolve(__dirname, "../assets");
const videosDir = path.join(assetsRootDir, "videos");
const thumbsDir = path.join(assetsRootDir, "thumbnails");
const registryFilePath = path.join(videosDir, ".library.json");

fs.mkdirSync(assetsRootDir, { recursive: true });
fs.mkdirSync(videosDir, { recursive: true });
fs.mkdirSync(thumbsDir, { recursive: true });

function loadVideoLibrary(): VideoAsset[] {
  if (!fs.existsSync(registryFilePath)) {
    return [];
  }

  try {
    const rawContents = fs.readFileSync(registryFilePath, "utf8");
    const parsed = JSON.parse(rawContents) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is VideoAsset => {
      if (typeof entry !== "object" || entry === null) {
        return false;
      }

      const candidate = entry as Partial<VideoAsset>;

      return Boolean(
        candidate.id &&
        candidate.title &&
        candidate.category &&
        candidate.duration &&
        candidate.size &&
        candidate.format &&
        candidate.uploadDate &&
        candidate.thumbnailUrl &&
        candidate.videoUrl,
      );
    });
  } catch {
    return [];
  }
}

function persistVideoLibrary(library: ReadonlyArray<VideoAsset>) {
  fs.writeFileSync(registryFilePath, JSON.stringify(library, null, 2));
}

let availableAssets: VideoAsset[] = loadVideoLibrary();
const tvSockets = new Set<WebSocket>();
const adminSockets = new Set<WebSocket>();

interface QueueItem {
  readonly queueItemId: string;
  readonly asset: VideoAsset;
}

let liveQueue: QueueItem[] = availableAssets.map((asset, index) => ({
  queueItemId: `queue-init-${index}-${asset.id}`,
  asset,
}));

app.use(cors());
app.use(express.json());
app.use("/videos", express.static(videosDir));
app.use("/thumbnails", express.static(thumbsDir));

function safeSend(socket: WebSocket, payload: WebSocketEvent) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

function broadcastToAllClients(payload: WebSocketEvent) {
  for (const socket of tvSockets) {
    safeSend(socket, payload);
  }
  for (const socket of adminSockets) {
    safeSend(socket, payload);
  }
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, videosDir),
  filename: (_request, file, callback) => {
    const safe = file.originalname
      .replace(/[^a-z0-9.\-_]/gi, "-")
      .toLowerCase();
    callback(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!file.mimetype.startsWith("video/")) {
      callback(new Error("Only video uploads are allowed"));
      return;
    }

    callback(null, true);
  },
});

function durationToSeconds(duration: string): number {
  const [minutes = "0", seconds = "0"] = duration.split(":");
  return Number(minutes) * 60 + Number(seconds);
}

function formatDuration(durationSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

interface StreamRuntimeState {
  currentIndex: number;
  startedAtMs: number;
  durationSeconds: number;
  currentTimeSeconds: number;
  isPlaying: boolean;
}

const streamState: StreamRuntimeState = {
  currentIndex: 0,
  startedAtMs: Date.now(),
  durationSeconds: durationToSeconds(liveQueue[0]?.asset.duration ?? "0:00"),
  currentTimeSeconds: 0,
  isPlaying: true,
};

function syncStreamStateToPlaylist() {
  if (liveQueue.length === 0) {
    streamState.currentIndex = 0;
    streamState.durationSeconds = 0;
    streamState.currentTimeSeconds = 0;
    return;
  }

  if (streamState.currentIndex >= liveQueue.length) {
    streamState.currentIndex = 0;
  }

  streamState.durationSeconds = durationToSeconds(
    liveQueue[streamState.currentIndex]?.asset.duration ?? "0:00",
  );
  streamState.currentTimeSeconds = Math.min(
    streamState.currentTimeSeconds,
    streamState.durationSeconds,
  );
}

syncStreamStateToPlaylist();

function buildLiveQueue(): LiveQueueItem[] {
  return liveQueue.map((item, index) => ({
    id: item.queueItemId,
    title: item.asset.title,
    thumbnailUrl: item.asset.thumbnailUrl,
    status: index === streamState.currentIndex ? "playing" : "upcoming",
    startsInMinutes:
      index === streamState.currentIndex
        ? undefined
        : Math.max(0, (index - streamState.currentIndex) * 12),
    sourceVideoId: item.asset.id,
  }));
}

function getActiveVideo() {
  return liveQueue[streamState.currentIndex]?.asset ?? null;
}

function advanceStreamToNextVideo() {
  if (liveQueue.length === 0) {
    return;
  }

  streamState.currentIndex =
    (streamState.currentIndex + 1) % liveQueue.length;
  streamState.startedAtMs = Date.now();
  streamState.durationSeconds = durationToSeconds(
    liveQueue[streamState.currentIndex]?.asset.duration ?? "0:00",
  );
  streamState.currentTimeSeconds = 0;
  broadcastStreamSync("next");
}

function moveStreamByOffset(offset: number) {
  if (liveQueue.length === 0) {
    return;
  }

  const nextIndex =
    (streamState.currentIndex + offset + liveQueue.length) %
    liveQueue.length;
  streamState.currentIndex = nextIndex;
  streamState.startedAtMs = Date.now();
  streamState.durationSeconds = durationToSeconds(
    liveQueue[streamState.currentIndex]?.asset.duration ?? "0:00",
  );
  streamState.currentTimeSeconds = 0;
}

function buildSyncPayload() {
  const activeVideo = getActiveVideo();

  if (!activeVideo) {
    return null;
  }

  return {
    videoId: activeVideo.id,
    videoUrl: activeVideo.videoUrl,
    durationSeconds: streamState.durationSeconds,
    currentTime: streamState.currentTimeSeconds,
    startedAtMs: streamState.startedAtMs,
    serverNowMs: Date.now(),
    isPlaying: streamState.isPlaying,
  };
}

function broadcastStreamSync(command: StreamControlCommand) {
  const syncPayload = buildSyncPayload();

  if (!syncPayload) {
    return;
  }

  broadcastToAllClients({
    type: "STREAM_SYNC",
    command,
    stream: syncPayload,
  });
}

setInterval(() => {
  if (liveQueue.length === 0 || streamState.durationSeconds <= 0) {
    return;
  }

  if (!streamState.isPlaying) {
    return;
  }

  streamState.currentTimeSeconds += 1;
  streamState.startedAtMs += 1000;

  if (streamState.currentTimeSeconds >= streamState.durationSeconds) {
    advanceStreamToNextVideo();
  }
}, 1000);

app.get("/api/videos", (_request, response) => {
  response.json(availableAssets);
});

app.get("/api/queue", (_request, response) => {
  response.json(buildLiveQueue());
});

app.post(
  "/api/videos/upload",
  upload.single("file"),
  async (request, response) => {
    try {
      const title = String((request.body?.title as string) ?? "").trim();
      const file = request.file;

      if (!file) {
        response.status(400).json({ message: "No file uploaded" });
        return;
      }

      const filePath = file.path;

      const probe = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
        ffmpeg.ffprobe(
          filePath,
          (error: Error | null, data: ffmpeg.FfprobeData) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(data);
          },
        );
      });

      const durationSeconds = Math.max(
        0,
        Math.floor(Number(probe?.format?.duration ?? 0)),
      );

      const thumbnailFilename = `${path.parse(file.filename).name}-thumb.png`;

      await new Promise<void>((resolve, reject) => {
        ffmpeg(filePath)
          .screenshots({
            timestamps: ["50%"],
            filename: thumbnailFilename,
            folder: thumbsDir,
            size: "480x?",
          })
          .on("end", () => resolve())
          .on("error", (error: Error) => reject(error));
      });

      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      const format: VideoFormat = file.mimetype.includes("quicktime")
        ? "MOV"
        : "MP4";

      const newAsset: VideoAsset = {
        id: `uploaded-${Date.now()}`,
        title: title || file.originalname,
        category: "Uploaded",
        duration: formatDuration(durationSeconds),
        size: sizeStr,
        format,
        uploadDate: new Date().toISOString().slice(0, 10),
        thumbnailUrl: `${serverBaseUrl}/thumbnails/${thumbnailFilename}`,
        videoUrl: `${serverBaseUrl}/videos/${file.filename}`,
      };

      availableAssets.push(newAsset);
      persistVideoLibrary(availableAssets);
      
      const newQueueItem: QueueItem = {
        queueItemId: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        asset: newAsset,
      };
      liveQueue.push(newQueueItem);
      
      syncStreamStateToPlaylist();
      
      broadcastToAllClients({
        type: "ASSET_ADDED",
        asset: newAsset,
      });
      
      broadcastToAllClients({
        type: "QUEUE_UPDATE",
        liveQueue: buildLiveQueue(),
        stream: buildSyncPayload(),
      });

      response.status(201).json({ video: newAsset });
    } catch (error) {
      console.error("Upload failed:", error);

      if (request.file?.path && fs.existsSync(request.file.path)) {
        fs.unlinkSync(request.file.path);
      }

      response.status(500).json({ message: "Upload failed" });
    }
  },
);

app.post("/api/queue/reorder", (request, response) => {
  const { orderedIds } = request.body as { orderedIds?: string[] };
  if (!Array.isArray(orderedIds)) {
    response.status(400).json({ message: "Invalid payload: orderedIds must be an array" });
    return;
  }

  const playingItem = liveQueue[streamState.currentIndex];
  const itemMap = new Map(liveQueue.map((item) => [item.queueItemId, item]));

  const newQueue: QueueItem[] = [];
  for (const id of orderedIds) {
    const item = itemMap.get(id);
    if (item) {
      newQueue.push(item);
    }
  }

  // Add any items that were not included in orderedIds
  for (const item of liveQueue) {
    if (!newQueue.some((q) => q.queueItemId === item.queueItemId)) {
      newQueue.push(item);
    }
  }

  // Ensure the currently playing item stays locked at the playing index
  if (playingItem) {
    const playingIndexInNew = newQueue.findIndex((q) => q.queueItemId === playingItem.queueItemId);
    if (playingIndexInNew !== -1 && playingIndexInNew !== streamState.currentIndex) {
      newQueue.splice(playingIndexInNew, 1);
      newQueue.splice(streamState.currentIndex, 0, playingItem);
    }
  }

  liveQueue = newQueue;

  const syncPayload = buildSyncPayload();
  broadcastToAllClients({
    type: "QUEUE_UPDATE",
    liveQueue: buildLiveQueue(),
    stream: syncPayload,
  });

  response.json({ success: true, queue: buildLiveQueue() });
});

app.post("/api/queue/delete", (request, response) => {
  const { itemId } = request.body as { itemId?: string };
  if (!itemId) {
    response.status(400).json({ message: "Invalid payload: itemId is required" });
    return;
  }

  const itemIndex = liveQueue.findIndex((item) => item.queueItemId === itemId);
  if (itemIndex === -1) {
    response.status(404).json({ message: "Queue item not found" });
    return;
  }

  if (itemIndex === streamState.currentIndex) {
    response.status(400).json({ message: "Cannot delete the currently playing item" });
    return;
  }

  liveQueue.splice(itemIndex, 1);

  if (itemIndex < streamState.currentIndex) {
    streamState.currentIndex = Math.max(0, streamState.currentIndex - 1);
  }

  const syncPayload = buildSyncPayload();
  broadcastToAllClients({
    type: "QUEUE_UPDATE",
    liveQueue: buildLiveQueue(),
    stream: syncPayload,
  });

  response.json({ success: true, queue: buildLiveQueue() });
});

app.post("/api/queue/append-playlist", (request, response) => {
  const { assetIds } = request.body as { assetIds?: string[] };
  if (!Array.isArray(assetIds)) {
    response.status(400).json({ message: "Invalid payload: assetIds must be an array" });
    return;
  }

  const addedItems: QueueItem[] = [];
  for (const id of assetIds) {
    const asset = availableAssets.find((a) => a.id === id);
    if (asset) {
      addedItems.push({
        queueItemId: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        asset,
      });
    }
  }

  liveQueue.push(...addedItems);

  // If the queue was empty, make sure we sync playback duration & current index
  if (liveQueue.length === addedItems.length) {
    streamState.currentIndex = 0;
    streamState.startedAtMs = Date.now();
    streamState.durationSeconds = durationToSeconds(liveQueue[0].asset.duration);
    streamState.currentTimeSeconds = 0;
  }

  const syncPayload = buildSyncPayload();
  broadcastToAllClients({
    type: "QUEUE_UPDATE",
    liveQueue: buildLiveQueue(),
    stream: syncPayload,
  });

  response.json({ success: true, queue: buildLiveQueue() });
});

app.post("/api/queue/play-playlist", (request, response) => {
  const { assetIds } = request.body as { assetIds?: string[] };
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    response.status(400).json({ message: "Invalid payload: assetIds must be a non-empty array" });
    return;
  }

  const newQueue: QueueItem[] = [];
  for (const id of assetIds) {
    const asset = availableAssets.find((a) => a.id === id);
    if (asset) {
      newQueue.push({
        queueItemId: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        asset,
      });
    }
  }

  if (newQueue.length === 0) {
    response.status(400).json({ message: "No valid assets found to play" });
    return;
  }

  liveQueue = newQueue;
  streamState.currentIndex = 0;
  streamState.startedAtMs = Date.now();
  streamState.durationSeconds = durationToSeconds(liveQueue[0].asset.duration);
  streamState.currentTimeSeconds = 0;
  streamState.isPlaying = true;

  const syncPayload = buildSyncPayload();
  broadcastToAllClients({
    type: "QUEUE_UPDATE",
    liveQueue: buildLiveQueue(),
    stream: syncPayload,
  });

  if (syncPayload) {
    broadcastToAllClients({
      type: "STREAM_SYNC",
      command: "play",
      stream: syncPayload,
    });
  }

  response.json({ success: true, queue: buildLiveQueue(), stream: syncPayload });
});

app.post("/api/queue/jump", (request, response) => {
  const { itemId } = request.body as { itemId?: string };
  if (!itemId) {
    response.status(400).json({ message: "Invalid payload: itemId is required" });
    return;
  }

  const itemIndex = liveQueue.findIndex((item) => item.queueItemId === itemId);
  if (itemIndex === -1) {
    response.status(404).json({ message: "Queue item not found" });
    return;
  }

  streamState.currentIndex = itemIndex;
  streamState.startedAtMs = Date.now();
  streamState.durationSeconds = durationToSeconds(liveQueue[itemIndex].asset.duration);
  streamState.currentTimeSeconds = 0;
  streamState.isPlaying = true;

  const syncPayload = buildSyncPayload();
  broadcastToAllClients({
    type: "QUEUE_UPDATE",
    liveQueue: buildLiveQueue(),
    stream: syncPayload,
  });

  if (syncPayload) {
    broadcastToAllClients({
      type: "STREAM_SYNC",
      command: "play",
      stream: syncPayload,
    });
  }

  response.json({ success: true, queue: buildLiveQueue(), stream: syncPayload });
});

app.get("/api/stream/sync", (_request, response) => {
  const syncPayload = buildSyncPayload();

  if (!syncPayload) {
    response
      .status(503)
      .json({ message: "No active stream video available in queue." });
    return;
  }

  response.json(syncPayload);
});

app.post("/api/stream/control", (request, response) => {
  const { command } = request.body as {
    command?: "pause" | "play" | "next" | "previous";
  };

  if (!["pause", "play", "next", "previous"].includes(command ?? "")) {
    response.status(400).json({
      message: "Invalid command. Use play, pause, next, or previous.",
    });
    return;
  }

  if (command === "play") {
    streamState.isPlaying = true;
  }

  if (command === "pause") {
    streamState.isPlaying = false;
  }

  if (command === "next") {
    moveStreamByOffset(1);
  }

  if (command === "previous") {
    moveStreamByOffset(-1);
  }

  const syncPayload = buildSyncPayload();

  if (!syncPayload) {
    response
      .status(503)
      .json({ message: "No active stream video available in queue." });
    return;
  }

  broadcastStreamSync(command as StreamControlCommand);
  response.json(syncPayload);
});

app.post("/api/login", (request, response) => {
  const { username = "", password = "" } = request.body as LoginRequestBody;
  const currentUser = authUsers.find(
    (entry) => entry.username === username && entry.password === password,
  );

  if (!currentUser) {
    response.status(401).json({ message: "Invalid credentials" });
    return;
  }

  response.json({
    currentUser: {
      username: currentUser.username,
      email: currentUser.email,
      role: currentUser.role,
    },
  });
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        response.status(413).json({
          message: "Video exceeds the 500MB upload limit.",
        });
        return;
      }
    }

    if (
      error instanceof Error &&
      error.message === "Only video uploads are allowed"
    ) {
      response.status(400).json({ message: error.message });
      return;
    }

    next(error);
  },
);

wsServer.on("connection", (socket: WebSocket, request: IncomingMessage) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const clientKind = (url.searchParams.get("client") ?? "unknown") as WebSocketClientKind;

  if (clientKind === "tv") {
    tvSockets.add(socket);
  } else if (clientKind === "admin") {
    adminSockets.add(socket);
  }

  safeSend(socket, {
    type: "CLIENT_READY",
    clientKind,
  });

  safeSend(socket, {
    type: "INITIAL_STATE",
    stream: buildSyncPayload(),
    assets: availableAssets,
    liveQueue: buildLiveQueue(),
  });

  socket.on("message", (data: RawData) => {
    try {
      const parsed = JSON.parse(data.toString()) as Partial<WebSocketEvent> & {
        readonly type?: string;
      };

      if (parsed.type === "CLIENT_READY") {
        safeSend(socket, {
          type: "INITIAL_STATE",
          stream: buildSyncPayload(),
          assets: availableAssets,
          liveQueue: buildLiveQueue(),
        });
      }
    } catch {
      // Ignore malformed socket messages.
    }
  });

  socket.on("close", () => {
    tvSockets.delete(socket);
    adminSockets.delete(socket);
  });
});

wsServer.on("close", () => {
  tvSockets.clear();
  adminSockets.clear();
});

const heartbeatTimer = setInterval(() => {
  for (const socket of tvSockets) {
    if (socket.readyState !== WebSocket.OPEN) {
      tvSockets.delete(socket);
      continue;
    }

    safeSend(socket, {
      type: "HEARTBEAT",
      serverTime: Date.now(),
    });
  }

  for (const socket of adminSockets) {
    if (socket.readyState !== WebSocket.OPEN) {
      adminSockets.delete(socket);
      continue;
    }

    safeSend(socket, {
      type: "HEARTBEAT",
      serverTime: Date.now(),
    });
  }
}, 15000);

server.on("close", () => {
  clearInterval(heartbeatTimer);
});

server.listen(port, () => {
  console.log(`LobbyStream API listening on http://localhost:${port}`);
});
