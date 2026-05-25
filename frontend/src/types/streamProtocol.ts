import type {
  LiveQueueItem,
  StreamControlCommand,
  StreamSyncResponse,
  VideoAsset,
  WebSocketClientKind,
} from "../services/api";

export type StreamSocketMessage =
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

export interface StreamSnapshot {
  readonly connectionState: "connecting" | "connected" | "reconnecting" | "offline";
  readonly assets: ReadonlyArray<VideoAsset>;
  readonly liveQueue: ReadonlyArray<LiveQueueItem>;
  readonly stream: StreamSyncResponse | null;
  readonly lastEvent: string;
}
