import {
  ListChecks, Sparkles,
  Camera, FolderOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StoryCircle {
  id: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  path: string;
}

const StoriesBar = () => {
  const navigate = useNavigate();

  const stories: StoryCircle[] = [
    { id: "lists", label: "Lists", icon: <ListChecks className="w-5 h-5" />, gradient: "from-us-navy to-blue-600", path: "/us?tab=lists" },
    
    { id: "games", label: "Games", icon: <span className="text-xl">💋</span>, gradient: "from-us-sage to-emerald-500", path: "/us?tab=games" },
    { id: "photos", label: "Photos", icon: <Camera className="w-5 h-5" />, gradient: "from-us-blush to-pink-400", path: "/us?tab=photos" },
    { id: "admin", label: "Admin", icon: <FolderOpen className="w-5 h-5" />, gradient: "from-us-navy to-blue-600", path: "/us?tab=admin" },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto px-4 py-3 scrollbar-hide">
      {stories.map((story) => (
        <button
          key={story.id}
          onClick={() => navigate(story.path)}
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
