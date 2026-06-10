import { useMemo, useState, useEffect } from "react";
import { PlaySquare, Plus, Trash2, ArrowUp, ArrowDown, Search, ListPlus, PencilLine } from "lucide-react";
import type { VideoAsset } from "../services/api";
import { useSharedStreamSocket } from "../context/StreamSocketContext";

interface Playlist {
  readonly id: string;
  readonly name: string;
  readonly assetIds: ReadonlyArray<string>;
}

interface PlaylistItem {
  readonly instanceId: string;
  readonly assetId: string;
}

export function PlaylistsView() {
  const { assets: videos, playPlaylist, appendPlaylist } = useSharedStreamSocket();
  const [playlists, setPlaylists] = useState<ReadonlyArray<Playlist>>([]);
  const [selectedItems, setSelectedItems] = useState<ReadonlyArray<PlaylistItem>>([]);
  const [playlistName, setPlaylistName] = useState("New Playlist");
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Load playlists from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("lobbystream:playlists");
      if (stored) {
        setPlaylists(JSON.parse(stored) as ReadonlyArray<Playlist>);
      }
    } catch (error) {
      console.error("Failed to load playlists from localStorage", error);
    }
  }, []);

  // Listen to external triggers to refresh playlists (e.g. from MediaLibrary direct add)
  useEffect(() => {
    const handleRefresh = () => {
      try {
        const stored = localStorage.getItem("lobbystream:playlists");
        if (stored) {
          setPlaylists(JSON.parse(stored) as ReadonlyArray<Playlist>);
        }
      } catch (error) {
        console.error("Failed to reload playlists", error);
      }
    };
    window.addEventListener("lobbystream:playlists-updated", handleRefresh);
    return () => window.removeEventListener("lobbystream:playlists-updated", handleRefresh);
  }, []);

  // Persist playlists to localStorage when changed
  const savePlaylistsToStorage = (nextPlaylists: ReadonlyArray<Playlist>) => {
    setPlaylists(nextPlaylists);
    try {
      localStorage.setItem("lobbystream:playlists", JSON.stringify(nextPlaylists));
      window.dispatchEvent(new Event("lobbystream:playlists-updated"));
    } catch (error) {
      console.error("Failed to save playlists to localStorage", error);
    }
  };

  const filteredVideos = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return videos;
    }
    return videos.filter((video) =>
      video.title.toLowerCase().includes(query) ||
      video.format.toLowerCase().includes(query)
    );
  }, [search, videos]);

  const selectedVideos = useMemo(() => {
    return selectedItems
      .map((item) => {
        const video = videos.find((v) => v.id === item.assetId);
        return video ? { ...video, instanceId: item.instanceId } : null;
      })
      .filter((v): v is VideoAsset & { instanceId: string } => Boolean(v));
  }, [selectedItems, videos]);

  const addVideoToBuilder = (videoId: string) => {
    setSelectedItems((current) => [
      ...current,
      {
        instanceId: `item-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`,
        assetId: videoId,
      },
    ]);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) {
      return;
    }
    setSelectedItems((current) => {
      const next = [...current];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedItems.length - 1) {
      return;
    }
    setSelectedItems((current) => {
      const next = [...current];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const handleRemoveSelected = (instanceId: string) => {
    setSelectedItems((current) => current.filter((item) => item.instanceId !== instanceId));
  };

  const handleSavePlaylist = () => {
    if (selectedItems.length === 0) {
      return;
    }

    const assetIds = selectedItems.map((item) => item.assetId);

    if (editingPlaylistId) {
      const nextPlaylists = playlists.map((p) =>
        p.id === editingPlaylistId
          ? { ...p, name: playlistName.trim() || p.name, assetIds }
          : p
      );
      savePlaylistsToStorage(nextPlaylists);
      setEditingPlaylistId(null);
    } else {
      const newPlaylist: Playlist = {
        id: `playlist-${Date.now()}`,
        name: playlistName.trim() || `Playlist #${playlists.length + 1}`,
        assetIds,
      };
      const nextPlaylists = [...playlists, newPlaylist];
      savePlaylistsToStorage(nextPlaylists);
    }

    // Reset builder form
    setSelectedItems([]);
    setPlaylistName("New Playlist");
  };

  const handleCancelEdit = () => {
    setEditingPlaylistId(null);
    setSelectedItems([]);
    setPlaylistName("New Playlist");
  };

  const handleEditPlaylist = (playlist: Playlist) => {
    setEditingPlaylistId(playlist.id);
    setPlaylistName(playlist.name);
    setSelectedItems(
      playlist.assetIds.map((assetId) => ({
        instanceId: `item-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`,
        assetId,
      }))
    );
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const nextPlaylists = playlists.filter((p) => p.id !== playlistId);
    savePlaylistsToStorage(nextPlaylists);
    if (editingPlaylistId === playlistId) {
      handleCancelEdit();
    }
  };

  const handlePlayPlaylist = async (playlist: Playlist) => {
    try {
      await playPlaylist([...playlist.assetIds]);
    } catch (error) {
      console.error("Failed to play playlist", error);
    }
  };

  const handleAppendPlaylist = async (playlist: Playlist) => {
    try {
      await appendPlaylist([...playlist.assetIds]);
    } catch (error) {
      console.error("Failed to append playlist to queue", error);
    }
  };

  const getPlaylistVideos = (playlist: Playlist) => {
    return playlist.assetIds
      .map((id) => videos.find((v) => v.id === id))
      .filter((v): v is VideoAsset => Boolean(v));
  };

  return (
    <section className="space-y-6 overflow-hidden">
      {/* Header Panel */}
      <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Broadcast playlists
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
          Playlist Orchestrator
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
          Create custom groupings of media assets, arrange playback ordering in
          the builder, and dispatch them to replace or extend the live streaming queue.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        {/* Playlist Builder Surface */}
        <div className="space-y-4">
          <article className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-border/60 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Playlist Builder {editingPlaylistId && "(Editing Mode)"}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-text">
                  {editingPlaylistId ? "Modify existing sequence" : "Arrange a new media sequence"}
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

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {/* Asset Selector (Left Column) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Asset Library
                  </p>
                  <span className="text-xs text-text-muted">{filteredVideos.length} found</span>
                </div>

                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search videos by title..."
                    className="w-full rounded-xl border border-border bg-bg/85 py-2.5 pl-10 pr-4 text-sm text-text outline-none transition focus:border-accent"
                  />
                </label>

                <div className="max-h-95 overflow-y-auto space-y-2 pr-1">
                  {filteredVideos.map((video) => {
                    const count = selectedItems.filter((item) => item.assetId === video.id).length;

                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => addVideoToBuilder(video.id)}
                        className={[
                          "w-full overflow-hidden rounded-xl border p-2 text-left transition",
                          count > 0
                            ? "border-accent/40 bg-accent/10 ring-1 ring-accent/25"
                            : "border-border/70 bg-bg/70 hover:border-accent/35",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="h-11 w-11 rounded-lg object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-text">
                              {video.title}
                            </p>
                            <p className="truncate text-xs text-text-muted">
                              {video.duration} • {video.format}
                            </p>
                          </div>
                          {count > 0 && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-bg shrink-0">
                              {count}x
                            </span>
                          )}
                          <Plus className="h-4 w-4 shrink-0 text-text-muted/60" />
                        </div>
                      </button>
                    );
                  })}
                  {filteredVideos.length === 0 && (
                    <div className="text-center py-8 text-sm text-text-muted">
                      No assets match the search.
                    </div>
                  )}
                </div>
              </div>

              {/* Selection & Ordering Preview (Right Column) */}
              <div className="flex flex-col border-t border-border/60 pt-5 md:border-t-0 md:pt-0 md:border-l md:border-border/60 md:pl-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Playlist Ordering
                  </p>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent-strong">
                    {selectedVideos.length} selected
                  </span>
                </div>

                <div className="flex-1 max-h-95 overflow-y-auto space-y-2 pr-1">
                  {selectedVideos.map((video, index) => {
                    const isFirst = index === 0;
                    const isLast = index === selectedVideos.length - 1;

                    return (
                      <div
                        key={`${video.instanceId}-order-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-border/70 bg-bg/50 p-2 group"
                      >
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-text">
                            {video.title}
                          </p>
                          <p className="text-xs text-text-muted">
                            Order: {index + 1}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={isFirst}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={isLast}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelected(video.instanceId)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {selectedVideos.length === 0 && (
                    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border bg-bg/20 text-center p-4 text-sm text-text-muted">
                      Select assets from the library list on the left to add them to your playlist sequence.
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSavePlaylist}
                    disabled={selectedItems.length === 0}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:bg-accent-strong disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {editingPlaylistId ? "Update Playlist" : "Save Playlist"}
                  </button>
                  {editingPlaylistId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-semibold text-text hover:bg-bg"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedItems([])}
                    disabled={selectedItems.length === 0}
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-semibold text-text hover:border-accent/40 disabled:opacity-50"
                    title="Clear list"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Saved Playlists list */}
        <aside className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Saved Groupings
          </p>
          <h2 className="mt-2 text-xl font-semibold text-text">
            Playlists Library
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Click play to instantly overwrite the streaming queue, or append to queue upcoming videos.
          </p>

          <div className="mt-5 space-y-4 max-h-145 overflow-y-auto pr-1">
            {playlists.map((playlist) => {
              const playlistVids = getPlaylistVideos(playlist);

              return (
                <article
                  key={playlist.id}
                  className={[
                    "rounded-2xl border bg-bg/40 p-4 space-y-3 hover:border-accent/35 transition-colors",
                    editingPlaylistId === playlist.id ? "border-accent ring-1 ring-accent/35" : "border-border/80"
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="u-clamp-2 font-semibold text-text text-base">
                        {playlist.name}
                      </h3>
                      <p className="text-xs text-text-muted">
                        {playlist.assetIds.length} assets queued
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditPlaylist(playlist)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-accent/15 hover:text-accent transition-colors"
                        title="Edit playlist"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlaylist(playlist.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                        title="Delete playlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {playlistVids.length > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {playlistVids.slice(0, 3).map((v, i) => (
                        <img
                          key={`${playlist.id}-thumb-${v.id}-${i}`}
                          src={v.thumbnailUrl}
                          alt={v.title}
                          className="h-8 w-8 rounded-md object-cover border border-border/50"
                          title={v.title}
                        />
                      ))}
                      {playlistVids.length > 3 && (
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-surface-2 border border-border/50 text-xs font-bold text-text-muted px-1">
                          +{playlistVids.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">No valid assets found.</p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handlePlayPlaylist(playlist)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent/15 px-3 py-2 text-xs font-semibold text-accent-strong ring-1 ring-accent/30 hover:bg-accent/25"
                    >
                      <PlaySquare className="h-3.5 w-3.5" />
                      Play Now
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppendPlaylist(playlist)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-text hover:border-accent/40"
                    >
                      <ListPlus className="h-3.5 w-3.5" />
                      Queue Next
                    </button>
                  </div>
                </article>
              );
            })}

            {playlists.length === 0 && (
              <div className="rounded-xl border border-border/70 bg-bg/30 p-4 text-center text-sm text-text-muted italic">
                No custom playlists saved yet. Use the Builder flow on the left to create and save groupings.
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
