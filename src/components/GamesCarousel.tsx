import { useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const games = [
  { emoji: "💋", name: "Kiss Chase", desc: "GPS chase game", path: "/kiss-chase", gradient: "from-us-coral/20 to-us-blush/30" },
  { emoji: "🎯", name: "Truth or Dare", desc: "Couples edition", path: "/truth-or-dare", gradient: "from-us-sage/20 to-emerald-100" },
  { emoji: "🤔", name: "Would You Rather", desc: "Hilarious debates", path: "/would-you-rather", gradient: "from-us-gold/20 to-amber-100" },
  { emoji: "📸", name: "Photo Challenge", desc: "Fun photo tasks", path: "/photo-challenge", gradient: "from-us-blush/20 to-pink-100" },
];

const GamesCarousel = () => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => navigate("/us?tab=games")}
        className="w-full flex items-center gap-3 px-4 pt-3 pb-2 text-left"
      >
        <span className="text-xl">🎮</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground">Games</h3>
          <p className="text-[10px] text-muted-foreground">Play together</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      <div ref={ref} className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {games.map((g) => (
          <button
            key={g.name}
            onClick={() => navigate(g.path)}
            className={`shrink-0 bg-gradient-to-br ${g.gradient} rounded-xl px-3 py-2.5 text-left hover:scale-[1.02] active:scale-[0.97] transition-transform`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{g.emoji}</span>
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">{g.name}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{g.desc}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default GamesCarousel;
