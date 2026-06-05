import { useEffect, type ReactNode, useState, useMemo } from "react";
import { Upload } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  defaultSidebarNavigation,
  defaultSidebarProfile,
  Sidebar,
} from "./Sidebar";
import { UploadVideoModal } from "./UploadVideoModal";
import { TopBar } from "./TopBar";
import { RoleGate } from "./RoleGate";
import { defaultUser, useAuth } from "../context/AuthContext";
import { useSharedStreamSocket } from "../context/StreamSocketContext";
import { uploadVideoAsset, type UploadVideoPayload } from "../services/api";

export interface AppShellProps {
  readonly children?: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { currentUser, login, logout } = useAuth();
  const { assets } = useSharedStreamSocket();
  const navigate = useNavigate();

  const navigation = useMemo(() => {
    return defaultSidebarNavigation.map((item) =>
      item.href === "/library"
        ? { ...item, badge: String(assets.length) }
        : item
    );
  }, [assets]);

  useEffect(() => {
    const openUploadModal = () => setIsUploadModalOpen(true);
    window.addEventListener("lobbystream:open-upload", openUploadModal);
    return () => window.removeEventListener("lobbystream:open-upload", openUploadModal);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (value.trim()) {
      navigate("/library");
    }
  };

  const sidebarProfile = currentUser
    ? {
        name: currentUser.username,
        role: currentUser.role,
        email: currentUser.email,
        department: currentUser.role,
      }
    : defaultSidebarProfile;

  const profileActionLabel = currentUser ? "Logout" : "Login";

  async function handleUpload(payload: UploadVideoPayload) {
    setIsUploading(true);
    try {
      await uploadVideoAsset(payload);
      window.dispatchEvent(new Event("lobbystream:data-updated"));
      setIsUploadModalOpen(false);
    } catch (error) {
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-400 flex-col lg:flex-row">
        <div className="w-full lg:max-w-[320px] lg:shrink-0">
          <Sidebar
            profile={sidebarProfile}
            navigation={navigation}
            className="min-h-0 lg:min-h-screen"
          />
        </div>

        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar
            searchValue={searchValue}
            onSearchChange={handleSearchChange}
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
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Upload Video
                </button>
              </RoleGate>
            }
            notificationCount={0}
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
            <Outlet context={{ searchValue, onSearchChange: handleSearchChange }} />
          </main>
        </div>
      </div>

      <UploadVideoModal
        open={isUploadModalOpen}
        loading={isUploading}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleUpload}
      />
    </div>
  );
}