import type { ReactNode } from "react";
import { Bell, Search, SlidersHorizontal, UserCircle2 } from "lucide-react";

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
  notificationCount,
  onNotificationsClick,
  onProfileClick,
  profileActionLabel = 'Profile',
  className,
}: TopBarProps) {
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
          <h2 className="m-0 text-2xl font-semibold leading-tight text-text">
            LobbyStream Video Management System
          </h2>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-1 md:flex-row md:items-center md:justify-end">
        <label
          className="relative w-full md:max-w-md"
          htmlFor="lobbystream-search"
        >
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

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-3 text-sm font-semibold text-text transition hover:border-accent/50 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
          </button>

          {uploadActionSlot}

          <button
            type="button"
            onClick={onNotificationsClick}
            className="relative inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-3 text-sm font-semibold text-text transition hover:border-accent/50 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            aria-label={`Notifications (${notificationCount})`}
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-bg">
              {notificationCount}
            </span>
          </button>

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
