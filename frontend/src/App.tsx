import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { MediaLibraryView } from "./pages/MediaLibraryView";
import { PlaylistsView } from "./pages/PlaylistsView";
import { SettingsView } from "./pages/SettingsView";
import { TvDisplay } from "./pages/TvDisplay";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AppRouter() {
  const { currentUser } = useAuth();
  const landingPath = currentUser?.role === "Viewer" ? "/tv" : "/dashboard";

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={currentUser ? landingPath : "/login"} replace />}
      />
      <Route
        path="/login"
        element={
          currentUser ? <Navigate to={landingPath} replace /> : <Login />
        }
      />
      <Route
        element={
          currentUser?.role === "Network Operator" ? (
            <AppShell />
          ) : currentUser?.role === "Viewer" ? (
            <Navigate to="/tv" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="library" element={<MediaLibraryView />} />
        <Route path="playlists" element={<PlaylistsView />} />
        <Route path="live" element={<Dashboard />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>
      <Route
        path="/tv"
        element={
          currentUser?.role === "Viewer" ? (
            <TvDisplay />
          ) : currentUser?.role === "Network Operator" ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="*"
        element={<Navigate to={currentUser ? landingPath : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
