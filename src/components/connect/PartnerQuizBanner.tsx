import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";

interface PartnerQuizBannerProps {
  quizTitle: string;
  quizEmoji: string;
  onDismiss: () => void;
}

const PartnerQuizBanner = ({ quizTitle, quizEmoji, onDismiss }: PartnerQuizBannerProps) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0, y: -12, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      className="mx-4 mt-3"
    >
      <div className="rounded-xl bg-gradient-to-r from-us-coral/15 to-us-blush/25 border border-us-coral/20 p-3 flex items-center gap-3">
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-xl"
        >
          {quizEmoji}
        </motion.span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-2 h-2 rounded-full bg-us-coral"
            />
            <p className="text-xs font-semibold text-foreground">Partner is playing</p>
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{quizTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-us-coral font-medium">
            <Sparkles className="w-3 h-3" /> Live
          </span>
          <button onClick={onDismiss} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  </AnimatePresence>
);

export default PartnerQuizBanner;
