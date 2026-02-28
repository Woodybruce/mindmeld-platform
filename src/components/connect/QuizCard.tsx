import { motion } from "framer-motion";
import { Clock, Users, ChevronRight } from "lucide-react";

interface QuizCardProps {
  title: string;
  description: string;
  emoji: string;
  duration: string;
  questions: number;
  gradient: string;
  delay?: number;
  onClick?: () => void;
}

const QuizCard = ({ title, description, emoji, duration, questions, gradient, delay = 0, onClick }: QuizCardProps) => (
  <motion.button
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className={`w-full rounded-2xl p-4 text-left ${gradient} border border-border/30 hover:scale-[1.02] transition-transform`}
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <span className="text-2xl">{emoji}</span>
        <h3 className="font-display text-base font-semibold text-foreground mt-2">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
        <div className="flex items-center gap-3 mt-3">
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <Clock className="w-3 h-3" /> {duration}
          </span>
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <Users className="w-3 h-3" /> {questions} Qs
          </span>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
    </div>
  </motion.button>
);

export default QuizCard;
