import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export type FeedCardType = "prompt" | "reminder" | "update" | "blog" | "quiz" | "milestone";
export type FeedCardSize = "full" | "half" | "banner";

export interface FeedItem {
  id: string;
  type: FeedCardType;
  size?: FeedCardSize;
  title: string;
  subtitle?: string;
  body: string;
  image?: string;
  tag: string;
  tagColor: string;
  timeAgo: string;
  liked?: boolean;
  saved?: boolean;
  link?: string;
}

const typeStyles: Record<FeedCardType, { bg: string; border: string }> = {
  prompt: { bg: "bg-gradient-to-br from-us-blush/30 to-us-coral/10", border: "border-us-coral/20" },
  reminder: { bg: "bg-gradient-to-br from-blue-50 to-us-cream", border: "border-us-navy/10" },
  update: { bg: "bg-card", border: "border-border" },
  blog: { bg: "bg-card", border: "border-border" },
  quiz: { bg: "bg-gradient-to-br from-amber-50 to-us-cream", border: "border-us-gold/20" },
  milestone: { bg: "bg-gradient-to-br from-us-sage/15 to-emerald-50", border: "border-us-sage/20" },
};

const ActionBar = ({ item, compact = false }: { item: FeedItem; compact?: boolean }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <button className="text-muted-foreground hover:text-us-coral transition-colors">
        <Heart className={`${compact ? "w-4 h-4" : "w-[18px] h-[18px]"} ${item.liked ? "fill-us-coral text-us-coral" : ""}`} />
      </button>
      <button className="text-muted-foreground hover:text-foreground transition-colors">
        <MessageCircle className={compact ? "w-4 h-4" : "w-[18px] h-[18px]"} />
      </button>
      <button
        className="text-muted-foreground hover:text-foreground transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          const url = item.link ? `${window.location.origin}${item.link}` : window.location.href;
          if (navigator.share) {
            navigator.share({ title: item.title, text: item.body, url }).catch(() => {});
          } else {
            navigator.clipboard.writeText(url);
          }
        }}
      >
        <Share2 className={compact ? "w-4 h-4" : "w-[18px] h-[18px]"} />
      </button>
    </div>
    <button className="text-muted-foreground hover:text-foreground transition-colors">
      <Bookmark className={`${compact ? "w-4 h-4" : "w-[18px] h-[18px]"} ${item.saved ? "fill-foreground" : ""}`} />
    </button>
  </div>
);

interface FeedCardProps {
  item: FeedItem;
  index: number;
}

const FeedCard = ({ item, index }: FeedCardProps) => {
  const style = typeStyles[item.type];
  const navigate = useNavigate();
  const size = item.size || "full";

  const handleClick = () => {
    if (item.link) navigate(item.link);
  };

  const aspectClass =
    size === "banner" ? "aspect-[2.2/1]" :
    size === "half" ? "aspect-square" :
    "aspect-[4/5]";

  // Pictorial card with image
  if (item.image) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
        className={`rounded-2xl overflow-hidden ${item.link ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
        onClick={handleClick}
      >
        <div className={`relative w-full ${aspectClass} overflow-hidden`}>
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className={`absolute inset-0 ${size === "banner" ? "bg-gradient-to-r from-black/60 via-black/30 to-transparent" : "bg-gradient-to-t from-black/70 via-black/15 to-transparent"}`} />

          {/* Tag pill */}
          <div className="absolute top-2.5 left-2.5">
            <span className="bg-background/80 backdrop-blur-md text-[9px] font-bold uppercase tracking-wider text-foreground px-2 py-0.5 rounded-full">
              {item.tag}
            </span>
          </div>

          {/* Text overlay */}
          <div className={`absolute bottom-0 left-0 right-0 p-3 text-primary-foreground ${size === "half" ? "p-2.5" : ""}`}>
            <h3 className={`font-display font-bold leading-tight drop-shadow-lg ${size === "half" ? "text-sm" : size === "banner" ? "text-base" : "text-xl"} ${size === "half" ? "line-clamp-2" : ""}`}>
              {item.title}
            </h3>
            {size === "full" && item.subtitle && (
              <p className="text-xs opacity-80 mt-0.5 drop-shadow">{item.subtitle}</p>
            )}
            {size === "full" && (
              <p className="text-[11px] opacity-65 leading-relaxed line-clamp-2 mt-1 drop-shadow">
                {item.body}
              </p>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="bg-card px-3 py-2 border border-t-0 border-border rounded-b-2xl">
          <ActionBar item={item} compact={size === "half"} />
        </div>
      </motion.div>
    );
  }

  // Text-only card
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
      className={`${style.bg} border ${style.border} rounded-2xl overflow-hidden ${item.link ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
      onClick={handleClick}
    >
      <div className={size === "half" ? "p-3" : "p-4"}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${item.tagColor}`}>
            {item.tag}
          </span>
          <span className="text-[10px] text-muted-foreground">{item.timeAgo}</span>
        </div>
        <h3 className={`font-display font-semibold text-foreground leading-snug mb-1 ${size === "half" ? "text-sm line-clamp-2" : "text-lg"}`}>
          {item.title}
        </h3>
        {size !== "half" && item.subtitle && (
          <p className="text-xs text-muted-foreground mb-1.5">{item.subtitle}</p>
        )}
        {size !== "half" && (
          <p className="text-sm text-secondary-foreground leading-relaxed">{item.body}</p>
        )}
        <div className={`${size === "half" ? "mt-2 pt-2" : "mt-3 pt-3"} border-t border-border/50`}>
          <ActionBar item={item} compact={size === "half"} />
        </div>
      </div>
    </motion.div>
  );
};

export default FeedCard;
