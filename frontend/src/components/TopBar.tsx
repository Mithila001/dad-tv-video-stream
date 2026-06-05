import { useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, UserCircle2, X } from "lucide-react";

export interface TopBarProps {
  readonly searchValue: string;
  readonly onSearchChange: (value: string) => void;
  readonly uploadActionSlot: ReactNode;
  readonly notificationCount: number;
  readonly onNotificationsClick: () => void;
  readonly onProfileClick?: () => void;
  readonly profileActionLabel?: string;
  readonly className?: string;
}

export function TopBar({
  searchValue,
  onSearchChange,
  uploadActionSlot,
  notificationCount: _notificationCount,
  onNotificationsClick: _onNotificationsClick,
  onProfileClick,
  profileActionLabel = "Profile",
  className,
}: TopBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <header
      className={[
        "flex flex-col gap-4 border-b border-border bg-surface/90 px-6 py-4 text-text shadow-panel backdrop-blur-sm md:flex-row md:items-center md:justify-between",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
            Admin Console
          </p>
          <h2 className="u-clamp-2 m-0 text-xl font-semibold leading-tight text-text md:text-2xl">
            LobbyStream Video Management System
          </h2>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-1 md:flex-row md:items-center md:justify-end">
        <label className="relative w-full md:max-w-md" htmlFor="lobbystream-search">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            id="lobbystream-search"
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search videos, streams, or metadata"
            className="w-full rounded-xl border border-border bg-bg/80 py-3 pl-10 pr-4 text-sm text-text placeholder:text-text-muted shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>

        <div className="flex flex-wrap items-center justify-end gap-2 self-end md:self-auto">
          {/* Filters button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={[
                "inline-flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                showFilters
                  ? "border-accent/40 bg-accent/10 text-text ring-1 ring-accent/25"
                  : "border-border bg-surface-2 text-text hover:border-accent/50",
              ].join(" ")}
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border bg-surface p-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                    Filters
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="rounded-lg p-1 text-text-muted hover:text-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted mb-1">
                      Format
                    </label>
                    <select className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent">
                      <option>All formats</option>
                      <option>MP4</option>
                      <option>MOV</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted mb-1">
                      Sort by
                    </label>
                    <select className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent">
                      <option>Newest first</option>
                      <option>Oldest first</option>
                      <option>Title A–Z</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted mb-1">
                      Status
                    </label>
                    <select className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent">
                      <option>All</option>
                      <option>Playing</option>
                      <option>Queued</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {uploadActionSlot}

          <button
            type="button"
            onClick={onProfileClick}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-3 text-sm font-semibold text-text transition hover:border-accent/50 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            aria-label={profileActionLabel}
          >
            <UserCircle2 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{profileActionLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
}