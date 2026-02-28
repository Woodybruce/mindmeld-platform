import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Shuffle, RotateCcw, Sparkles, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { notifyPartner } from "@/lib/notifyPartner";

interface Card {
  category: string;
  emoji: string;
  value: string;
  colour: string;
}

const deck: Record<string, { emoji: string; colour: string; cards: string[] }> = {
  Venue: {
    emoji: "📍",
    colour: "from-us-coral/20 to-us-blush/30",
    cards: [
      "Cosy night in with candles",
      "Rooftop bar or restaurant",
      "Picnic in the park",
      "Beach sunset walk",
      "Fancy hotel room",
      "Drive-in cinema",
      "Jazz bar or live music venue",
      "Art gallery or museum",
      "Cooking class venue",
      "Escape room",
      "Bowling alley",
      "Karaoke bar",
      "Spa evening",
      "Stargazing spot",
      "Comedy club",
    ],
  },
  Cuisine: {
    emoji: "🍽️",
    colour: "from-us-gold/20 to-us-cream/40",
    cards: [
      "Italian — pasta & wine",
      "Japanese sushi experience",
      "Home-cooked 3-course dinner",
      "Indian takeaway & cocktails",
      "Tapas & sangria",
      "Sushi omakase",
      "Pizza & a movie",
      "Street food market",
      "Thai noodles & spring rolls",
      "Greek mezze platter",
      "Mediterranean seafood",
      "Homemade charcuterie board",
      "Vegan feast",
      "Korean BBQ",
      "French bistro classics",
    ],
  },
  Vibe: {
    emoji: "✨",
    colour: "from-us-sage/20 to-us-cream/30",
    cards: [
      "Romantic & candlelit",
      "Fun & playful",
      "Adventurous & spontaneous",
      "Relaxed & low-key",
      "Glamorous & dressed up",
      "Wild & unexpected",
      "Nostalgic — recreate your first date",
      "Mysterious & moody",
      "Cosy & intimate",
      "Celebratory & festive",
    ],
  },
  Activity: {
    emoji: "🎉",
    colour: "from-us-blush/20 to-us-coral/10",
    cards: [
      "Dance to your playlist",
      "Play a board game",
      "Watch a favourite film together",
      "Write love letters to each other",
      "Do a couples quiz",
      "Go for a midnight walk",
      "Make cocktails at home",
      "Draw portraits of each other",
      "Cook a new recipe together",
      "Give each other massages",
      "Play truth or dare",
      "Look through old photos together",
      "Plan your next holiday",
      "Read to each other",
      "Try a new sport or class",
    ],
  },
  Surprise: {
    emoji: "🎁",
    colour: "from-primary/15 to-accent/20",
    cards: [
      "One partner plans everything secretly",
      "Leave a love note somewhere hidden",
      "Order a mystery box delivered",
      "Buy each other a small gift under £10",
      "Recreate a favourite memory",
      "Dress code: the other picks your outfit",
      "Visit somewhere neither of you has been",
      "Do a random act of kindness together",
      "Cook a meal from a country you want to visit",
      "Write 10 reasons you love each other",
    ],
  },
};

const CATEGORIES = Object.keys(deck);

