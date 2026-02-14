import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const IS_PREVIEW = window.location.hostname.includes("lovable.app") && window.location.hostname.includes("preview");

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [devBypass, setDevBypass] = useState(() => {
    return IS_PREVIEW && localStorage.getItem("dev-auth-bypass") === "true";
  });

  // Detect magic link token in URL hash
  const hashHasToken = location.hash.includes("access_token") || location.hash.includes("type=magiclink") || location.hash.includes("type=recovery");
  const [waitingForToken, setWaitingForToken] = useState(hashHasToken);

  useEffect(() => {
    if (!hashHasToken) return;
    const timeout = setTimeout(() => setWaitingForToken(false), 5000);
    return () => clearTimeout(timeout);
  }, [hashHasToken]);

  useEffect(() => {
    if (user) setWaitingForToken(false);
  }, [user]);

  // Allow bypass in preview
  if (devBypass) {
    return <>{children}</>;
  }

  if (loading || waitingForToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

export default AuthGuard;
