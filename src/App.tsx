import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import PortalLayout from "./layouts/PortalLayout";
import AddTeamPage from "./pages/AddTeamPage";
import AdminPortal from "./pages/AdminPortal";
import AuthCallback from "./pages/AuthCallback";
import ChooseTeamPage from "./pages/ChooseTeamPage";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import SignupPage from "./pages/SignupPage";
import TasksPage from "./pages/TasksPage";
import TeamsPage from "./pages/TeamsPage";
import { getToken } from "./lib/storage";

const API_DOCS = "https://chatbot-backend-h6oj.onrender.com/docs";

function ApiDocsRedirect() {
  window.location.replace(API_DOCS);
  return null;
}

function BootScreen() {
  return (
    <div className="grid h-screen place-items-center text-white">
      <div className="text-center">
        <div className="text-lg font-semibold">AssetCues</div>
        <div className="mt-1 text-xs text-neutral-400">Loading portal…</div>
      </div>
    </div>
  );
}

function RequireSupabaseAuth({ children }: { children: React.ReactNode }) {
  const { supabaseSession, supabaseConfigured } = useAuth();
  if (supabaseConfigured && !supabaseSession) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RequirePortalAccess({ children }: { children: React.ReactNode }) {
  const { fastApiUser, activeTeamId, supabaseConfigured, supabaseSession } = useAuth();
  if (!getToken() || !fastApiUser) {
    return <Navigate to="/login" replace />;
  }
  if (supabaseConfigured && supabaseSession && !activeTeamId) {
    return <Navigate to="/choose-team" replace />;
  }
  if (fastApiUser.is_admin) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { ready, supabaseSession, fastApiUser, connected, signOut, refreshHealth } = useAuth();

  if (typeof window !== "undefined") {
    const { hash, pathname } = window.location;
    if (hash.includes("access_token") && pathname !== "/auth/callback") {
      window.location.replace(`/auth/callback${hash}`);
      return <BootScreen />;
    }
  }

  if (!ready) return <BootScreen />;

  return (
    <div className="min-h-screen bg-portal-bg text-portal-text">
    <Routes>
      <Route
        path="/login"
        element={
          getToken() && fastApiUser ? (
            <Navigate to={fastApiUser.is_admin ? "/admin" : "/"} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route path="/docs" element={<ApiDocsRedirect />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/signup"
        element={
          getToken() && fastApiUser ? (
            <Navigate to={fastApiUser.is_admin ? "/admin" : "/"} replace />
          ) : (
            <SignupPage />
          )
        }
      />
      <Route
        path="/choose-team"
        element={
          <RequireSupabaseAuth>
            <ChooseTeamPage />
          </RequireSupabaseAuth>
        }
      />
      <Route
        path="/admin"
        element={
          fastApiUser?.is_admin ? (
            <AdminPortal
              sessionUser={fastApiUser}
              connected={connected}
              onLogout={() => signOut()}
              onConnectionChange={refreshHealth}
            />
          ) : (
            <Navigate to={supabaseSession || getToken() ? "/choose-team" : "/login"} replace />
          )
        }
      />
      <Route
        element={
          <RequirePortalAccess>
            <PortalLayout />
          </RequirePortalAccess>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="teams/new" element={<AddTeamPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to={supabaseSession || getToken() ? "/choose-team" : "/login"} replace />} />
    </Routes>
    </div>
  );
}
