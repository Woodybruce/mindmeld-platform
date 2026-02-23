import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Flame, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { notifyPartner } from "@/lib/notifyPartner";

const questions: [string, string][] = [
  ["Be tied up by your partner", "Be the one doing the tying"],
  ["Have your partner strip for you", "Strip for your partner"],
  ["Make love in a hotel with strangers in the next room", "Do it in your car at night"],
  ["Have your partner read you an erotic story", "Act one out together without warning"],
  ["Have a full body massage that slowly turns intimate", "Start at full intensity and cool down slowly"],
  ["Try a new kink your partner suggests", "Introduce your own secret fantasy first"],
  ["Have your partner in charge of your pleasure for an hour", "Give them complete control for an entire evening"],
  ["Do it with music playing loudly", "Do it in absolute silence"],
  ["Be woken up intimately by your partner", "Wake up to find them already waiting for you"],
  ["Send an explicit voice note", "Send a photo they'd never forget"],
  ["Roleplay as strangers meeting for the first time", "Roleplay a power dynamic — boss and employee"],
  ["Use a blindfold on your partner", "Let them use one on you"],
  ["Be completely in charge of the pace the whole time", "Have your partner control every single moment"],
  ["Have your partner describe exactly what they want", "Have them show you without saying a single word"],
  ["Do it with all the lights blazing", "Only ever by candlelight"],
  ["Spend 30 focused minutes entirely on your partner", "Have them spend 30 focused minutes entirely on you"],
  ["Sneak somewhere outdoors at night", "Transform your bedroom into somewhere totally unrecognisable"],
  ["Watch each other get ready slowly before anything happens", "Skip all build-up and act on impulse immediately"],
  ["Revisit the wildest thing you've ever done together", "Do something completely new you've never even discussed"],
  ["Dirty talk non-stop the entire time", "Zero words — only sounds and touch"],
  ["Be completely dominant for a night", "Be completely submissive for a night"],
  ["Have your partner tease you until you beg", "Be the one doing the teasing"],
  ["Go slow and drawn-out for hours", "Hard, intense and done in under 15 minutes"],
  ["Let your partner choose every position for a month", "Introduce one brand new position every single week"],
  ["Make full eye contact with all the lights on", "Be blindfolded so every sensation is a complete surprise"],
];


const WouldYouRather = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [index, setIndex] = useState(() => Math.floor(Math.random() * questions.length));

  useEffect(() => {
    if (profile?.partner_id) {
      notifyPartner({ partnerId: profile.partner_id, title: "🔥 Would You Rather!", body: `${profile.username || "Your partner"} started Spicy Would You Rather`, route: "/would-you-rather" });
    }
  }, []);
  const [picked, setPicked] = useState<Record<number, 0 | 1>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const q = questions[index];
  const hasPicked = picked[index] !== undefined;
  const isRevealed = revealed.has(index);

  const pick = (option: 0 | 1) => {
    if (!hasPicked) setPicked((prev) => ({ ...prev, [index]: option }));
  };

  const reveal = () => {
    setRevealed((prev) => new Set(prev).add(index));
  };

  const next = () => {
    const remaining = questions.map((_, i) => i).filter((i) => !revealed.has(i));
    if (remaining.length === 0) {
      setPicked({});
      setRevealed(new Set());
      setIndex(Math.floor(Math.random() * questions.length));
    } else {
      setIndex(remaining[Math.floor(Math.random() * remaining.length)]);
    }
  };

  const answeredCount = Object.keys(picked).length;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/us?tab=games")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">🔥 Spicy Would You Rather</h1>
          </div>
          <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length}</span>
        </div>
      </header>

      <div className="px-4 py-8 space-y-6">
        <p className="text-sm text-muted-foreground text-center">
          Each pick your answer secretly, then reveal together 🔥
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-center gap-2 pb-1">
              <Flame className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                Would you rather…
              </p>
              <Flame className="w-4 h-4 text-primary" />
            </div>

            {[0, 1].map((opt) => {
              const isSelected = picked[index] === opt;
              const showResult = isRevealed && isSelected;

              return (
                <motion.button
                  key={opt}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => pick(opt as 0 | 1)}
                  disabled={hasPicked && !isSelected}
                  className={`w-full rounded-2xl border p-5 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 scale-[1.02]"
                      : hasPicked
                      ? "border-border/30 bg-card/50 opacity-50"
                      : "border-border/50 bg-card hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{opt === 0 ? "A" : "B"}</span>
                    <p className="font-display text-base font-semibold text-foreground leading-snug">{q[opt]}</p>
                  </div>
                  {showResult && (
                    <p className="text-xs text-primary font-medium mt-2 pl-8">✓ Your pick</p>
                  )}
                </motion.button>
              );
            })}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground font-medium">or</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Reveal + Next */}
        {hasPicked && !isRevealed ? (
          <button
            onClick={reveal}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Flame className="w-4 h-4" /> Reveal Each Other's Answer
          </button>
        ) : (
          <button
            onClick={next}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${
              hasPicked
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            Next Question <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {!hasPicked && (
          <p className="text-[11px] text-muted-foreground text-center">
            Both pick before revealing 👀
          </p>
        )}
      </div>
    </div>
  );
};

export default WouldYouRather;
