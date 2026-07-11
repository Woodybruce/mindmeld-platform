import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowRight, Sparkles, Users, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  { id: "welcome" },
  { id: "name" },
  { id: "invite" },
  { id: "ready" },
];

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const { user, refreshProfile, linkPartnerByEmail } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete();
  };

  const handleSaveName = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ username: name.trim() })
      .eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    next();
  };

  const handleInvite = async () => {
    if (!partnerEmail.trim()) { next(); return; }
    // Wire the email field to the real partner-link flow (same one PartnerInviteCard uses).
    // It links a partner who already has an account; on failure we stay honest and don't
    // advance with a false success.
    setSaving(true);
    const result = await linkPartnerByEmail(partnerEmail.trim());
    setSaving(false);
    if (result.success) {
      toast.success("Partner linked! 🎉");
      next();
    } else {
      toast.error(result.error || "Couldn't link — they may need an account first. You can try again from Profile.");
    }
  };

  const currentStep = steps[step].id;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/40" : "w-4 bg-border"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {currentStep === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-us-blush/30 flex items-center justify-center mx-auto"
              >
                <Heart className="w-10 h-10 text-primary" />
              </motion.div>
              <div>
                <h1 className="font-display text-5xl font-bold text-foreground">Welcome to Us</h1>
                <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
                  Your private space to connect, plan, and grow together as a couple.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { icon: "💬", label: "Chat" },
                  { icon: "📅", label: "Plan" },
                  { icon: "🏃‍♂️💋🏃‍♀️", label: "Play" },
                ].map((f) => (
                  <div key={f.label} className="rounded-xl bg-card border border-border/50 p-3 text-center">
                    <span className="text-2xl">{f.icon}</span>
                    <p className="text-[14px] text-muted-foreground mt-1 font-medium">{f.label}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={next}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {currentStep === "name" && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-us-sage/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-us-sage" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">What's your name?</h2>
                <p className="text-sm text-muted-foreground mt-1">This is what your partner will see</p>
              </div>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                placeholder="Your first name"
                className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-center text-lg font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleSaveName}
                disabled={!name.trim() || saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Continue"} <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {currentStep === "invite" && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-us-blush/30 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-us-coral" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">Invite your partner</h2>
                <p className="text-sm text-muted-foreground mt-1">Share the app with your other half</p>
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="partner@email.com"
                  className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <p className="text-[13px] text-muted-foreground text-center">
                If your partner already has an account, we'll link you now. You can also invite
                them anytime from your Profile.
              </p>
              <button
                onClick={handleInvite}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Linking…" : partnerEmail.trim() ? "Link Partner" : "Skip for now"} <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {currentStep === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, type: "spring" }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-6xl"
              >
                🎉
              </motion.div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">You're all set!</h2>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  Start exploring quizzes, games, and shared lists with your partner.
                </p>
              </div>
              <button
                onClick={onComplete}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-us-terracotta py-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Let's go! <Heart className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
