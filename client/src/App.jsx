import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import "./chat.css";

function FullPageSpinner({ label }) {
  return (
    <div className="bootScreen">
      <div className="bootLogo">✦</div>
      <span className="bootText">{label}</span>
    </div>
  );
}

/* Everything past the auth gate needs a session, and a signed-in user should
   never sit on the login screen. */
function Protected({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner label="Loading चित्रGupt…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  return children;
}

function PublicOnly({ children }) {
  const { session, loading } = useAuth();

  if (loading) return <FullPageSpinner label="Loading चित्रGupt…" />;
  if (session) return <Navigate to="/" replace />;

  return children;
}

function Router() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Auth />
          </PublicOnly>
        }
      />

      <Route
        path="/"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />

      <Route
        path="/c/:chatId"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />

      <Route
        path="/settings"
        element={
          <Protected>
            <Settings />
          </Protected>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </AuthProvider>
  );
}
