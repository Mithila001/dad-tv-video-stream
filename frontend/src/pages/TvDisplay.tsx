import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  WifiOff,
  RadioTower,
  AlertCircle,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  fetchStreamSync,
  fetchVideoLibrary,
  getWebSocketUrl,
  type StreamSyncResponse,
  type VideoAsset,
} from "../services/api";
import type { StreamSocketMessage } from "../types/streamProtocol";

type ConnectionState = "connecting" | "connected" | "reconnecting" | "offline";

function clampTime(target: number, durationSeconds: number) {
  const maxTime = Math.max(0, durationSeconds - 0.25);
  return Math.max(0, Math.min(target, maxTime));
}

export function TvDisplay() {
  const [playlist, setPlaylist] = useState<ReadonlyArray<VideoAsset>>([]);
  const [activeSync, setActiveSync] = useState<StreamSyncResponse | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    "connecting",
  );
  const [lastEvent, setLastEvent] = useState<string>("Connecting to stream sync...");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerShellRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectDelayRef = useRef(1000);
  const connectSocketRef = useRef<() => void>(() => undefined);
  const pendingSeekRef = useRef<number | null>(null);

  const activeVideo = useMemo(() => {
    if (!activeSync) {
      return playlist[0] ?? null;
    }

    return (
      playlist.find((video) => video.id === activeSync.videoId) ?? playlist[0] ?? null
    );
  }, [activeSync, playlist]);

  const videoSource = activeVideo?.videoUrl ?? activeSync?.videoUrl ?? undefined;

  const applySyncState = useCallback((syncState: StreamSyncResponse) => {
    setActiveSync(syncState);
    pendingSeekRef.current = syncState.currentTime;
    setLastEvent(
      `STREAM_SYNC ${syncState.isPlaying ? "play" : "pause"} ${Math.floor(
        syncState.currentTime,
      )}s`,
    );
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    const nextDelay = Math.min(reconnectDelayRef.current, 10000);
    setConnectionState("reconnecting");
    setLastEvent(`Reconnecting in ${Math.round(nextDelay / 1000)}s...`);

    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 10000);
      connectSocketRef.current();
    }, nextDelay);
  }, []);

  const connectSocket = useCallback(async () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setConnectionState("connecting");
    setLastEvent("Opening live socket...");

    const socket = new WebSocket(getWebSocketUrl("/ws", "tv"));
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectDelayRef.current = 1000;
      setConnectionState("connected");
      setLastEvent("Connected to backend stream sync");
      socket.send(JSON.stringify({ type: "CLIENT_READY", clientKind: "tv" }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as StreamSocketMessage;

        switch (message.type) {
          case "CLIENT_READY":
            return;
          case "HEARTBEAT":
            setLastEvent(`Heartbeat ${new Date(message.serverTime).toLocaleTimeString()}`);
            return;
          case "INITIAL_STATE":
            setPlaylist(message.assets);
            if (message.stream) {
              applySyncState(message.stream);
            }
            return;
          case "STREAM_SYNC":
            applySyncState(message.stream);
            return;
          case "ASSET_ADDED":
            setPlaylist((current) => {
              if (current.some((asset) => asset.id === message.asset.id)) {
                return current;
              }

              return [...current, message.asset];
            });
            setLastEvent(`ASSET_ADDED ${message.asset.title}`);
            return;
          default:
            return;
        }
      } catch {
        setLastEvent("Ignored malformed websocket payload");
      }
    };

    socket.onerror = () => {
      setConnectionState("offline");
      setLastEvent("Socket error, attempting reconnect...");
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      setConnectionState("offline");
      scheduleReconnect();
    };
  }, [applySyncState, scheduleReconnect]);

  useEffect(() => {
    connectSocketRef.current = connectSocket;
  }, [connectSocket]);

  useEffect(() => {
    let isActive = true;

    async function hydrateInitialState() {
      const [videos, syncState] = await Promise.all([
        fetchVideoLibrary(),
        fetchStreamSync().catch(() => null),
      ]);

      if (!isActive) {
        return;
      }

      setPlaylist(videos.filter((video) => Boolean(video.videoUrl)));
      if (syncState) {
        applySyncState(syncState);
      }
    }

    void hydrateInitialState();
    void connectSocket();

    return () => {
      isActive = false;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, [applySyncState, connectSocket]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !videoSource) {
      return;
    }

    const handleLoadedMetadata = () => {
      if (pendingSeekRef.current !== null) {
        videoElement.currentTime = clampTime(
          pendingSeekRef.current,
          Number.isFinite(videoElement.duration) ? videoElement.duration : 0,
        );
        pendingSeekRef.current = null;
      }

      if (activeSync?.isPlaying) {
        void videoElement.play().catch(() => undefined);
      } else {
        videoElement.pause();
      }
    };

    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);

    if (videoElement.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [activeSync?.currentTime, activeSync?.isPlaying, videoSource]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    if (activeSync?.isPlaying) {
      void videoElement.play().catch(() => undefined);
      return;
    }

    videoElement.pause();
  }, [activeSync?.isPlaying, videoSource]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !activeSync) {
      return;
    }

    const driftSeconds = Math.abs(videoElement.currentTime - activeSync.currentTime);
    if (driftSeconds > 1.25) {
      videoElement.currentTime = clampTime(
        activeSync.currentTime,
        Number.isFinite(videoElement.duration) ? videoElement.duration : 0,
      );
    }
  }, [activeSync?.currentTime, activeSync?.videoId, activeSync]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const target = playerShellRef.current ?? videoRef.current;

    if (!target) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await target.requestFullscreen();
  }, []);

  const handleEnableAudio = useCallback(async () => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.muted = false;
    videoElement.volume = 1;
    setIsMuted(false);
    await videoElement.play().catch(() => undefined);
  }, []);

  const handleToggleMute = useCallback(() => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    const nextMuted = !videoElement.muted;
    videoElement.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              TV Playback Receiver
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              Live Stream Output
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <button
              type="button"
              onClick={handleToggleMute}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              {isMuted ? "Muted" : "Audio On"}
            </button>
            <button
              type="button"
              onClick={() => void handleToggleFullscreen()}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>
            {connectionState === "connected" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300 ring-1 ring-emerald-400/25">
                <RadioTower className="h-4 w-4" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-amber-300 ring-1 ring-amber-400/25">
                <WifiOff className="h-4 w-4" /> {connectionState}
              </span>
            )}
            <span className="rounded-full bg-white/10 px-3 py-1">Videos: {playlist.length}</span>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
          <div
            ref={playerShellRef}
            className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 shadow-2xl shadow-black/40"
          >
            <div className="relative">
              {videoSource ? (
                <video
                  key={videoSource}
                  ref={videoRef}
                  src={videoSource}
                  className="aspect-video w-full bg-black object-cover"
                  autoPlay
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  onVolumeChange={() => setIsMuted(Boolean(videoRef.current?.muted))}
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-neutral-900 text-sm text-white/60">
                  Waiting for a playable video
                </div>
              )}

              {isMuted ? (
                <div className="absolute inset-0 flex items-end justify-center p-4">
                  <button
                    type="button"
                    onClick={() => void handleEnableAudio()}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg transition hover:bg-white/90"
                  >
                    <Volume2 className="h-4 w-4" />
                    Click to Enable Audio
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                Connection Status
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{connectionState}</p>
              <p className="mt-1 text-sm text-white/70">{lastEvent}</p>
              <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/80">
                <p>
                  <span className="font-semibold text-white">Now showing:</span>{" "}
                  {activeVideo?.title ?? "No active stream"}
                </p>
                <p>
                  <span className="font-semibold text-white">Playback:</span>{" "}
                  {activeSync?.isPlaying ? "Playing" : "Paused"}
                </p>
                <p>
                  <span className="font-semibold text-white">Timeline:</span>{" "}
                  {activeSync
                    ? `${Math.floor(activeSync.currentTime / 60)}:${String(
                        Math.floor(activeSync.currentTime % 60),
                      ).padStart(2, "0")} / ${Math.floor(
                        activeSync.durationSeconds / 60,
                      )}:${String(Math.floor(activeSync.durationSeconds % 60)).padStart(
                        2,
                        "0",
                      )}`
                    : "Waiting for sync"}
                </p>
                <p>
                  <span className="font-semibold text-white">Broadcast health:</span>{" "}
                  {connectionState === "connected"
                    ? "Live and stable"
                    : "Reconnecting"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                Available Video List
              </p>
              <div className="mt-3 space-y-2">
                {playlist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2"
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="text-xs text-white/60">
                        {item.duration} • {item.format}
                      </p>
                    </div>
                  </div>
                ))}
                {playlist.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/60">
                    Waiting for the first asset broadcast.
                  </div>
                ) : null}
              </div>
            </div>

            {!activeVideo ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                <AlertCircle className="mb-2 h-4 w-4" /> No active asset yet.
              </div>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
