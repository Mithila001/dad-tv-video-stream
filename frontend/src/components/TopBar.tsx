import { useState, useRef, useEffect, type ReactNode } from "react";
import { Settings, LogOut, ChevronDown } from "lucide-react";import { useNavigate } from "react-router-dom";

export interface TopBarProps {
  readonly searchValue: string;
  readonly onSearchChange: (value: string) => void;
  readonly uploadActionSlot: ReactNode;
  readonly notificationCount: number;
  readonly onNotificationsClick: () => void;
  readonly onProfileClick?: () => void;
  readonly profileActionLabel?: string;
  readonly profileName?: string;
  readonly profileRole?: string;
  readonly profileEmail?: string;
  readonly className?: string;
}

export function TopBar({
  searchValue: _searchValue,
  onSearchChange: _onSearchChange,
  uploadActionSlot: _uploadActionSlot,
  notificationCount: _notificationCount,
  onNotificationsClick: _onNotificationsClick,
  onProfileClick,
  profileActionLabel = "Logout",
  profileName = "Admin",
  profileRole = "Network Operator",
  profileEmail = "admin@lobbystream.tv",
  className,
}: TopBarProps) {
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = profileName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();

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

      <div className="flex items-center gap-2">
        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowProfile((prev) => !prev)}
            className={[
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              showProfile
                ? "border-accent/40 bg-accent/10 text-text ring-1 ring-accent/25"
                : "border-border bg-surface-2 text-text hover:border-accent/50",
            ].join(" ")}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent-strong">
              {initials}
            </div>
            <span className="hidden sm:inline">{profileName}</span>
            <ChevronDown className={["h-3.5 w-3.5 transition-transform", showProfile ? "rotate-180" : ""].join(" ")} />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border bg-surface p-2 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
              {/* Profile info */}
              <div className="px-3 py-3 border-b border-border/60 mb-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent-strong ring-1 ring-accent/25">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{profileName}</p>
                    <p className="truncate text-xs text-text-muted">{profileRole}</p>
                    <p className="truncate text-xs text-text-muted">{profileEmail}</p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <button
                type="button"
                onClick={() => {
                  setShowProfile(false);
                  navigate("/settings");
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProfile(false);
                  onProfileClick?.();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {profileActionLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}