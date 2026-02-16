import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Sparkles, Heart, Link, Calendar, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SetupItem {
  id: string;
  emoji: string;
  title: string;
  description: string;
  action: string;
  checkKey: string;
}

const setupItems: SetupItem[] = [
  {
    id: "lists",
    emoji: "📝",
    title: "Create your first list",
    description: "Daily to-dos, goals, or shared action items",
    action: "/us?tab=lists",
    checkKey: "userLists",
  },
  {
    id: "quiz",
    emoji: "💕",
    title: "Take your first quiz",
    description: "Discover how well you know each other",
    action: "/us?tab=quizzes",
    checkKey: "completedQuizzes",
  },
  {
    id: "link",
    emoji: "🔗",
    title: "Share your first link",
    description: "Save Instagram, YouTube or articles together",
    action: "/chat",
    checkKey: "us-shared-links-started",
  },
  {
    id: "calendar",
    emoji: "📅",
    title: "Add a calendar event",
    description: "Plan dates, trips, and milestones together",
    action: "/us?tab=admin",
    checkKey: "us-calendar-started",
  },
  {
    id: "avatar",
    emoji: "📸",
    title: "Choose your partner's avatar",
    description: "Pick the photo they'll see in chat",
    action: "/profile",
    checkKey: "us-avatar-set",
  },
  {
    id: "chat",
    emoji: "💬",
    title: "Send your first message",
    description: "Start chatting with your partner",
    action: "/chat",
    checkKey: "us-chat-started",
  },
];

const DISMISSED_KEY = "setup-prompts-dismissed";

const SetupPrompts = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored === "all") return;
    const dismissedSet = stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    setDismissed(dismissedSet);
    setVisible(true);
  }, []);

  const remaining = setupItems.filter((item) => {
    if (dismissed.has(item.id)) return false;
    // Check if already completed
    const stored = localStorage.getItem(item.checkKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      } catch {}
    }
    return true;
  });

  const dismissItem = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
  };

  const dismissAll = () => {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify("all"));
    setVisible(false);
  };

  if (!visible || remaining.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">Get Started</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Set up your shared space · {remaining.length} left
          </p>
        </div>
        <button
          onClick={dismissAll}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Dismiss
        </button>
      </div>

      <div className="px-3 pb-3 space-y-1.5">
        <AnimatePresence>
          {remaining.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8, height: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(item.action)}
              className="w-full flex items-center gap-3 rounded-xl p-3 text-left hover:bg-muted/50 transition-colors group"
            >
              <span className="text-xl">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">{item.description}</p>
              </div>
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); dismissItem(item.id); }}
                className="p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SetupPrompts;
