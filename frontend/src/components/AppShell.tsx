import { useEffect, useState, useMemo } from "react";
import { Outlet } from "react-router-dom";
import {
  defaultSidebarNavigation,
  defaultSidebarProfile,
  Sidebar,
} from "./Sidebar";
import { TopBar } from "./TopBar";
import { UploadVideoModal } from "./UploadVideoModal";
import { defaultUser, useAuth } from "../context/AuthContext";
import { useSharedStreamSocket } from "../context/StreamSocketContext";
import { uploadVideoAsset, type UploadVideoPayload } from "../services/api";

export interface AppShellProps {}

export function AppShell({}: AppShellProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { currentUser, login, logout } = useAuth();
  const { assets } = useSharedStreamSocket();

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
            searchValue=""
            onSearchChange={() => undefined}
            uploadActionSlot={null}
            notificationCount={0}
            onNotificationsClick={() => undefined}
            profileName={currentUser?.username ?? "Admin"}
            profileRole={currentUser?.role ?? "Network Operator"}
            profileEmail={currentUser?.email ?? ""}
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
            <Outlet />
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