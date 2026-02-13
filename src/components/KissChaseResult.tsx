import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Trophy, Heart, PartyPopper, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

const rewardLabels: Record<string, { label: string; icon: string }> = {
  task: { label: "Task Favour", icon: "🧹" },
  intimacy: { label: "Intimacy Reward", icon: "💋" },
  giftcard: { label: "Gift Card", icon: "🎁" },
  dinner: { label: "Dinner Date", icon: "🍽️" },
};

interface KissChaseResultProps {
  caught: boolean;
  reward: string;
}

const KissChaseResult = ({ caught, reward }: KissChaseResultProps) => {
  const navigate = useNavigate();
  const rewardInfo = rewardLabels[reward] || { label: "Mystery Reward", icon: "🎉" };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
          caught
            ? "bg-gradient-to-br from-us-coral to-us-terracotta"
            : "bg-gradient-to-br from-muted to-secondary"
        }`}
      >
        <span className="text-5xl">{caught ? "💋" : "⏰"}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h1 className="font-display text-3xl font-bold text-foreground">
          {caught ? "Caught!" : "Time's Up!"}
        </h1>
        <p className="text-muted-foreground">
          {caught
            ? "You found your partner! Time to claim your reward..."
            : "Your partner got away this time. Better luck next chase!"}
        </p>
      </motion.div>

      {caught && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-gradient-to-br from-us-coral/10 to-us-terracotta/10 border border-us-coral/20 rounded-2xl p-6 w-full"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-us-gold" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Reward</span>
          </div>
          <div className="text-4xl mb-2">{rewardInfo.icon}</div>
          <p className="font-display text-xl font-bold text-foreground">{rewardInfo.label}</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-10 w-full space-y-3"
      >
        <Button
          onClick={() => navigate("/kiss-chase")}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-us-coral to-us-terracotta text-primary-foreground"
        >
          Play Again
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="w-full h-12 rounded-2xl"
        >
          Back to Home
        </Button>
      </motion.div>
    </div>
  );
};

export default KissChaseResult;
