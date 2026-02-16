import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Heart, Mail } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";

type Step = "email-enter" | "email-sent";

const Auth = () => {
  const { user, loading: authLoading, signInWithEmail } = useAuth();
  const [step, setStep] = useState<Step>("email-enter");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await signInWithEmail(email);
    if (error) setError(error.message);
    else setStep("email-sent");
    setSubmitting(false);
  };

  const isPreview = window.location.hostname.includes("lovable.app") && window.location.hostname.includes("preview");

  const handleDevBypass = () => {
    localStorage.setItem("dev-auth-bypass", "true");
    window.location.href = "/";
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) setError(error.message || "Google sign-in failed");
    setGoogleLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <Heart className="w-14 h-14 text-primary mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground">Us</h1>
          <p className="text-base text-muted-foreground mt-2">Your shared space, together</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "email-enter" && (
            <motion.div key="email-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 rounded-2xl border border-border bg-card py-4 text-base font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {googleLoading ? "Signing in…" : "Continue with Google"}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  autoFocus
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  {submitting ? "Sending…" : "Send Magic Link"}
                </button>
              </form>
            </motion.div>
          )}

          {step === "email-sent" && (
            <motion.div key="email-sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a magic link to <span className="font-medium text-foreground">{email}</span>. Click it to sign in.
              </p>
              <button onClick={() => setStep("email-enter")} className="mt-6 text-sm text-primary font-medium">
                Try again
              </button>
            </motion.div>
           )}
        </AnimatePresence>

        {isPreview && (
          <button
            onClick={handleDevBypass}
            className="mt-8 w-full text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors py-2"
          >
            Skip login (preview only)
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
