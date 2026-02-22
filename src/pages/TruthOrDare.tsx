import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Shuffle, Heart, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { notifyPartner } from "@/lib/notifyPartner";

const truths = [
  "What's your favourite memory of us together?",
  "What's something you've never told me?",
  "When did you first know you loved me?",
  "What's your biggest fantasy about us?",
  "What's something I do that secretly turns you on?",
  "What's your favourite physical feature of mine?",
  "Have you ever dreamt about someone else while with me?",
  "What's the most romantic thing you wish I'd do?",
  "What's something you pretend to like but don't?",
  "What's a secret you've kept from me?",
  "When do you feel most attracted to me?",
  "What's the most embarrassing thing you've done to impress me?",
  "What's a relationship deal-breaker you've never mentioned?",
  "What's the naughtiest thought you've had about me today?",
  "What's something you want us to try together?",
  "What moment made you fall deeper in love with me?",
  "What's your guilty pleasure you hide from me?",
  "If you could relive one date, which would it be?",
  "What do I do that makes you feel most loved?",
  "What's something you wish we did more often?",
];

const dares = [
  "Give your partner a 30-second massage wherever they choose",
  "Whisper something sexy in your partner's ear",
  "Do your best impression of your partner",
  "Slow dance together for one full minute — no music",
  "Feed your partner something with your eyes closed",
  "Let your partner post anything on your social media",
  "Give your partner a kiss on their favourite spot",
  "Send a flirty text to your partner right now",
  "Let your partner style your hair however they want",
  "Recreate your first kiss right now",
  "Do 10 push-ups or let your partner sit on your back while you try",
  "Draw a portrait of your partner in 30 seconds",
  "Serenade your partner with any song",
  "Give your partner a compliment for every finger on one hand",
  "Act out how you'd propose (or re-propose) in the most dramatic way",
  "Let your partner tickle you for 15 seconds without fighting back",
  "Do a catwalk across the room in your most confident strut",
  "Write 'I love you' somewhere on your partner's body",
  "Hold eye contact for 60 seconds without laughing",
  "Kiss your partner in three different places",
];

const TruthOrDare = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [mode, setMode] = useState<"truth" | "dare" | null>(null);

  useEffect(() => {
    if (profile?.partner_id) {
      notifyPartner({ partnerId: profile.partner_id, title: "😈 Truth or Dare!", body: `${profile.username || "Your partner"} started Truth or Dare`, route: "/truth-or-dare" });
    }
  }, []);
  const [current, setCurrent] = useState<string | null>(null);
  const [used, setUsed] = useState<Set<string>>(new Set());

  const draw = (type: "truth" | "dare") => {
    const pool = (type === "truth" ? truths : dares).filter((q) => !used.has(q));
    if (pool.length === 0) {
      setUsed(new Set());
      const fresh = type === "truth" ? truths : dares;
      const pick = fresh[Math.floor(Math.random() * fresh.length)];
      setCurrent(pick);
      setUsed(new Set([pick]));
    } else {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setCurrent(pick);
      setUsed((prev) => new Set(prev).add(pick));
    }
    setMode(type);
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/us?tab=games")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">🎯 Truth or Dare</h1>
        </div>
      </header>

      <div className="px-4 py-8 space-y-6">
        <p className="text-sm text-muted-foreground text-center">
          Take turns choosing Truth or Dare. {used.size > 0 && `${used.size} played so far!`}
        </p>

        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => draw("truth")}
            className="flex-1 rounded-2xl bg-gradient-to-br from-us-sage/20 to-us-cream/40 border border-border/30 p-6 text-center hover:scale-[1.02] transition-transform"
          >
            <Heart className="w-8 h-8 mx-auto text-us-sage mb-2" />
            <span className="font-display text-lg font-bold text-foreground">Truth</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => draw("dare")}
            className="flex-1 rounded-2xl bg-gradient-to-br from-us-coral/15 to-us-blush/25 border border-border/30 p-6 text-center hover:scale-[1.02] transition-transform"
          >
            <Flame className="w-8 h-8 mx-auto text-us-coral mb-2" />
            <span className="font-display text-lg font-bold text-foreground">Dare</span>
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`rounded-2xl p-6 border border-border/30 ${
                mode === "truth"
                  ? "bg-gradient-to-br from-us-sage/10 to-us-cream/30"
                  : "bg-gradient-to-br from-us-coral/10 to-us-blush/20"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {mode === "truth" ? "💚 Truth" : "🔥 Dare"}
              </p>
              <p className="font-display text-lg font-bold text-foreground leading-relaxed">
                {current}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {current && (
          <button
            onClick={() => draw(mode!)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Shuffle className="w-4 h-4" /> Skip / Next
          </button>
        )}
      </div>
    </div>
  );
};

export default TruthOrDare;
