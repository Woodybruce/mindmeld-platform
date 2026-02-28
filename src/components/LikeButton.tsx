import { Heart } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface LikeButtonProps {
  liked: boolean;
  partnerLiked: boolean;
  mutual: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
}

const LikeButton = ({ liked, partnerLiked, mutual, onToggle, size = "sm" }: LikeButtonProps) => {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const padding = size === "sm" ? "p-1.5" : "p-2";

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); haptics.light(); onToggle(); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); haptics.light(); onToggle(); } }}
        className={`${padding} rounded-lg transition-all active:scale-90 cursor-pointer ${
          liked
            ? "text-destructive"
            : "text-muted-foreground hover:text-destructive/60"
        }`}
        title={mutual ? "You both like this!" : liked ? "Unlike" : "Like"}
        data-testid="button-like"
      >
        <Heart className={`${iconSize} ${liked ? "fill-current" : ""}`} />
      </div>
      {partnerLiked && (
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {mutual ? "💕 Both" : "❤️ Partner"}
        </span>
      )}
    </div>
  );
};

export default LikeButton;
