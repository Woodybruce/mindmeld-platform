import { motion } from "framer-motion";
import { Heart, Instagram, Youtube, Globe, Link2, Newspaper, Sparkles } from "lucide-react";
import type { MatchedLink } from "@/hooks/useSharedLinks";

const platformConfig: Record<string, { icon: React.ReactNode; color: string; gradient: string }> = {
  Instagram: { icon: <Instagram className="w-5 h-5" />, color: "text-pink-500", gradient: "from-pink-500 to-purple-500" },
  YouTube: { icon: <Youtube className="w-5 h-5" />, color: "text-red-500", gradient: "from-red-500 to-red-600" },
  TikTok: { icon: <Globe className="w-5 h-5" />, color: "text-foreground", gradient: "from-gray-800 to-gray-900" },
  Article: { icon: <Newspaper className="w-5 h-5" />, color: "text-blue-600", gradient: "from-blue-600 to-blue-700" },
  Link: { icon: <Link2 className="w-5 h-5" />, color: "text-muted-foreground", gradient: "from-muted to-muted-foreground" },
};

interface MatchedLinkCardProps {
  match: MatchedLink;
}

const MatchedLinkCard = ({ match }: MatchedLinkCardProps) => {
  const platform = match.yourLink.platform || "Link";
  const config = platformConfig[platform] || platformConfig.Link;
  const isInstagram = match.url.includes("instagram.com") || match.url.includes("instagr.am");
  const embedUrl = isInstagram ? `${match.url.split("?")[0]}embed` : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-2xl border-2 border-us-coral/30 bg-gradient-to-br from-us-blush/40 via-card to-us-coral/10 overflow-hidden"
    >
      {/* Match badge */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <div className="flex items-center gap-1.5 bg-us-coral/15 text-us-coral rounded-full px-2.5 py-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[13px] font-bold uppercase tracking-wider">You both saved this!</span>
        </div>
        <div className="flex -space-x-1.5 ml-auto">
          <Heart className="w-4 h-4 fill-us-coral text-us-coral" />
          <Heart className="w-4 h-4 fill-us-coral text-us-coral" />
        </div>
      </div>

      {/* Link content */}
      <a
        href={match.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 px-4 py-3"
      >
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-primary-foreground shrink-0`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {match.yourLink.title || match.yourLink.note || match.url}
          </p>
          {match.yourLink.note && match.yourLink.title && (
            <p className="text-xs text-muted-foreground mt-0.5 italic">"{match.yourLink.note}"</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] font-medium text-us-coral">{platform}</span>
            <span className="text-[13px] text-muted-foreground">·</span>
            <span className="text-[13px] text-muted-foreground">
              Saved by both of you
            </span>
          </div>
        </div>
      </a>

      {/* Instagram embed */}
      {isInstagram && embedUrl && (
        <div className="px-4 pb-3">
          <iframe
            src={embedUrl}
            className="w-full rounded-xl border border-border/30"
            style={{ height: 400, maxWidth: 400 }}
            scrolling="no"
            title="Instagram embed"
          />
        </div>
      )}
    </motion.div>
  );
};

export default MatchedLinkCard;
