import { useEffect, useMemo, useState } from "react";
import { fetchLiveQueue, fetchVideoLibrary, type LiveQueueItem, type VideoAsset } from "../services/api";

interface PlaylistGroup {
  readonly title: string;
  readonly description: string;
  readonly items: ReadonlyArray<VideoAsset>;
}

export function PlaylistsView() {
  const [videos, setVideos] = useState<ReadonlyArray<VideoAsset>>([]);
  const [liveQueue, setLiveQueue] = useState<ReadonlyArray<LiveQueueItem>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      setIsLoading(true);
      const [library, queue] = await Promise.all([fetchVideoLibrary(), fetchLiveQueue()]);

      if (!isActive) {
        return;
      }

      setVideos(library);
      setLiveQueue(queue);
      setIsLoading(false);
    }

    void loadData();

    const handleDataUpdated = () => {
      void loadData();
    };

    window.addEventListener("lobbystream:data-updated", handleDataUpdated);

    return () => {
      isActive = false;
      window.removeEventListener("lobbystream:data-updated", handleDataUpdated);
    };
  }, []);

  const playlistGroups = useMemo<ReadonlyArray<PlaylistGroup>>(() => {
    const groups = new Map<string, VideoAsset[]>();

    for (const video of videos) {
      const key = video.category || "Uncategorized";
      const current = groups.get(key) ?? [];
      current.push(video);
      groups.set(key, current);
    }

    return [...groups.entries()]
      .map(([title, items]) => ({
        title,
        description: `${items.length} assets grouped from the backend media library.`,
        items,
      }))
      .sort((left, right) => right.items.length - left.items.length);
  }, [videos]);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Playlists
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
          Backend Collections
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
          These collections are generated from the live backend video library.
          Categories and queue counts are refreshed from the API instead of using
          placeholder playlist data.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="grid gap-4 xl:grid-cols-2">
          {playlistGroups.map((group) => (
            <article
              key={group.title}
              className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-text">
                    {group.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    {group.description}
                  </p>
                </div>
                <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success ring-1 ring-success/25">
                  {group.items.length} items
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {group.items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-bg/70 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">
                        {item.title}
                      </p>
                      <p className="text-sm text-text-muted">
                        {item.duration} • {item.size} • {item.uploadDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ring-border/70">
                        {item.format}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}

          {!isLoading && playlistGroups.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface/90 p-6 text-sm text-text-muted shadow-panel">
              No collections available yet. Upload a video to populate the
              backend library.
            </div>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Broadcast Queue
          </p>
          <h2 className="mt-2 text-xl font-semibold text-text">
            Live backend snapshot
          </h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            Queue items below are fetched from the backend broadcast state and
            refreshed live.
          </p>

          <div className="mt-5 space-y-3">
            {liveQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-bg/70 p-3"
              >
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">
                    {item.title}
                  </p>
                  <p className="text-sm text-text-muted">
                    {item.status === "playing"
                      ? "Playing now"
                      : `Starts in ${item.startsInMinutes ?? 0}m`}
                  </p>
                </div>
              </div>
            ))}

            {!isLoading && liveQueue.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-bg/70 p-3 text-sm text-text-muted">
                No queue items available yet.
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
