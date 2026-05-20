import { type ReactNode, useState } from "react";
import { Upload } from "lucide-react";
import { Outlet } from "react-router-dom";
import {
  defaultSidebarNavigation,
  defaultSidebarProfile,
  Sidebar,
} from "./Sidebar";
import { TopBar } from "./TopBar";
import { RoleGate } from "./RoleGate";
import { defaultUser, useAuth } from "../context/AuthContext";

export interface AppShellProps {
  readonly children?: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [searchValue, setSearchValue] = useState("");
  const { currentUser, login, logout } = useAuth();

  const sidebarProfile = currentUser
    ? {
        name: currentUser.username,
        role: currentUser.role,
        email: currentUser.email,
        department: currentUser.role,
      }
    : defaultSidebarProfile;

  const profileActionLabel = currentUser ? "Logout" : "Login";

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-400 flex-col lg:flex-row">
        <div className="w-full lg:max-w-[320px] lg:shrink-0">
          <Sidebar
            profile={sidebarProfile}
            navigation={defaultSidebarNavigation}
            className="min-h-0 lg:min-h-screen"
          />
        </div>

        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            uploadActionSlot={
              <RoleGate
                requiredRole="Network Operator"
                mode="disable"
                fallback={
                  <button
                    type="button"
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm font-semibold text-text-muted opacity-60"
                    disabled
                    aria-label="Upload Video requires Network Operator access"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Upload Video
                  </button>
                }
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Upload Video
                </button>
              </RoleGate>
            }
            notificationCount={4}
            onNotificationsClick={() => undefined}
            profileActionLabel={profileActionLabel}
            onProfileClick={() => {
              if (currentUser) {
                logout();
                return;
              }

              login(defaultUser);
            }}
          />

          <main className="flex-1 overflow-auto bg-linear-to-b from-bg via-bg to-surface/40 px-4 py-5 sm:px-6 lg:px-8">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
}
