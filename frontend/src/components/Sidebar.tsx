import type { LucideIcon } from "lucide-react";
import {
  Layers3,
  LayoutDashboard,
  PlaySquare,
  Settings,
  Tv2,
  Upload,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export interface SidebarProfile {
  readonly name: string;
  readonly role: string;
  readonly email: string;
  readonly department?: string;
}

export interface SidebarNavigationItem {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly end?: boolean;
  readonly badge?: string;
}

export interface SidebarProps {
  readonly profile: SidebarProfile;
  readonly navigation: ReadonlyArray<SidebarNavigationItem>;
  readonly className?: string;
}

export const defaultSidebarProfile: SidebarProfile = {
  name: "Network Operator",
  role: "System Control",
  email: "ops@lobbystream.tv",
  department: "Broadcast Operations",
};

export const defaultSidebarNavigation: ReadonlyArray<SidebarNavigationItem> = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Media Library",
    href: "/library",
    icon: Tv2,
    badge: "142",
  },
  {
    label: "Playlists",
    href: "/playlists",
    icon: PlaySquare,
  },
  {
    label: "Live Queue",
    href: "/live",
    icon: Layers3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar({ profile, navigation, className }: SidebarProps) {
  return (
    <aside
      className={[
        "flex h-full w-full flex-col border-r border-border bg-surface/95 px-5 py-6 text-text shadow-panel backdrop-blur-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center gap-3 pb-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent-strong ring-1 ring-accent/30">
          <Upload className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
            LobbyStream
          </p>
          <p className="m-0 text-sm font-semibold leading-tight text-text sm:text-base">
            Video Management
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-border/80 bg-surface-2/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Active Profile
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent-strong ring-1 ring-accent/25">
            {profile.name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">
              {profile.name}
            </p>
            <p className="truncate text-sm text-text-muted">{profile.role}</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3 text-text-muted">
            <dt>Department</dt>
            <dd className="text-right text-text">
              {profile.department ?? "Operations"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 text-text-muted">
            <dt>Email</dt>
            <dd className="truncate text-right text-text">{profile.email}</dd>
          </div>
        </dl>
      </section>

      <nav className="mt-6 flex-1 space-y-6" aria-label="Primary navigation">
        <div>
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Navigation
          </p>
          <ul className="mt-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                        isActive
                          ? "bg-accent/15 text-text ring-1 ring-accent/30"
                          : "text-text-muted hover:bg-surface-2/80 hover:text-text",
                      ]
                        .filter(Boolean)
                        .join(" ")
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-text-muted ring-1 ring-border/70">
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface-2/50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <Layers3 className="h-4 w-4 text-accent" aria-hidden="true" />
            Network Operator
          </div>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Use the shortcuts above to move between dashboard, library, and live
            control views.
          </p>
        </div>
      </nav>
    </aside>
  );
}
