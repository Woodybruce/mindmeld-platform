import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Detect magic link token in URL hash — give Supabase time to exchange it
  const hashHasToken = location.hash.includes("access_token") || location.hash.includes("type=magiclink") || location.hash.includes("type=recovery");
  const [waitingForToken, setWaitingForToken] = useState(hashHasToken);

  useEffect(() => {
    if (!hashHasToken) return;
    // Give Supabase up to 5s to process the token
    const timeout = setTimeout(() => setWaitingForToken(false), 5000);
    return () => clearTimeout(timeout);
  }, [hashHasToken]);

  // Stop waiting once we have a user
  useEffect(() => {
    if (user) setWaitingForToken(false);
  }, [user]);

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
};

export default AuthGuard;
