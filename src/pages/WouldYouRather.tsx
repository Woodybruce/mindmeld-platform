import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Shuffle } from "lucide-react";

const questions: [string, string][] = [
  ["Always know what your partner is thinking", "Never know what they're thinking"],
  ["Relive your first date forever", "Fast-forward to your 50th anniversary"],
  ["Only communicate through love letters", "Only communicate through songs"],
  ["Have a personal chef for life", "Have a personal masseuse for life"],
  ["Travel the world together for a year", "Buy your dream home together now"],
  ["Always be the big spoon", "Always be the little spoon"],
  ["Give up social media forever", "Give up eating out forever"],
  ["Have your partner plan every date", "Always be the one who plans"],
  ["Know your partner's every secret", "Keep some mystery alive"],
  ["Live in a tiny home together", "Live in a mansion but far from each other on weekdays"],
  ["Only ever eat breakfast food", "Only ever eat dinner food"],
  ["Have a love song written about you", "Have a love poem written about you"],
  ["Be able to read each other's minds for a day", "Switch bodies for a day"],
  ["Always have matching outfits", "Never wear the same colour as your partner"],
  ["Go on a surprise holiday every month", "Have one epic holiday a year"],
  ["Lose all your photos together", "Lose all your messages together"],
  ["Be famous as a couple", "Be completely private and unknown"],
  ["Always agree on everything", "Have passionate debates about everything"],
  ["Give up Netflix forever", "Give up takeaways forever"],
  ["Have the perfect proposal but a simple wedding", "Have a simple proposal but the perfect wedding"],
];

const WouldYouRather = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<number, 0 | 1>>({});

  const q = questions[index];

  const pick = (option: 0 | 1) => {
    setPicked((prev) => ({ ...prev, [index]: option }));
  };

  const next = () => {
    setIndex((prev) => (prev + 1) % questions.length);
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
            <h1 className="font-display text-lg font-bold text-foreground">🤔 Would You Rather</h1>
          </div>
          <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length}</span>
        </div>
      </header>

      <div className="px-4 py-8 space-y-6">
        <p className="text-sm text-muted-foreground text-center">
          Both pick your answer, then reveal! No wrong answers 😏
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-3"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
              Would you rather…
            </p>

            {[0, 1].map((opt) => {
              const isSelected = picked[index] === opt;
              return (
                <motion.button
                  key={opt}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => pick(opt as 0 | 1)}
                  className={`w-full rounded-2xl border p-5 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 scale-[1.02]"
                      : "border-border/50 bg-card hover:border-border"
                  }`}
                >
                  <p className="font-display text-base font-semibold text-foreground">{q[opt]}</p>
                </motion.button>
              );
            })}

            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
              <span>or</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={next}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Shuffle className="w-4 h-4" /> Next Question
        </button>
      </div>
    </div>
  );
};

export default WouldYouRather;
