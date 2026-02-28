import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Flame, CalendarPlus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedLists } from "@/hooks/useSharedLists";
import { toast } from "@/hooks/use-toast";

const prompts = [
  // Romantic & emotional
  { emoji: "💭", text: "What made you smile about your partner today?" },
  { emoji: "🌟", text: "Name one thing you admire about your partner." },
  { emoji: "💌", text: "Send your partner a surprise compliment right now." },
  { emoji: "🎯", text: "What's one goal you'd love to achieve together this year?" },
  { emoji: "🏡", text: "Describe your dream weekend together in 3 words." },
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
  // Intimate & spicy
  { emoji: "🔥", text: "What's the most attractive thing your partner did this week?" },
  { emoji: "💋", text: "Describe your perfect kiss in three words." },
  { emoji: "🫦", text: "What's one thing your partner does that drives you wild?" },
  { emoji: "✨", text: "What's a fantasy date night you've never told your partner about?" },
  { emoji: "🛁", text: "Would you rather: a candlelit bath together or a midnight picnic?" },
  { emoji: "👀", text: "What outfit of your partner's makes you weak at the knees?" },
  { emoji: "🌶️", text: "Rate your intimacy this week 1–10. What would raise the score?" },
  { emoji: "💫", text: "What's one thing you'd love to hear whispered to you tonight?" },
  { emoji: "🍷", text: "If you had one uninterrupted evening together, how would you spend it?" },
  { emoji: "🫣", text: "What's something you've always wanted to try but never asked for?" },
  { emoji: "💥", text: "When was the last time your partner gave you butterflies?" },
  { emoji: "🌹", text: "What's the most seductive song on your playlist right now?" },
  { emoji: "😏", text: "Send your partner a flirty text right now. Go on." },
  { emoji: "🧲", text: "What's one physical touch from your partner that melts you?" },
  { emoji: "🔮", text: "Predict: who'll make the first move tonight?" },
  { emoji: "💄", text: "What's a look or vibe from your partner that instantly turns you on?" },
  { emoji: "🍑", text: "What body part of your partner's deserves more appreciation?" },
  { emoji: "🎶", text: "Pick a song that matches the energy you want tonight." },
  { emoji: "🥂", text: "What's the most spontaneous intimate moment you've shared?" },
  { emoji: "🫠", text: "Describe your partner's kiss in one word. Now tell them." },
  { emoji: "🔥", text: "What's one thing that would make bedtime more exciting tonight?" },
  { emoji: "💘", text: "When do you feel the strongest physical connection with your partner?" },
  { emoji: "🕯️", text: "Set the mood tonight — what three things do you need?" },
  { emoji: "😈", text: "Truth or dare: tell your partner your spiciest thought about them today." },
  { emoji: "🫶", text: "What's the best compliment your partner ever gave you about your body?" },
  { emoji: "🧊", text: "Hot take: morning intimacy or late-night intimacy?" },
  { emoji: "💃", text: "If you could slow dance to one song right now, which would it be?" },
  { emoji: "👅", text: "What's a new way you'd like to be kissed?" },
  { emoji: "🪩", text: "Plan a 'no phones, just us' evening. What does it look like?" },
  { emoji: "❤️‍🔥", text: "What's one word that describes how your partner makes you feel in private?" },
];

const getDailyPrompt = () => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return prompts[dayOfYear % prompts.length];
};

const DailyPromptCard = () => {
  const { user } = useAuth();
  const { lists } = useSharedLists();
  const [prompt, setPrompt] = useState(getDailyPrompt);
  const [spinning, setSpinning] = useState(false);
  const [bucketChallenge, setBucketChallenge] = useState<string | null>(null);
  const [addedToday, setAddedToday] = useState(false);

  // ~33% of days show a random Sex To Do item as a bonus challenge
  useEffect(() => {
    const sexTodoList = lists.find(
      (l) => l.template === "sex-todo" || l.name?.toLowerCase().includes("sex to do")
    );
    if (!sexTodoList) return;

    const undone = sexTodoList.items.filter((i) => !i.isHeading && !i.done);
    if (undone.length === 0) return;

    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    if (dayOfYear % 3 === 0) {
      const pick = undone[dayOfYear % undone.length];
      setBucketChallenge(pick.text);
    }
  }, [lists]);

  const addChallengeToToday = async () => {
    if (!user || !bucketChallenge) return;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("weekly_tasks").insert({
      user_id: user.id,
      text: `🔥 ${bucketChallenge}`,
      scheduled_date: today,
      sort_order: 999,
      source: "sex-bucket",
    } as any);
    if (error) {
      toast({ title: "Failed to add", variant: "destructive" });
    } else {
      setAddedToday(true);
      toast({ title: "🔥 Challenge added to today!", duration: 2000 });
    }
  };

  const shuffle = () => {
    setSpinning(true);
    const randomIdx = Math.floor(Math.random() * prompts.length);
    setPrompt(prompts[randomIdx]);
    setBucketChallenge(null);
    setTimeout(() => setSpinning(false), 400);
  };

  return (
    <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/10 p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Daily Prompt</span>
          </div>
          <button
            onClick={shuffle}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Shuffle prompt"
          >
            <RefreshCw className={`w-4.5 h-4.5 text-muted-foreground transition-transform ${spinning ? "animate-spin" : ""}`} />
          </button>
        </div>

        <motion.div
          key={prompt.text}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3.5"
        >
          <span className="text-3xl mt-0.5">{prompt.emoji}</span>
          <p className="text-base font-semibold text-foreground leading-relaxed flex-1">
            {prompt.text}
          </p>
        </motion.div>
      </motion.div>

      {/* Spicy bucket challenge prompt */}
      {bucketChallenge && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/5 to-primary/5 p-4"
        >
          <div className="flex items-start gap-3">
            <Flame className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-bold uppercase tracking-wider text-destructive/70 mb-1">Today's Bucket Challenge</p>
              <p className="text-sm font-semibold text-foreground">{bucketChallenge}</p>
            </div>
            <button
              onClick={addChallengeToToday}
              disabled={addedToday}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                addedToday
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/20"
              }`}
            >
              {addedToday ? (
                <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Added</span>
              ) : (
                <span className="flex items-center gap-1"><CalendarPlus className="w-3 h-3" /> Add to today</span>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DailyPromptCard;
