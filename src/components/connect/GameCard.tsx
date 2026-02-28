import { forwardRef } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface GameCardProps {
  title: string;
  description: string;
  emoji: string;
  players: string;
  gradient: string;
  onClick?: () => void;
  delay?: number;
}

const GameCard = forwardRef<HTMLButtonElement, GameCardProps>(({ title, description, emoji, players, gradient, onClick, delay = 0 }, ref) => (
  <motion.button
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    onClick={onClick}
    className={`w-full rounded-2xl p-4 text-left ${gradient} border border-border/30 hover:scale-[1.02] transition-transform`}
  >
    <div className="flex items-center gap-3">
      <span className="text-3xl">{emoji}</span>
      <div className="flex-1">
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        <span className="text-[14px] text-muted-foreground mt-1 inline-block">{players}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </div>
  </motion.button>
));

GameCard.displayName = "GameCard";

export default GameCard;
