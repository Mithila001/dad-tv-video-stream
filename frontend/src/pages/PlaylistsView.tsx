import { useMemo, useState } from "react";
import { CheckSquare, PlaySquare, Plus, Trash2 } from "lucide-react";
import type { VideoAsset } from "../services/api";
import { useStreamSocket } from "../hooks/useStreamSocket";

interface PlaylistGroup {
  readonly title: string;
  readonly description: string;
  readonly items: ReadonlyArray<VideoAsset>;
}

export function PlaylistsView() {
  const { assets: videos, liveQueue, connectionState, lastEvent } =
    useStreamSocket("admin");
  const [selectedIds, setSelectedIds] = useState<ReadonlyArray<string>>([]);
  const [playlistName, setPlaylistName] = useState("New Playlist");

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

  const selectedVideos = useMemo(
    () => videos.filter((video) => selectedIds.includes(video.id)),
    [selectedIds, videos],
  );

  const toggleSelected = (videoId: string) => {
    setSelectedIds((current) =>
      current.includes(videoId)
        ? current.filter((id) => id !== videoId)
        : [...current, videoId],
    );
  };

  return (
    <section className="space-y-6 overflow-hidden">
      <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Playlists
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
          Backend Collections
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
          These collections are generated from the live backend video library.
          Categories and queue counts are refreshed from the live WebSocket
          snapshot instead of using placeholder playlist data.
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Socket {connectionState} • {lastEvent}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel xl:col-span-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Playlist Builder
                </p>
                <h2 className="mt-2 text-xl font-semibold text-text">
                  Select assets and prepare a broadcast playlist
                </h2>
              </div>

              <label className="min-w-0 flex-1 lg:max-w-md">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Playlist name
                </span>
                <input
                  value={playlistName}
                  onChange={(event) => setPlaylistName(event.target.value)}
                  className="w-full rounded-xl border border-border bg-bg/80 px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder="Enter playlist name"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:bg-accent-strong"
              >
                <PlaySquare className="h-4 w-4" />
                Play Playlist
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-semibold text-text transition hover:border-accent/50"
              >
                <Plus className="h-4 w-4" />
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-semibold text-text transition hover:border-accent/50"
              >
                <Trash2 className="h-4 w-4" />
                Clear Selection
              </button>
              <span className="rounded-full bg-surface-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {selectedVideos.length} selected
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {videos.slice(0, 6).map((video) => {
                const isSelected = selectedIds.includes(video.id);

                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => toggleSelected(video.id)}
                    className={[
                      "overflow-hidden rounded-2xl border p-3 text-left transition",
                      isSelected
                        ? "border-accent/40 bg-accent/10 ring-1 ring-accent/25"
                        : "border-border/70 bg-bg/70 hover:border-accent/35",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text">
                          {video.title}
                        </p>
                        <p className="truncate text-sm text-text-muted">
                          {video.duration} • {video.format}
                        </p>
                      </div>
                      <CheckSquare
                        className={[
                          "h-4 w-4 shrink-0",
                          isSelected ? "text-accent" : "text-text-muted",
                        ].join(" ")}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </article>

          {playlistGroups.map((group) => (
            <article
              key={group.title}
              className="overflow-hidden rounded-2xl border border-border bg-surface/90 p-6 shadow-panel"
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

          {playlistGroups.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface/90 p-6 text-sm text-text-muted shadow-panel">
              No collections available yet. Upload a video to populate the
              backend library.
            </div>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Live Queue Management
          </p>
          <h2 className="mt-2 text-xl font-semibold text-text">
            Live backend snapshot and sequencing
          </h2>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            Queue items below are fetched from the backend broadcast state and
            refreshed live. Drag-and-drop orchestration will be layered on top
            of this live snapshot.
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

            {liveQueue.length === 0 ? (
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
