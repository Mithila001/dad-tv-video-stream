import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchLiveQueue,
  fetchStreamSync,
  fetchVideoLibrary,
  getWebSocketUrl,
  type LiveQueueItem,
  type StreamControlCommand,
  type StreamSyncResponse,
  type VideoAsset,
  type WebSocketClientKind,
} from "../services/api";
import type { StreamSocketMessage, StreamSnapshot } from "../types/streamProtocol";

const defaultSnapshot: StreamSnapshot = {
  connectionState: "connecting",
  assets: [],
  liveQueue: [],
  stream: null,
  lastEvent: "Connecting...",
};

function toQueueItem(
  asset: VideoAsset,
  index: number,
  activeVideoId?: string,
): LiveQueueItem {
  const isActive = Boolean(activeVideoId && asset.id === activeVideoId);

  return {
    id: `live-${asset.id}`,
    title: asset.title,
    thumbnailUrl: asset.thumbnailUrl,
    status: (isActive || index === 0 ? "playing" : "upcoming") as LiveQueueItem["status"],
    startsInMinutes:
      isActive || index === 0 ? undefined : index * 12,
    sourceVideoId: asset.id,
  };
}

function buildLiveQueue(assets: ReadonlyArray<VideoAsset>, activeVideoId?: string) {
  return assets.map((asset, index) => toQueueItem(asset, index, activeVideoId));
}

function buildStreamQueue(assets: ReadonlyArray<VideoAsset>, stream: StreamSyncResponse | null) {
  if (!stream) {
    return buildLiveQueue(assets);
  }

  return assets.map((asset, index) =>
    toQueueItem(asset, index, stream.videoId),
  );
}

function updateActiveItemInQueue(
  queue: ReadonlyArray<LiveQueueItem>,
  stream: StreamSyncResponse | null,
): ReadonlyArray<LiveQueueItem> {
  if (!stream) {
    return queue;
  }
  const activeIndex = queue.findIndex((item) => item.sourceVideoId === stream.videoId);
  if (activeIndex === -1) {
    return queue;
  }
  return queue.map((item, index) => ({
    ...item,
    status: (index === activeIndex ? "playing" : "upcoming") as LiveQueueItem["status"],
    startsInMinutes:
      index === activeIndex ? undefined : Math.max(0, (index - activeIndex) * 12),
  }));
}

