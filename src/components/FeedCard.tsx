import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export type FeedCardType = "prompt" | "reminder" | "update" | "blog" | "quiz" | "milestone";

export interface FeedItem {
  id: string;
  type: FeedCardType;
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

interface FeedCardProps {
  item: FeedItem;
  index: number;
}

const ActionBar = ({ item }: { item: FeedItem }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <button className="flex items-center gap-1.5 text-muted-foreground hover:text-us-coral transition-colors">
        <Heart className={`w-[18px] h-[18px] ${item.liked ? "fill-us-coral text-us-coral" : ""}`} />
      </button>
      <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
        <MessageCircle className="w-[18px] h-[18px]" />
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
        <Share2 className="w-[18px] h-[18px]" />
      </button>
    </div>
    <button className="text-muted-foreground hover:text-foreground transition-colors">
      <Bookmark className={`w-[18px] h-[18px] ${item.saved ? "fill-foreground" : ""}`} />
    </button>
  </div>
);

const FeedCard = ({ item, index }: FeedCardProps) => {
  const style = typeStyles[item.type];
  const navigate = useNavigate();

  const handleClick = () => {
    if (item.link) navigate(item.link);
  };

  // Pictorial card — image with overlay text
  if (item.image) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
        className={`rounded-2xl overflow-hidden ${item.link ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
        onClick={handleClick}
      >
        {/* Image with gradient overlay */}
        <div className="relative w-full aspect-[4/5] overflow-hidden">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Tag badge top-left */}
          <div className="absolute top-3 left-3">
            <span className="bg-background/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-foreground px-2.5 py-1 rounded-full">
              {item.tag}
            </span>
          </div>

          {/* Time top-right */}
          <div className="absolute top-3 right-3">
            <span className="bg-background/80 backdrop-blur-md text-[10px] font-medium text-muted-foreground px-2.5 py-1 rounded-full">
              {item.timeAgo}
            </span>
          </div>

          {/* Text overlay bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-primary-foreground">
            <h3 className="font-display text-xl font-bold leading-tight mb-1 drop-shadow-lg">
              {item.title}
            </h3>
            {item.subtitle && (
              <p className="text-sm opacity-80 mb-1 drop-shadow">{item.subtitle}</p>
            )}
            <p className="text-xs opacity-70 leading-relaxed line-clamp-2 drop-shadow">
              {item.body}
            </p>
          </div>
        </div>

        {/* Action bar below image */}
        <div className="bg-card px-4 py-2.5 border border-t-0 border-border rounded-b-2xl">
          <ActionBar item={item} />
        </div>
      </motion.div>
    );
  }

  // Text-only card (reminders, updates without images)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      className={`${style.bg} border ${style.border} rounded-2xl overflow-hidden ${item.link ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${item.tagColor}`}>
            {item.tag}
          </span>
          <span className="text-[11px] text-muted-foreground">{item.timeAgo}</span>
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground leading-snug mb-1">
          {item.title}
        </h3>
        {item.subtitle && (
          <p className="text-sm text-muted-foreground mb-2">{item.subtitle}</p>
        )}
        <p className="text-sm text-secondary-foreground leading-relaxed">{item.body}</p>
        <div className="mt-3 pt-3 border-t border-border/50">
          <ActionBar item={item} />
        </div>
      </div>
    </motion.div>
  );
};

export default FeedCard;
