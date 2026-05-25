import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";

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
const serverBaseUrl = "";

const assetsRootDir = path.resolve(__dirname, "../assets");
const videosDir = path.join(assetsRootDir, "videos");
const thumbsDir = path.join(assetsRootDir, "thumbnails");
const registryFilePath = path.join(assetsRootDir, "library.json");

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

app.use(cors());
app.use(express.json());
app.use("/videos", express.static(videosDir));
app.use("/thumbnails", express.static(thumbsDir));

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
  durationSeconds: durationToSeconds(availableAssets[0]?.duration ?? "0:00"),
  currentTimeSeconds: 0,
  isPlaying: true,
};

function syncStreamStateToPlaylist() {
  if (availableAssets.length === 0) {
    streamState.currentIndex = 0;
    streamState.durationSeconds = 0;
    streamState.currentTimeSeconds = 0;
    return;
  }

  if (streamState.currentIndex >= availableAssets.length) {
    streamState.currentIndex = 0;
  }

  streamState.durationSeconds = durationToSeconds(
    availableAssets[streamState.currentIndex]?.duration ?? "0:00",
  );
  streamState.currentTimeSeconds = Math.min(
    streamState.currentTimeSeconds,
    streamState.durationSeconds,
  );
}

syncStreamStateToPlaylist();

function buildLiveQueue(): LiveQueueItem[] {
  return availableAssets.map((video, index) => ({
    id: `live-${video.id}`,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl,
    status: index === streamState.currentIndex ? "playing" : "upcoming",
    startsInMinutes:
      index === streamState.currentIndex
        ? undefined
        : Math.max(0, (index - streamState.currentIndex) * 12),
    sourceVideoId: video.id,
  }));
}

function getActiveVideo() {
  return availableAssets[streamState.currentIndex] ?? null;
}

function advanceStreamToNextVideo() {
  if (availableAssets.length === 0) {
    return;
  }

  streamState.currentIndex =
    (streamState.currentIndex + 1) % availableAssets.length;
  streamState.startedAtMs = Date.now();
  streamState.durationSeconds = durationToSeconds(
    availableAssets[streamState.currentIndex]?.duration ?? "0:00",
  );
  streamState.currentTimeSeconds = 0;
}

function moveStreamByOffset(offset: number) {
  if (availableAssets.length === 0) {
    return;
  }

  const nextIndex =
    (streamState.currentIndex + offset + availableAssets.length) %
    availableAssets.length;
  streamState.currentIndex = nextIndex;
  streamState.startedAtMs = Date.now();
  streamState.durationSeconds = durationToSeconds(
    availableAssets[streamState.currentIndex]?.duration ?? "0:00",
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

setInterval(() => {
  if (availableAssets.length === 0 || streamState.durationSeconds <= 0) {
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
      syncStreamStateToPlaylist();

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

app.listen(port, () => {
  console.log(`LobbyStream API listening on http://localhost:${port}`);
});
