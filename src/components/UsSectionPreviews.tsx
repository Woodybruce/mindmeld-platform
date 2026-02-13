import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, MessageCircle, Gamepad2, Camera,
  Heart, FolderOpen, ChevronRight
} from "lucide-react";

interface SectionPreviewProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  tab: string;
  children?: React.ReactNode;
}

const SectionPreview = ({ title, subtitle, icon, gradient, tab, children }: SectionPreviewProps) => {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => navigate(`/us?tab=${tab}`)}
        className="w-full flex items-center gap-3 px-4 pt-4 pb-2 text-left"
      >
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-primary-foreground shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
      {children && <div className="px-4 pb-3">{children}</div>}
    </motion.div>
  );
};

/* ── Mini Quizzes Preview ── */
export const QuizzesPreview = () => (
  <SectionPreview
    title="Quizzes"
    subtitle="How well do you know each other?"
    icon={<Sparkles className="w-4 h-4" />}
    gradient="from-us-gold to-amber-500"
    tab="quizzes"
  >
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
      {[
        { emoji: "💭", name: "Love Styles" },
        { emoji: "🔥", name: "Intimacy Check" },
        { emoji: "🧭", name: "Values Compass" },
      ].map((q) => (
        <div key={q.name} className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 py-1.5 shrink-0">
          <span className="text-sm">{q.emoji}</span>
          <span className="text-[11px] font-medium text-foreground whitespace-nowrap">{q.name}</span>
        </div>
      ))}
    </div>
  </SectionPreview>
);

/* ── Mini Prompts Preview ── */
export const PromptsPreview = () => (
  <SectionPreview
    title="Daily Prompt"
    subtitle="Spark a meaningful conversation"
    icon={<MessageCircle className="w-4 h-4" />}
    gradient="from-us-coral to-us-terracotta"
    tab="prompts"
  >
    <p className="text-sm text-foreground italic leading-snug">
      "What's one thing you've never told me that you wish I knew?"
    </p>
  </SectionPreview>
);

/* ── Mini Games Preview ── */
export const GamesPreview = () => (
  <SectionPreview
    title="Games"
    subtitle="Fun activities to play together"
    icon={<Gamepad2 className="w-4 h-4" />}
    gradient="from-us-sage to-emerald-500"
    tab="games"
  >
    <div className="flex gap-2">
      {["💋 Kiss Chase", "🎯 Truth or Dare", "🤔 Would You Rather"].map((g) => (
        <div key={g} className="bg-secondary rounded-lg px-2.5 py-1.5 shrink-0">
          <span className="text-[11px] font-medium text-foreground">{g}</span>
        </div>
      ))}
    </div>
  </SectionPreview>
);

/* ── Mini Photos Preview ── */
export const PhotosPreview = () => (
  <SectionPreview
    title="Our Photos"
    subtitle="Shared memories together"
    icon={<Camera className="w-4 h-4" />}
    gradient="from-us-blush to-pink-400"
    tab="photos"
  />
);

/* ── Mini Gratitude Preview ── */
export const GratitudePreview = () => (
  <SectionPreview
    title="Gratitude Journal"
    subtitle="What are you grateful for today?"
    icon={<Heart className="w-4 h-4" />}
    gradient="from-us-coral to-us-blush"
    tab="gratitude"
  />
);

/* ── Mini Files Preview ── */
export const FilesPreview = () => (
  <SectionPreview
    title="Shared Files"
    subtitle="Drive folders, docs & media"
    icon={<FolderOpen className="w-4 h-4" />}
    gradient="from-us-navy to-blue-600"
    tab="files"
  />
);
