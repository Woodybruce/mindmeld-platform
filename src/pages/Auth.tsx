import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Heart, ArrowRight, Mail, Phone, ChevronLeft } from "lucide-react";

type Step = "choose" | "email-enter" | "email-sent" | "phone-enter" | "phone-verify";

const Auth = () => {
  const { user, loading: authLoading, signInWithEmail, signInWithPhone, verifyOtp } = useAuth();
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await signInWithPhone(phone);
    if (error) setError(error.message);
    else setStep("phone-verify");
    setSubmitting(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await verifyOtp(phone, otp);
    if (error) setError(error.message);
    // On success, onAuthStateChange will redirect
    setSubmitting(false);
  };

  const reset = () => {
    setStep("choose");
    setError("");
    setEmail("");
    setPhone("");
    setOtp("");
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
          {step === "choose" && (
            <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <button
                onClick={() => setStep("phone-enter")}
                className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-5 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <span className="font-medium text-base text-foreground">Continue with Phone</span>
                  <p className="text-sm text-muted-foreground">We'll text you a code</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
              </button>

              <button
                onClick={() => setStep("email-enter")}
                className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-5 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-us-sage/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-us-sage" />
                </div>
                <div>
                  <span className="font-medium text-base text-foreground">Continue with Email</span>
                  <p className="text-sm text-muted-foreground">We'll send a magic link</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
              </button>
            </motion.div>
          )}

          {step === "email-enter" && (
            <motion.div key="email-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <button type="button" onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
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
              <button onClick={reset} className="mt-6 text-sm text-primary font-medium">
                Try a different method
              </button>
            </motion.div>
          )}

          {step === "phone-enter" && (
            <motion.div key="phone-enter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <button type="button" onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <input
                  type="tel"
                  autoFocus
                  placeholder="+44 7700 900000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Phone className="w-4 h-4" />
                  {submitting ? "Sending…" : "Send Code"}
                </button>
              </form>
            </motion.div>
          )}

          {step === "phone-verify" && (
            <motion.div key="phone-verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <button type="button" onClick={() => setStep("phone-enter")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to <span className="font-medium text-foreground">{phone}</span></p>
                <input
                  type="text"
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting || otp.length < 6}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Verifying…" : "Verify & Sign In"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Auth;
