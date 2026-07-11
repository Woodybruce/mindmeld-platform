import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Heart } from "lucide-react";

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Dev bypass for preview — gated behind import.meta.env.DEV so it can never
  // activate in a production build.
  const isPreview = import.meta.env.DEV && window.location.hostname.includes("lovable.app") && window.location.hostname.includes("preview");
  const devBypass = import.meta.env.DEV && localStorage.getItem("dev-auth-bypass") === "true";

  if (isPreview && devBypass) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Heart className="w-10 h-10 text-primary animate-pulse" />
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
