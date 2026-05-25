import type { AuthUser } from "../context/AuthContext";

export const API_BASE_URL = "/api";

export type VideoFormat = "MP4" | "MOV";

export type LiveQueueStatus = "playing" | "upcoming";

export interface VideoAsset {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly duration: string;
  readonly size: string;
  readonly format: VideoFormat;
  readonly uploadDate: string;
  readonly thumbnailUrl: string;
  readonly videoUrl?: string;
}

export interface LiveQueueItem {
  readonly id: string;
  readonly title: string;
  readonly thumbnailUrl: string;
  readonly status: LiveQueueStatus;
  readonly startsInMinutes?: number;
  readonly sourceVideoId: string;
}

export interface StreamSyncResponse {
  readonly videoId: string;
  readonly videoUrl: string;
  readonly durationSeconds: number;
  readonly currentTime: number;
  readonly startedAtMs: number;
  readonly serverNowMs: number;
  readonly isPlaying: boolean;
}

export type StreamControlCommand = "play" | "pause" | "next" | "previous";

export interface UploadVideoPayload {
  readonly file: File;
  readonly title: string;
}

export interface UploadVideoResponse {
  readonly video: VideoAsset;
}

async function fetchJson<T>(url: string): Promise<ReadonlyArray<T>> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Request failed for ${url} with status ${response.status}`,
      );
    }

    return (await response.json()) as ReadonlyArray<T>;
  } catch {
    return [];
  }
}

export async function fetchVideoLibrary(): Promise<ReadonlyArray<VideoAsset>> {
  return fetchJson<VideoAsset>(`${API_BASE_URL}/videos`);
}

export async function fetchLiveQueue(): Promise<ReadonlyArray<LiveQueueItem>> {
  return fetchJson<LiveQueueItem>(`${API_BASE_URL}/queue`);
}

export async function loginUser(
  username: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid credentials");
  }

  const payload = (await response.json()) as { currentUser: AuthUser };

  return payload.currentUser;
}

export async function fetchStreamSync(): Promise<StreamSyncResponse> {
  const response = await fetch(`${API_BASE_URL}/stream/sync`);

  if (!response.ok) {
    throw new Error("Unable to fetch stream sync state");
  }

  return (await response.json()) as StreamSyncResponse;
}

export async function sendStreamControl(
  command: StreamControlCommand,
): Promise<StreamSyncResponse> {
  const response = await fetch(`${API_BASE_URL}/stream/control`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command }),
  });

  if (!response.ok) {
    throw new Error("Unable to control stream playback");
  }

  return (await response.json()) as StreamSyncResponse;
}

export async function uploadVideoAsset(
  payload: UploadVideoPayload,
): Promise<UploadVideoResponse> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("title", payload.title);

  const response = await fetch(`${API_BASE_URL}/videos/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorPayload = (await response
      .json()
      .catch(() => ({ message: "Upload failed" }))) as { message?: string };

    throw new Error(errorPayload.message ?? "Upload failed");
  }

  return (await response.json()) as UploadVideoResponse;
}
