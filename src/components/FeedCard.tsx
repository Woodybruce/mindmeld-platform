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

const FeedCard = ({ item, index }: FeedCardProps) => {
  const style = typeStyles[item.type];
  const navigate = useNavigate();

  const handleClick = () => {
    if (item.link) navigate(item.link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      className={`${style.bg} border ${style.border} rounded-2xl overflow-hidden ${item.link ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
      onClick={handleClick}
    >
      {item.image && (
        <div className="w-full aspect-[16/9] overflow-hidden">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

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
        <p className="text-sm text-secondary-foreground leading-relaxed">
          {item.body}
        </p>

        {/* Action bar */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-us-coral transition-colors">
              <Heart className={`w-[18px] h-[18px] ${item.liked ? 'fill-us-coral text-us-coral' : ''}`} />
              <span className="text-xs font-medium">Like</span>
            </button>
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-[18px] h-[18px]" />
              <span className="text-xs font-medium">Reply</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Bookmark className={`w-[18px] h-[18px] ${item.saved ? 'fill-foreground' : ''}`} />
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Share2 className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FeedCard;
