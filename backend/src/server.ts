import express from "express";
import cors from "cors";
import path from "path";
import {
  type LiveQueueItem,
  type VideoAsset,
  type VideoFormat,
  liveQueueSequence,
  resolveLogin,
  videoLibrary,
  type LoginRequestBody,
} from "./mockData";

const app = express();
const port = 5000;
const serverBaseUrl = "";
const availableAssets: VideoAsset[] = videoLibrary.map((asset) => ({
  ...asset,
}));
const runtimeQueue: LiveQueueItem[] = liveQueueSequence.map((item) => ({
  ...item,
}));

const stagedVideoSources = new Map<
  string,
  {
    readonly thumbnailUrl: string;
    readonly size: string;
    readonly format: VideoFormat;
  }
>(
  ["video_1.mp4", "video_2.mp4"].map((fileName) => {
    const videoUrl = `${serverBaseUrl}/videos/${fileName}`;
    const sourceAsset = availableAssets.find(
      (asset) => asset.videoUrl === videoUrl,
    );

    return [
      videoUrl,
      {
        thumbnailUrl:
          sourceAsset?.thumbnailUrl ?? availableAssets[0]?.thumbnailUrl ?? "",
        size: sourceAsset?.size ?? "1.0 GB",
        format: sourceAsset?.format ?? "MP4",
      },
    ] as const;
  }),
);

interface UploadVideoRequestBody {
  readonly title?: string;
  readonly category?: string;
  readonly durationSeconds?: number;
  readonly videoUrl?: string;
}

app.use(cors());
app.use(express.json());
app.use("/videos", express.static(path.resolve(__dirname, "../assets/videos")));

function durationToSeconds(duration: string): number {
  const [minutes = "0", seconds = "0"] = duration.split(":");
  return Number(minutes) * 60 + Number(seconds);
}

function getStreamPlaylist(): VideoAsset[] {
  return runtimeQueue
    .map((queueItem) =>
      availableAssets.find((video) => video.id === queueItem.sourceVideoId),
    )
    .filter((video): video is VideoAsset => Boolean(video));
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
  durationSeconds: durationToSeconds(
    getStreamPlaylist()[0]?.duration ?? "0:00",
  ),
  currentTimeSeconds: 0,
  isPlaying: true,
};

function formatDuration(durationSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createQueueItem(video: VideoAsset): LiveQueueItem {
  return {
    id: `live-${video.id}`,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl,
    status: "upcoming",
    sourceVideoId: video.id,
  };
}

function updateRuntimeQueue() {
  // Keep the live queue order stable; stream timing is tracked separately.
  return;
}

function advanceStreamToNextVideo() {
  const streamPlaylist = getStreamPlaylist();

  if (streamPlaylist.length === 0) {
    return;
  }

  streamState.currentIndex =
    (streamState.currentIndex + 1) % streamPlaylist.length;
  streamState.startedAtMs = Date.now();
  streamState.durationSeconds = durationToSeconds(
    streamPlaylist[streamState.currentIndex]?.duration ?? "0:00",
  );
  streamState.currentTimeSeconds = 0;
}

function moveStreamByOffset(offset: number) {
  const streamPlaylist = getStreamPlaylist();

  if (streamPlaylist.length === 0) {
    return;
  }

  const nextIndex =
    (streamState.currentIndex + offset + streamPlaylist.length) %
    streamPlaylist.length;
  streamState.currentIndex = nextIndex;
  streamState.startedAtMs = Date.now();
  streamState.durationSeconds = durationToSeconds(
    streamPlaylist[streamState.currentIndex]?.duration ?? "0:00",
  );
  streamState.currentTimeSeconds = 0;
}

function buildSyncPayload() {
  const streamPlaylist = getStreamPlaylist();
  const activeVideo = streamPlaylist[streamState.currentIndex];

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

setInterval(() => {
  const streamPlaylist = getStreamPlaylist();

  if (streamPlaylist.length === 0 || streamState.durationSeconds <= 0) {
    return;
  }

  if (!streamState.isPlaying) {
    return;
  }

  streamState.currentTimeSeconds += 1;
  streamState.startedAtMs += 1000;

  if (streamState.currentTimeSeconds >= streamState.durationSeconds) {
    advanceStreamToNextVideo();
    return;
  }
}, 1000);

app.get("/api/videos", (_request, response) => {
  response.json(availableAssets);
});

app.get("/api/queue", (_request, response) => {
  response.json(runtimeQueue);
});

app.post("/api/videos/upload", (request, response) => {
  const {
    title = "",
    category = "",
    durationSeconds,
    videoUrl = "",
  } = request.body as UploadVideoRequestBody;
  const safeDurationSeconds = Number(durationSeconds);

  const normalizedTitle = title.trim();
  const normalizedCategory = category.trim();

  if (
    !normalizedTitle ||
    !normalizedCategory ||
    !Number.isFinite(safeDurationSeconds) ||
    !videoUrl
  ) {
    response.status(400).json({
      message:
        "Invalid upload payload. Provide title, category, durationSeconds, and videoUrl.",
    });
    return;
  }

  const sourceAsset = stagedVideoSources.get(videoUrl);

  if (!sourceAsset) {
    response.status(400).json({
      message: "Invalid videoUrl. Choose one of the staged local video files.",
    });
    return;
  }

  const newAsset: VideoAsset = {
    id: `uploaded-${normalizedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    title: normalizedTitle,
    category: normalizedCategory,
    duration: formatDuration(Math.max(1, Math.floor(safeDurationSeconds))),
    size: sourceAsset.size,
    format: sourceAsset.format,
    uploadDate: new Date().toISOString().slice(0, 10),
    thumbnailUrl: sourceAsset.thumbnailUrl,
    videoUrl,
  };

  availableAssets.push(newAsset);
  runtimeQueue.push(createQueueItem(newAsset));
  updateRuntimeQueue();

  response.status(201).json({ video: newAsset });
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

  response.json(syncPayload);
});

app.post("/api/login", (request, response) => {
  const { username = "", password = "" } = request.body as LoginRequestBody;
  const currentUser = resolveLogin(username, password);

  if (!currentUser) {
    response.status(401).json({ message: "Invalid credentials" });
    return;
  }

  response.json({ currentUser });
});

app.listen(port, () => {
  console.log(`LobbyStream API listening on http://localhost:${port}`);
});
