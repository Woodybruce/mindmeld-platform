import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Heart } from "lucide-react";

const prompts = [
  { emoji: "💭", text: "What made you smile about your partner today?" },
  { emoji: "🌟", text: "Name one thing you admire about your partner." },
  { emoji: "💌", text: "Send your partner a surprise compliment right now." },
  { emoji: "🎯", text: "What's one goal you'd love to achieve together this year?" },
  { emoji: "🏡", text: "Describe your dream weekend together in 3 words." },
  { emoji: "🔥", text: "What's something new you'd like to try together?" },
  { emoji: "🤗", text: "When did you last feel truly grateful for your partner?" },
  { emoji: "💪", text: "What challenge have you overcome together recently?" },
  { emoji: "🎵", text: "What song reminds you of your relationship?" },
  { emoji: "📸", text: "Share your favourite photo of you two together." },
  { emoji: "🌅", text: "What's the most peaceful moment you've shared?" },
  { emoji: "😂", text: "What's your funniest memory together?" },
  { emoji: "🗺️", text: "Where would you love to travel together next?" },
  { emoji: "🍳", text: "What meal could you cook together tonight?" },
  { emoji: "💬", text: "Is there something you've been meaning to say to your partner?" },
  { emoji: "🙏", text: "What's one thing your partner does that makes life easier?" },
  { emoji: "🎁", text: "Plan a small surprise for your partner this week." },
  { emoji: "🌻", text: "What quality of your partner's do you wish you had more of?" },
  { emoji: "📝", text: "Write a 3-word love note and leave it somewhere unexpected." },
  { emoji: "⭐", text: "Rate your week together 1–10. What would make it a 10?" },
  { emoji: "🫂", text: "When was the last time you had a proper long hug?" },
  { emoji: "🎭", text: "If your relationship was a movie, what genre would it be?" },
  { emoji: "🧩", text: "What's one habit you could build together?" },
  { emoji: "💡", text: "Share one thing you learned from your partner recently." },
  { emoji: "🏆", text: "What's the best decision you've made as a couple?" },
  { emoji: "🌈", text: "What are you most looking forward to together?" },
  { emoji: "☕", text: "How could you make tomorrow morning special for your partner?" },
  { emoji: "🎪", text: "What's something spontaneous you could do together today?" },
  { emoji: "💎", text: "What's one non-negotiable in your relationship?" },
  { emoji: "🌙", text: "What's your ideal end-of-day routine together?" },
];

const getDailyPrompt = () => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return prompts[dayOfYear % prompts.length];
};

const DailyPromptCard = () => {
  const [prompt, setPrompt] = useState(getDailyPrompt);
  const [spinning, setSpinning] = useState(false);

  const shuffle = () => {
    setSpinning(true);
    const randomIdx = Math.floor(Math.random() * prompts.length);
    setPrompt(prompts[randomIdx]);
    setTimeout(() => setSpinning(false), 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/10 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily Prompt</span>
        </div>
        <button
          onClick={shuffle}
          className="p-1.5 rounded-full hover:bg-secondary transition-colors"
          aria-label="Shuffle prompt"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${spinning ? "animate-spin" : ""}`} />
        </button>
      </div>

      <motion.div
        key={prompt.text}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3"
      >
        <span className="text-2xl mt-0.5">{prompt.emoji}</span>
        <p className="text-sm font-medium text-foreground leading-relaxed flex-1">
          {prompt.text}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default DailyPromptCard;