const DesignMyNight = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [phase, setPhase] = useState<"intro" | "drawing" | "result">("intro");

  useEffect(() => {
    if (profile?.partner_id) {
      notifyPartner({ partnerId: profile.partner_id, title: "🌙 Design My Night!", body: `${profile.username || "Your partner"} started Design My Night`, route: "/design-my-night" });
    }
  }, []);
  const [drawn, setDrawn] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [flipping, setFlipping] = useState(false);

  const buildHand = () => {
    const hand: Card[] = CATEGORIES.map((cat) => {
      const { emoji, colour, cards } = deck[cat];
      const value = cards[Math.floor(Math.random() * cards.length)];
      return { category: cat, emoji, value, colour };
    });
    return hand;
  };

  const start = () => {
    const hand = buildHand();
    setDrawn(hand);
    setCurrentIndex(0);
    setRevealed(new Array(hand.length).fill(false));
    setPhase("drawing");
  };

  const revealCard = () => {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => {
      setRevealed((prev) => {
        const next = [...prev];
        next[currentIndex] = true;
        return next;
      });
      setFlipping(false);
    }, 300);
  };

  const next = () => {
    if (currentIndex < drawn.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setPhase("result");
    }
  };

  const reshuffle = () => {
    setPhase("intro");
    setDrawn([]);
    setCurrentIndex(0);
    setRevealed([]);
  };

  const currentCard = drawn[currentIndex];
  const isRevealed = revealed[currentIndex];
  const allRevealed = drawn.every((_, i) => revealed[i]);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/us?tab=games")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-us-coral" /> Design My Night
          </h1>
          {phase === "drawing" && (
            <span className="ml-auto text-xs text-muted-foreground font-medium">
              {currentIndex + 1} / {drawn.length}
            </span>
          )}
        </div>
      </header>

      <div className="px-4 py-6">

        {/* Intro */}
        {phase === "intro" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-3">
              <span className="text-6xl block">🌙</span>
              <h2 className="font-display text-2xl font-bold text-foreground">Design My Night</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Draw a card for each category to design your perfect date night — then make it happen!
              </p>
            </div>

            {/* Category preview */}
            <div className="grid grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  className={`rounded-xl bg-gradient-to-br ${deck[cat].colour} border border-border/20 p-3 flex items-center gap-2`}
                >
                  <span className="text-xl">{deck[cat].emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{cat}</span>
                </div>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={start}
              className="w-full rounded-2xl bg-gradient-to-br from-us-coral to-us-blush py-4 text-white font-display text-lg font-bold shadow-lg flex items-center justify-center gap-2"
            >
              <Shuffle className="w-5 h-5" /> Deal My Night
            </motion.button>
          </motion.div>
        )}

        {/* Drawing phase */}
        {phase === "drawing" && currentCard && (
          <div className="space-y-5">
            {/* Progress dots */}
            <div className="flex justify-center gap-2">
              {drawn.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentIndex
                      ? "bg-us-coral scale-125"
                      : revealed[i]
                      ? "bg-us-sage"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>

            {/* Category label */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {currentCard.emoji} {currentCard.category}
              </span>
            </div>

            {/* Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex + (isRevealed ? "-rev" : "-face")}
                initial={{ opacity: 0, rotateY: -90, scale: 0.9 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, rotateY: 90, scale: 0.9 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                onClick={!isRevealed ? revealCard : undefined}
                className={`relative rounded-3xl overflow-hidden border border-border/20 min-h-[260px] flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none bg-gradient-to-br ${currentCard.colour}`}
              >
                {!isRevealed ? (
                  <motion.div className="space-y-4">
                    <span className="text-7xl block">{currentCard.emoji}</span>
                    <p className="text-sm font-semibold text-foreground/60">Tap to reveal your {currentCard.category}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3"
                  >
                    <span className="text-4xl block">{currentCard.emoji}</span>
                    <p className="text-[12px] font-bold uppercase tracking-widest text-foreground/50">{currentCard.category}</p>
                    <p className="font-display text-2xl font-bold text-foreground leading-snug">{currentCard.value}</p>
                  </motion.div>
                )}

                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
              </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3">
              {!isRevealed ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={revealCard}
                  className="flex-1 rounded-2xl bg-gradient-to-br from-us-coral to-us-blush py-4 text-white font-bold text-base shadow"
                >
                  ✨ Reveal Card
                </motion.button>
              ) : (
                <>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      // Re-draw this card
                      const { cards } = deck[currentCard.category];
                      const filtered = cards.filter((c) => c !== currentCard.value);
                      const pick = filtered[Math.floor(Math.random() * filtered.length)] || currentCard.value;
                      setDrawn((prev) => {
                        const next = [...prev];
                        next[currentIndex] = { ...next[currentIndex], value: pick };
                        return next;
                      });
                      setRevealed((prev) => {
                        const next = [...prev];
                        next[currentIndex] = false;
                        return next;
                      });
                    }}
                    className="flex-1 rounded-2xl bg-secondary border border-border/30 py-3.5 text-sm font-semibold text-foreground"
                  >
                    <Shuffle className="w-4 h-4 inline mr-1.5" /> Redraw
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={next}
                    className="flex-1 rounded-2xl bg-gradient-to-br from-us-coral to-us-blush py-3.5 text-white font-bold text-sm shadow"
                  >
                    {currentIndex < drawn.length - 1 ? "Next Card →" : "See My Night ✨"}
                  </motion.button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Result */}
        {phase === "result" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5"
          >
            <div className="text-center space-y-2">
              <Heart className="w-10 h-10 mx-auto text-us-coral fill-us-coral" />
              <h2 className="font-display text-2xl font-bold text-foreground">Your Perfect Night 🌙</h2>
              <p className="text-sm text-muted-foreground">Save this or screenshot it — now make it happen!</p>
            </div>

            {/* Summary cards */}
            <div className="space-y-3">
              {drawn.map((card, i) => (
                <motion.div
                  key={card.category}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={`rounded-2xl bg-gradient-to-br ${card.colour} border border-border/20 px-4 py-3.5 flex items-center gap-3`}
                >
                  <span className="text-2xl shrink-0">{card.emoji}</span>
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wider text-foreground/50">{card.category}</p>
                    <p className="text-sm font-bold text-foreground leading-snug">{card.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={reshuffle}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-secondary border border-border/30 py-3.5 text-sm font-semibold text-foreground"
              >
                <RotateCcw className="w-4 h-4" /> New Night
              </button>
              <button
                onClick={() => navigate("/us?tab=games")}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-us-coral to-us-blush py-3.5 text-white font-bold text-sm shadow"
              >
                <Heart className="w-4 h-4" /> Done!
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DesignMyNight;
