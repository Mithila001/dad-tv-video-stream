import {
  liveQueueSequence,
  type LiveQueueItem,
  type VideoAsset,
  videoLibrary,
} from "../data/mockData";
import type { AuthUser } from "../context/AuthContext";

export const API_BASE_URL = "http://localhost:5000";

async function fetchJson<T>(
  url: string,
  fallback: ReadonlyArray<T>,
): Promise<ReadonlyArray<T>> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Request failed for ${url} with status ${response.status}`,
      );
    }

    return (await response.json()) as ReadonlyArray<T>;
  } catch {
    return fallback;
  }
}

export async function fetchVideoLibrary(): Promise<ReadonlyArray<VideoAsset>> {
  return fetchJson<VideoAsset>(`${API_BASE_URL}/api/videos`, videoLibrary);
}

export async function fetchLiveQueue(): Promise<ReadonlyArray<LiveQueueItem>> {
  return fetchJson<LiveQueueItem>(
    `${API_BASE_URL}/api/queue`,
    liveQueueSequence,
  );
}

export async function loginUser(
  username: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
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
