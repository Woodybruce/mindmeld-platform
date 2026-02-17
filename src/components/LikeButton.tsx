import { Heart } from "lucide-react";

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
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        className={`${padding} rounded-lg transition-all active:scale-90 ${
          liked
            ? "text-destructive"
            : "text-muted-foreground hover:text-destructive/60"
        }`}
        title={mutual ? "You both like this!" : liked ? "Unlike" : "Like"}
      >
        <Heart className={`${iconSize} ${liked ? "fill-current" : ""}`} />
      </button>
      {partnerLiked && (
        <span className="text-[9px] text-muted-foreground whitespace-nowrap">
          {mutual ? "💕 Both" : "❤️ Partner"}
        </span>
      )}
    </div>
  );
};

export default LikeButton;
