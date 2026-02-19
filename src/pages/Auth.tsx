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
