import { useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const games = [
  { emoji: "💋", name: "Kiss Chase", desc: "GPS chase game", link: "/kiss-chase" },
  { emoji: "🎯", name: "Truth or Dare", desc: "Couples edition", link: "/truth-or-dare" },
  { emoji: "🤔", name: "Would You Rather", desc: "Hilarious debates", link: "/would-you-rather" },
  { emoji: "📸", name: "Photo Challenge", desc: "Fun photo tasks", link: "/photo-challenge" },
];

const GamesCarousel = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -160 : 160, behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">💋</span>
          <h3 className="font-display text-base font-semibold text-foreground">Games</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => scroll("left")} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => scroll("right")} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-3 pt-1">
        {games.map((g, i) => (
          <button
            key={g.name}
            onClick={() => navigate(g.link)}
            className="shrink-0 w-[130px] bg-gradient-to-br from-secondary/80 to-secondary/40 border border-border/30 rounded-xl p-3 text-left hover:scale-[1.03] active:scale-[0.97] transition-transform"
          >
            <span className="text-2xl block mb-1.5">{g.emoji}</span>
            <h4 className="text-xs font-semibold text-foreground">{g.name}</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">{g.desc}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default GamesCarousel;
