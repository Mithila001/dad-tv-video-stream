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
    <main className="tv-main">
      <div className="tv-container">
        <header className="tv-header">
          <div>
            <p className="tv-header-title-sub">
              TV Playback Receiver
            </p>
            <h1 className="tv-header-title">
              Live Stream Output
            </h1>
          </div>
          <div className="tv-header-controls">
            <button
              type="button"
              onClick={handleToggleMute}
              className="tv-btn"
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
              className="tv-btn"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>
            {connectionState === "connected" ? (
              <span className="tv-status-badge tv-status-connected">
                <RadioTower className="h-4 w-4" /> Connected
              </span>
            ) : (
              <span className="tv-status-badge tv-status-disconnected">
                <WifiOff className="h-4 w-4" /> {connectionState}
              </span>
            )}
            <span className="tv-badge-count">Videos: {playlist.length}</span>
          </div>
        </header>

        <section className="tv-grid">
          <div
            ref={playerShellRef}
            className="tv-player-shell"
          >
            <div className="tv-video-container">
              {videoSource ? (
                <video
                  key={videoSource}
                  ref={videoRef}
                  src={videoSource}
                  className="tv-video"
                  autoPlay
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  onVolumeChange={() => setIsMuted(Boolean(videoRef.current?.muted))}
                />
              ) : (
                <div className="tv-no-video">
                  Waiting for a playable video
                </div>
              )}

              {isMuted ? (
                <div className="tv-unmute-overlay">
                  <button
                    type="button"
                    onClick={() => void handleEnableAudio()}
                    className="tv-unmute-btn"
                  >
                    <Volume2 className="h-4 w-4" />
                    Click to Enable Audio
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="tv-aside">
            <div>
              <p className="tv-section-title">
                Connection Status
              </p>
              <p className="tv-status-title">{connectionState}</p>
              <p className="tv-status-desc">{lastEvent}</p>
              <div className="tv-info-panel">
                <p>
                  <span className="tv-info-label">Now showing:</span>{" "}
                  {activeVideo?.title ?? "No active stream"}
                </p>
                <p>
                  <span className="tv-info-label">Playback:</span>{" "}
                  {activeSync?.isPlaying ? "Playing" : "Paused"}
                </p>
                <p>
                  <span className="tv-info-label">Timeline:</span>{" "}
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
                  <span className="tv-info-label">Broadcast health:</span>{" "}
                  {connectionState === "connected"
                    ? "Live and stable"
                    : "Reconnecting"}
                </p>
              </div>
            </div>

            <div className="tv-playlist-container">
              <p className="tv-section-title">
                Available Video List
              </p>
              <div className="tv-playlist-list">
                {playlist.map((item) => (
                  <div
                    key={item.id}
                    className="tv-playlist-item"
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="tv-playlist-thumb"
                    />
                    <div className="tv-playlist-info">
                      <p className="tv-playlist-title">
                        {item.title}
                      </p>
                      <p className="tv-playlist-meta">
                        {item.duration} • {item.format}
                      </p>
                    </div>
                  </div>
                ))}
                {playlist.length === 0 ? (
                  <div className="tv-playlist-empty">
                    Waiting for the first asset broadcast.
                  </div>
                ) : null}
              </div>
            </div>

            {!activeVideo ? (
              <div className="tv-alert-box">
                <AlertCircle className="h-4 w-4" /> No active asset yet.
              </div>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
