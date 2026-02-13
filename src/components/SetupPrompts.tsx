import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Link2, Camera, Heart, X, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SetupItem {
  id: string;
  icon: React.ReactNode;
  emoji: string;
  title: string;
  description: string;
  action: string; // route or tab
  checkKey: string; // localStorage key to check completion
}

const setupItems: SetupItem[] = [
  {
    id: "lists",
    icon: <Sparkles className="w-4 h-4" />,
    emoji: "📝",
    title: "Create your first list",
    description: "Daily to-dos, goals, or shared action items",
    action: "/us?tab=lists",
    checkKey: "userLists",
  },
  {
    id: "folders",
    icon: <FolderOpen className="w-4 h-4" />,
    emoji: "📁",
    title: "Link a shared folder",
    description: "OneDrive, Google Drive, Dropbox or Notion",
    action: "/us?tab=files",
    checkKey: "shared-folder-embeds",
  },
  {
    id: "links",
    icon: <Link2 className="w-4 h-4" />,
    emoji: "🔗",
    title: "Share a link",
    description: "Instagram, YouTube, recipes, travel ideas",
    action: "/us?tab=links",
    checkKey: "shared-links-setup",
  },
  {
    id: "quiz",
    icon: <Heart className="w-4 h-4" />,
    emoji: "💕",
    title: "Take your first quiz",
    description: "Discover how well you know each other",
    action: "/us?tab=quizzes",
    checkKey: "completedQuizzes",
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
              <button
                onClick={(e) => { e.stopPropagation(); dismissItem(item.id); }}
                className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SetupPrompts;
