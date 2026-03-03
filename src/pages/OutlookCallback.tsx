import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const OutlookCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error) {
        setStatus("error");
        setErrorMsg(params.get("error_description") || "Microsoft login was denied.");
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMsg("No authorization code received.");
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus("error");
          setErrorMsg("You need to be signed in.");
          return;
        }

        const res = await fetch(
          `/api/microsoft-oauth-callback`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code,
              redirect_uri: `${window.location.origin}/outlook-callback`,
            }),
          }
        );

        const result = await res.json();
        if (result.error) {
          setStatus("error");
          setErrorMsg(result.error);
        } else {
          setStatus("success");
          localStorage.setItem("outlook_connected", "true");
          localStorage.removeItem("outlook_no_token");
          setTimeout(() => navigate("/profile"), 1500);
        }
      } catch {
        setStatus("error");
        setErrorMsg("Failed to connect Outlook account.");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="rounded-xl border border-border bg-card p-8 text-center max-w-sm w-full">
        {status === "loading" && (
          <>
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-foreground font-medium">Connecting your Outlook account…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-3xl mb-3">✅</div>
            <p className="text-foreground font-medium">Outlook connected!</p>
            <p className="text-sm text-muted-foreground mt-1">Redirecting to profile…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-3xl mb-3">❌</div>
            <p className="text-foreground font-medium">Connection failed</p>
            <p className="text-sm text-muted-foreground mt-2">{errorMsg}</p>
            <button
              onClick={() => navigate("/profile")}
              className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Back to Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OutlookCallback;
