import { Heart, Compass, ListChecks, MessageCircle, BookOpen, Sparkles, TrendingUp } from "lucide-react";

interface StoryCircle {
  id: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  isActive?: boolean;
}

const stories: StoryCircle[] = [
  { id: "us", label: "Us", icon: <Heart className="w-5 h-5" />, gradient: "from-us-coral to-us-terracotta", isActive: true },
  { id: "grow", label: "Grow", icon: <TrendingUp className="w-5 h-5" />, gradient: "from-us-sage to-emerald-500" },
  { id: "lists", label: "Lists", icon: <ListChecks className="w-5 h-5" />, gradient: "from-us-navy to-blue-600" },
  { id: "quizzes", label: "Quizzes", icon: <Sparkles className="w-5 h-5" />, gradient: "from-us-gold to-amber-500" },
  { id: "chat", label: "Chat", icon: <MessageCircle className="w-5 h-5" />, gradient: "from-us-blush to-pink-400" },
  { id: "learn", label: "Learn", icon: <BookOpen className="w-5 h-5" />, gradient: "from-violet-400 to-purple-500" },
  { id: "explore", label: "Explore", icon: <Compass className="w-5 h-5" />, gradient: "from-cyan-400 to-teal-500" },
];

const StoriesBar = () => {
  return (
    <div className="flex gap-4 overflow-x-auto px-4 py-3 scrollbar-hide">
      {stories.map((story) => (
        <button
          key={story.id}
          className="flex flex-col items-center gap-1.5 min-w-[60px] group"
        >
          <div className={`relative w-[62px] h-[62px] rounded-full bg-gradient-to-br ${story.gradient} p-[2.5px] transition-transform duration-200 group-active:scale-95`}>
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
              <div className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br ${story.gradient} flex items-center justify-center text-primary-foreground`}>
                {story.icon}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {story.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default StoriesBar;
