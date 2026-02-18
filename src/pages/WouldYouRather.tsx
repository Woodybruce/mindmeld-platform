import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Flame, ChevronRight } from "lucide-react";

const questions: [string, string][] = [
  ["Make love slowly all night", "Have wild, passionate quickies all week"],
  ["Always be in control", "Always let your partner take control"],
  ["Have incredible foreplay with no finish", "Skip foreplay but have an explosive finish"],
  ["Make love in public (low risk of being caught)", "Film yourselves for your eyes only"],
  ["Try one new position every week", "Perfect one favourite position forever"],
  ["Hear your partner talk dirty all night", "Have them stay completely silent"],
  ["Be blindfolded during intimacy", "Blindfold your partner"],
  ["Make love somewhere totally new every month", "Have one epic, planned intimate night a year"],
  ["Always initiate", "Always be the one who's seduced"],
  ["Have a sensual massage that leads nowhere", "Skip the massage and get straight to it"],
  ["Only ever do it in the dark", "Only ever do it with the lights on"],
  ["Spend an hour on foreplay", "Use a surprise toy instead"],
  ["Roleplay a fantasy once a week", "Have one deeply intimate no-roleplay night a week"],
  ["Sext all day and wait until night", "Come home early and not wait a second"],
  ["Have your partner whisper exactly what they want", "Have them show you without saying a word"],
  ["Do it somewhere you've never done it before", "Recreate the hottest time you've ever had"],
  ["Watch something steamy together first", "Go in completely spontaneous"],
  ["Spend the whole day in bed", "Have one intense hour and go about your day"],
  ["Tell each other every fantasy you've had", "Act one out without telling each other first"],
  ["Be teased for an hour before anything happens", "Skip the teasing and go full intensity immediately"],
];

const WouldYouRather = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(() => Math.floor(Math.random() * questions.length));
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
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
