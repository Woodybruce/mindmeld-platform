import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PromptCardProps {
  category: string;
  prompt: string;
  categoryColor: string;
  delay?: number;
}

const PromptCard = ({ category, prompt, categoryColor, delay = 0 }: PromptCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className="rounded-2xl border border-border bg-card p-5"
  >
    <span className={`text-[10px] font-semibold uppercase tracking-widest ${categoryColor}`}>
      {category}
    </span>
    <p className="font-display text-lg font-medium text-foreground mt-2 leading-snug">
      "{prompt}"
    </p>
  </motion.div>
);

export default PromptCard;
