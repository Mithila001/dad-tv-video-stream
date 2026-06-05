import { useMemo, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";
import { useSharedStreamSocket } from "../context/StreamSocketContext";

type ViewMode = "grid" | "list";
type SortMode = "newest" | "oldest" | "title";

export function MediaLibraryView() {
  const { assets: videos, connectionState } = useSharedStreamSocket();
  const [search, setSearch] = useState("");
  const { searchValue, onSearchChange } = useOutletContext<{
    searchValue?: string;
    onSearchChange?: (v: string) => void;
  }>() ?? {};

  useEffect(() => {
    if (searchValue !== undefined) {
      setSearch(searchValue);
    }
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
          [
            video.title,
            video.duration,
            video.size,
            video.format,
            video.uploadDate,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesFormat = format === "all" || video.format === format;

        return matchesSearch && matchesFormat;
      })
      .sort((left, right) => {
        if (sortMode === "title") {
          return left.title.localeCompare(right.title);
        }

        const leftDate = new Date(left.uploadDate).getTime();
        const rightDate = new Date(right.uploadDate).getTime();

        return sortMode === "newest"
          ? rightDate - leftDate
          : leftDate - rightDate;
      });
  }, [format, search, sortMode, videos]);

  return (
    <section className="space-y-6 overflow-hidden">
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
              onClick={() =>
                window.dispatchEvent(new Event("lobbystream:open-upload"))
              }
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
              onChange={(event) =>
                setFormat(event.target.value as "all" | "MP4" | "MOV")
              }
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
          {isLoading
            ? "Loading assets..."
            : `${filteredVideos.length} assets available`}
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
        {filteredVideos.map((video) => (
          <article
            key={video.id}
            className={[
              "overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-panel",
              viewMode === "grid"
                ? "overflow-hidden"
                : "overflow-hidden xl:flex xl:items-stretch",
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
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Format
                  </dt>
                  <dd className="mt-1 text-text">{video.format}</dd>
                </div>
                <div className="overflow-hidden rounded-xl bg-surface-2/60 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Category
                  </dt>
                  <dd className="mt-1 truncate text-text">{video.category}</dd>
                </div>
                <div className="overflow-hidden rounded-xl bg-surface-2/60 px-3 py-2 sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Source
                  </dt>
                  <dd className="u-break-anywhere mt-1 text-text">{video.videoUrl}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}