import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams } from "react-router-dom";
import { Heart, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Mode = "login" | "signup";

const Auth = () => {
  const { user, loading: authLoading, signInWithPassword, signUp, linkPartnerByCode, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite") || "";
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Auto-link partner when logged in with invite code
  useEffect(() => {
    if (user && inviteCode && profile && !profile.partner_id) {
      linkPartnerByCode(inviteCode).then((result) => {
        if (result.success) {
          toast.success("Partner linked! 🎉");
        }
      });
    }
  }, [user, inviteCode, profile]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setSubmitting(false);
        return;
      }
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSignupSuccess(true);
      }
    } else {
      const { error } = await signInWithPassword(email, password);
      if (error) {
        setError(error.message);
      }
    }
    setSubmitting(false);
  };

  const isPreview = window.location.hostname.includes("lovable.app") && window.location.hostname.includes("preview");

  const handleDevBypass = () => {
    localStorage.setItem("dev-auth-bypass", "true");
    window.location.href = "/";
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Tap it to activate your account, then come back and log in.
          </p>
          <button
            onClick={() => { setSignupSuccess(false); setMode("login"); setPassword(""); setError(""); }}
            className="text-sm text-primary font-medium"
          >
            Back to login
          </button>
        </motion.div>
      </div>
    );
  }

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

        {/* Mode toggle */}
        <div className="flex gap-1 mb-6 bg-secondary rounded-2xl p-1">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Log in
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Sign up
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                autoFocus
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-card pl-11 pr-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-2xl border border-border bg-card pl-11 pr-12 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => setForgotMode(true)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Forgot password?
              </button>
            )}
          </motion.form>
        </AnimatePresence>

        {/* Forgot password modal */}
        <AnimatePresence>
          {forgotMode && !resetSent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center px-6"
              onClick={() => setForgotMode(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-xl"
              >
                <h3 className="font-display text-lg font-bold text-foreground mb-2">Reset password</h3>
                <p className="text-sm text-muted-foreground mb-4">Enter your email and we'll send a reset link.</p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSubmitting(true);
                    setError("");
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (error) {
                      setError(error.message);
                    } else {
                      setResetSent(true);
                    }
                    setSubmitting(false);
                  }}
                  className="space-y-3"
                >
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      autoFocus
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-border bg-card pl-11 pr-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-primary py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Sending…" : "Send reset link"}
                  </button>
                  <button type="button" onClick={() => { setForgotMode(false); setError(""); }} className="w-full text-sm text-muted-foreground py-1">
                    Cancel
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
          {resetSent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center px-6"
              onClick={() => { setForgotMode(false); setResetSent(false); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-xl text-center"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">Check your email</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We sent a reset link to <span className="font-medium text-foreground">{email}</span>.
                </p>
                <button
                  onClick={() => { setForgotMode(false); setResetSent(false); setError(""); }}
                  className="text-sm text-primary font-medium"
                >
                  Back to login
                </button>
              </motion.div>
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