export function useStreamSocket(clientKind: WebSocketClientKind = "admin") {
  const [snapshot, setSnapshot] = useState<StreamSnapshot>(defaultSnapshot);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectDelayRef = useRef(1000);
  const connectRef = useRef<() => void>(() => undefined);

  const connect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setSnapshot((current) => ({
      ...current,
      connectionState: "connecting",
      lastEvent: "Opening live socket...",
    }));

    const socket = new WebSocket(getWebSocketUrl("/ws", clientKind));
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectDelayRef.current = 1000;
      setSnapshot((current) => ({
        ...current,
        connectionState: "connected",
        lastEvent: "Connected",
      }));
      socket.send(JSON.stringify({ type: "CLIENT_READY", clientKind }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as StreamSocketMessage;

        if (message.type === "HEARTBEAT") {
          setSnapshot((current) => ({
            ...current,
            lastEvent: `Heartbeat ${new Date(message.serverTime).toLocaleTimeString()}`,
          }));
          return;
        }

        if (message.type === "INITIAL_STATE") {
          setSnapshot((current) => ({
            ...current,
            assets: message.assets,
            liveQueue: message.liveQueue,
            stream: message.stream,
            lastEvent: "Hydrated initial state",
          }));
          return;
        }

        if (message.type === "STREAM_SYNC") {
          setSnapshot((current) => ({
            ...current,
            stream: message.stream,
            liveQueue: updateActiveItemInQueue(current.liveQueue, message.stream),
            lastEvent: `STREAM_SYNC ${message.command}`,
          }));
          return;
        }

        if (message.type === "ASSET_ADDED") {
          setSnapshot((current) => {
            const nextAssets = current.assets.some((asset) => asset.id === message.asset.id)
              ? current.assets
              : [...current.assets, message.asset];

            return {
              ...current,
              assets: nextAssets,
              lastEvent: `ASSET_ADDED ${message.asset.title}`,
            };
          });
        }

        if (message.type === "QUEUE_UPDATE") {
          setSnapshot((current) => ({
            ...current,
            liveQueue: message.liveQueue,
            stream: message.stream ?? current.stream,
            lastEvent: "Queue updated",
          }));
          return;
        }
      } catch {
        setSnapshot((current) => ({
          ...current,
          lastEvent: "Ignored malformed websocket payload",
        }));
      }
    };

    socket.onerror = () => {
      setSnapshot((current) => ({
        ...current,
        connectionState: "offline",
        lastEvent: "Socket error",
      }));
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      setSnapshot((current) => ({
        ...current,
        connectionState: "reconnecting",
        lastEvent: "Reconnecting...",
      }));

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }

      const delay = reconnectDelayRef.current;
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 10000);
        connectRef.current();
      }, delay);
    };
  }, [clientKind]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      const [assets, stream, liveQueue] = await Promise.all([
        fetchVideoLibrary(),
        fetchStreamSync().catch(() => null),
        fetchLiveQueue().catch(() => []),
      ]);

      if (!isMounted) {
        return;
      }

      setSnapshot((current) => ({
        ...current,
        assets,
        stream,
        liveQueue:
          liveQueue.length > 0
            ? liveQueue
            : buildStreamQueue(assets, stream),
        lastEvent: "Hydrated via REST fallback",
      }));
    }

    void hydrate();
    connect();

    return () => {
      isMounted = false;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, [connect]);

  const runControlCommand = useCallback(async (command: StreamControlCommand) => {
    const response = await fetch(`/api/stream/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });

    if (!response.ok) {
      throw new Error("Unable to control stream playback");
    }

    return (await response.json()) as StreamSyncResponse;
  }, []);

  const reorderQueue = useCallback(async (orderedIds: string[]) => {
    const response = await fetch(`/api/queue/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });

    if (!response.ok) {
      throw new Error("Unable to reorder queue");
    }

    return (await response.json()) as { queue: ReadonlyArray<LiveQueueItem> };
  }, []);

  const deleteQueueItem = useCallback(async (itemId: string) => {
    const response = await fetch(`/api/queue/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });

    if (!response.ok) {
      throw new Error("Unable to delete queue item");
    }

    return (await response.json()) as { queue: ReadonlyArray<LiveQueueItem> };
  }, []);

  const appendPlaylist = useCallback(async (assetIds: string[]) => {
    const response = await fetch(`/api/queue/append-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetIds }),
    });

    if (!response.ok) {
      throw new Error("Unable to append playlist");
    }

    return (await response.json()) as { queue: ReadonlyArray<LiveQueueItem> };
  }, []);

  const playPlaylist = useCallback(async (assetIds: string[]) => {
    const response = await fetch(`/api/queue/play-playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetIds }),
    });

    if (!response.ok) {
      throw new Error("Unable to play playlist");
    }

    return (await response.json()) as {
      queue: ReadonlyArray<LiveQueueItem>;
      stream: StreamSyncResponse;
    };
  }, []);

  const jumpToQueueItem = useCallback(async (itemId: string) => {
    const response = await fetch(`/api/queue/jump`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });

    if (!response.ok) {
      throw new Error("Unable to jump to queue item");
    }

    return (await response.json()) as {
      queue: ReadonlyArray<LiveQueueItem>;
      stream: StreamSyncResponse;
    };
  }, []);

  return useMemo(
    () => ({
      ...snapshot,
      runControlCommand,
      reorderQueue,
      deleteQueueItem,
      appendPlaylist,
      playPlaylist,
      jumpToQueueItem,
      setSnapshot,
      socketRef,
    }),
    [
      runControlCommand,
      reorderQueue,
      deleteQueueItem,
      appendPlaylist,
      playPlaylist,
      jumpToQueueItem,
      snapshot,
    ],
  );
}
