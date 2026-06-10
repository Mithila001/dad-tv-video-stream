import { useMemo, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Grid2X2, List, Search, SlidersHorizontal, ListPlus, Check, PencilLine, Trash2, FolderPlus, ChevronDown, Plus } from "lucide-react";
import { useSharedStreamSocket } from "../context/StreamSocketContext";

type ViewMode = "grid" | "list";
type SortMode = "newest" | "oldest" | "title";

interface MinimalPlaylist {
  readonly id: string;
  readonly name: string;
  readonly assetIds: ReadonlyArray<string>;
}

export function MediaLibraryView() {
  const { assets: videos, connectionState, appendPlaylist } = useSharedStreamSocket();
  const [search, setSearch] = useState("");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [editingVideo, setEditingVideo] = useState<{ id: string; title: string } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [activePlaylistPicker, setActivePlaylistPicker] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<ReadonlyArray<MinimalPlaylist>>([]);

  // Load playlists from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("lobbystream:playlists");
      if (stored) {
        setPlaylists(JSON.parse(stored) as ReadonlyArray<MinimalPlaylist>);
      }
    } catch (error) {
      console.error("Failed to load playlists", error);
    }
  }, []);

  // Sync playlists from custom event
  useEffect(() => {
    const handleRefresh = () => {
      try {
        const stored = localStorage.getItem("lobbystream:playlists");
        if (stored) {
          setPlaylists(JSON.parse(stored) as ReadonlyArray<MinimalPlaylist>);
        }
      } catch (error) {
        console.error("Failed to reload playlists", error);
      }
    };
    window.addEventListener("lobbystream:playlists-updated", handleRefresh);
    return () => window.removeEventListener("lobbystream:playlists-updated", handleRefresh);
  }, []);

  const handleAddToPlaylist = (playlistId: string, videoId: string) => {
    try {
      const stored = localStorage.getItem("lobbystream:playlists");
      const currentPlaylists = stored ? JSON.parse(stored) : [];
      const updated = currentPlaylists.map((p: any) => {
        if (p.id === playlistId) {
          return { ...p, assetIds: [...p.assetIds, videoId] };
        }
        return p;
      });
      localStorage.setItem("lobbystream:playlists", JSON.stringify(updated));
      window.dispatchEvent(new Event("lobbystream:playlists-updated"));
      setActivePlaylistPicker(null);
    } catch (e) {
      console.error("Failed to add to playlist", e);
    }
  };

  const handleCreateAndAddToPlaylist = (videoId: string) => {
    const name = window.prompt("Enter new playlist name:");
    if (!name || !name.trim()) return;

    try {
      const stored = localStorage.getItem("lobbystream:playlists");
      const currentPlaylists = stored ? JSON.parse(stored) : [];
      const newPlaylist = {
        id: `playlist-${Date.now()}`,
        name: name.trim(),
        assetIds: [videoId],
      };
      const updated = [...currentPlaylists, newPlaylist];
      localStorage.setItem("lobbystream:playlists", JSON.stringify(updated));
      window.dispatchEvent(new Event("lobbystream:playlists-updated"));
      setActivePlaylistPicker(null);
    } catch (e) {
      console.error("Failed to create and add to playlist", e);
    }
  };

  const { searchValue, onSearchChange } = useOutletContext<{
    searchValue?: string;
    onSearchChange?: (v: string) => void;
  }>() ?? {};

  useEffect(() => {
    if (searchValue !== undefined) setSearch(searchValue);
  }, [searchValue]);

  const [format, setFormat] = useState<"all" | "MP4" | "MOV">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const isLoading = videos.length === 0 && connectionState === "connecting";

  const filteredVideos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return [...videos]
      .filter((video) => {
        const matchesSearch =
          !normalizedSearch ||
          [video.title, video.duration, video.size, video.format, video.uploadDate]
            .join(" ").toLowerCase().includes(normalizedSearch);
        const matchesFormat = format === "all" || video.format === format;
        return matchesSearch && matchesFormat;
      })
      .sort((left, right) => {
        if (sortMode === "title") return left.title.localeCompare(right.title);
        const leftDate = new Date(left.uploadDate).getTime();
        const rightDate = new Date(right.uploadDate).getTime();
        return sortMode === "newest" ? rightDate - leftDate : leftDate - rightDate;
      });
  }, [format, search, sortMode, videos]);

  const handleAddToQueue = async (videoId: string) => {
    try {
      await appendPlaylist([videoId]);
      setAddedIds((prev) => new Set([...prev, videoId]));
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(videoId);
          return next;
        });
      }, 2000);
    } catch (error) {
      console.error("Failed to add to queue", error);
    }
  };

  const handleDelete = async (videoId: string, videoTitle: string) => {
    if (!window.confirm(`Delete "${videoTitle}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      window.dispatchEvent(new Event("lobbystream:data-updated"));
    } catch {
      alert("Failed to delete video. Please try again.");
    }
  };

  const handleEditSave = async () => {
    if (!editingVideo) return;
    try {
      const response = await fetch(`/api/videos/${editingVideo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (!response.ok) throw new Error("Edit failed");
      window.dispatchEvent(new Event("lobbystream:data-updated"));
      setEditingVideo(null);
    } catch {
      alert("Failed to update video title. Please try again.");
    }
  };

  return (
    <section className="space-y-6 overflow-hidden">

      {/* Edit Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <h2 className="text-xl font-semibold text-text">Edit Video Title</h2>
            <p className="mt-1 text-sm text-text-muted">Update the title for this asset.</p>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="mt-4 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              placeholder="Enter new title"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-text transition hover:border-accent/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={!editTitle.trim()}
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:bg-accent-strong disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Media Library
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
              Asset Browser
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
              Review backend-hosted video assets, switch between dense grid and
              list layouts, and filter by metadata before handing items off for
              scheduling.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("lobbystream:open-upload"))}
              className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              Upload Video
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={[
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                viewMode === "grid"
                  ? "border-accent/35 bg-accent/15 text-text ring-1 ring-accent/25"
                  : "border-border bg-surface-2 text-text-muted hover:text-text",
              ].join(" ")}
            >
              <Grid2X2 className="h-4 w-4" aria-hidden="true" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={[
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                viewMode === "list"
                  ? "border-accent/35 bg-accent/15 text-text ring-1 ring-accent/25"
                  : "border-border bg-surface-2 text-text-muted hover:text-text",
              ].join(" ")}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              List
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[minmax(0,1.4fr)_180px_180px]">
          <label className="relative w-full sm:col-span-2 md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                const v = event.target.value;
                setSearch(v);
                onSearchChange?.(v);
              }}
              placeholder="Filter by title, size, duration, or date"
              className="w-full rounded-xl border border-border bg-bg/80 py-3 pl-10 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as "all" | "MP4" | "MOV")}
              className="w-full rounded-xl border border-border bg-bg/80 py-3 pl-10 pr-4 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="all">All formats</option>
              <option value="MP4">MP4</option>
              <option value="MOV">MOV</option>
            </select>
          </div>

          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="w-full rounded-xl border border-border bg-bg/80 px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-text-muted">
        <span className="min-w-0 truncate">
          {isLoading ? "Loading assets..." : `${filteredVideos.length} assets available`}
        </span>
        <span className="u-nowrap-ellipsis max-w-full rounded-full border border-border/70 bg-surface-2/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          Backend source: /api/videos
        </span>
      </div>

      <div
        className={
          viewMode === "grid"
            ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            : "space-y-4"
        }
      >
        {filteredVideos.map((video) => {
          const isAdded = addedIds.has(video.id);
          return (
            <article
              key={video.id}
              className={[
                "overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-panel",
                viewMode === "list" ? "xl:flex xl:items-stretch" : "",
              ].join(" ")}
            >
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className={
                  viewMode === "grid"
                    ? "h-44 w-full object-cover"
                    : "h-44 w-full object-cover xl:h-auto xl:w-72"
                }
              />
              <div className="min-w-0 space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="u-clamp-2 text-lg font-semibold text-text">
                      {video.title}
                    </h2>
                    <p className="u-break-anywhere mt-1 text-sm text-text-muted">
                      {video.duration} • {video.size} • {video.format}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-strong ring-1 ring-accent/25">
                    {video.uploadDate}
                  </span>
                </div>

                <dl className="grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                  <div className="overflow-hidden rounded-xl bg-surface-2/60 px-3 py-2">
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Format</dt>
                    <dd className="mt-1 text-text">{video.format}</dd>
                  </div>
                  <div className="overflow-hidden rounded-xl bg-surface-2/60 px-3 py-2">
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Category</dt>
                    <dd className="mt-1 truncate text-text">{video.category}</dd>
                  </div>
                  <div className="overflow-hidden rounded-xl bg-surface-2/60 px-3 py-2 sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Source</dt>
                    <dd className="u-break-anywhere mt-1 text-text">{video.videoUrl}</dd>
                  </div>
                </dl>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVideo({ id: video.id, title: video.title });
                      setEditTitle(video.title);
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-semibold text-text transition hover:border-accent/50 hover:text-text"
                  >
                    <PencilLine className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(video.id, video.title)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-danger/35 bg-danger/10 px-3 py-2.5 text-sm font-semibold text-danger transition hover:border-danger/50 hover:bg-danger/15"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>

                {/* Add to Queue button */}
                <button
                  type="button"
                  onClick={() => handleAddToQueue(video.id)}
                  className={[
                    "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                    isAdded
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border bg-surface-2 text-text hover:border-accent/50 hover:text-accent-strong",
                  ].join(" ")}
                >
                  {isAdded ? (
                    <><Check className="h-4 w-4" />Added to Queue</>
                  ) : (
                    <><ListPlus className="h-4 w-4" />Add to Queue</>
                  )}
                </button>

                {/* Add to Playlist button */}
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={() => setActivePlaylistPicker(activePlaylistPicker === video.id ? null : video.id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-text hover:border-accent/50 hover:text-accent-strong transition"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Add to Playlist
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {activePlaylistPicker === video.id && (
                    <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleCreateAndAddToPlaylist(video.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-accent hover:bg-surface-2"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create New Playlist...
                      </button>
                      {playlists.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddToPlaylist(p.id, video.id)}
                          className="block w-full truncate rounded-lg px-3 py-1.5 text-left text-xs text-text hover:bg-surface-2"
                        >
                          {p.name}
                        </button>
                      ))}
                      {playlists.length === 0 && (
                        <p className="px-3 py-1.5 text-[11px] italic text-text-muted">No existing playlists.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}