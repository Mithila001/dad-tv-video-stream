import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useStreamSocket } from "../hooks/useStreamSocket";
import type { StreamSnapshot } from "../types/streamProtocol";
import type {
  StreamControlCommand,
  StreamSyncResponse,
  LiveQueueItem,
} from "../services/api";

export interface StreamSocketContextValue extends StreamSnapshot {
  readonly runControlCommand: (command: StreamControlCommand) => Promise<StreamSyncResponse>;
  readonly reorderQueue: (orderedIds: string[]) => Promise<{ queue: ReadonlyArray<LiveQueueItem> }>;
  readonly deleteQueueItem: (itemId: string) => Promise<{ queue: ReadonlyArray<LiveQueueItem> }>;
  readonly appendPlaylist: (assetIds: string[]) => Promise<{ queue: ReadonlyArray<LiveQueueItem> }>;
  readonly playPlaylist: (
    assetIds: string[],
  ) => Promise<{ queue: ReadonlyArray<LiveQueueItem>; stream: StreamSyncResponse }>;
  readonly jumpToQueueItem: (
    itemId: string,
  ) => Promise<{ queue: ReadonlyArray<LiveQueueItem>; stream: StreamSyncResponse }>;
  readonly setSnapshot: React.Dispatch<React.SetStateAction<StreamSnapshot>>;
  readonly socketRef: React.MutableRefObject<WebSocket | null>;
}

const StreamSocketContext = createContext<StreamSocketContextValue | null>(null);

export interface StreamSocketProviderProps {
  readonly children: ReactNode;
}

export function StreamSocketProvider({ children }: StreamSocketProviderProps) {
  const socketValue = useStreamSocket("admin");

  const value = useMemo<StreamSocketContextValue>(() => socketValue, [socketValue]);

  return (
    <StreamSocketContext.Provider value={value}>
      {children}
    </StreamSocketContext.Provider>
  );
}

export function useSharedStreamSocket() {
  const context = useContext(StreamSocketContext);
  if (!context) {
    throw new Error("useSharedStreamSocket must be used within a StreamSocketProvider");
  }
  return context;
}
