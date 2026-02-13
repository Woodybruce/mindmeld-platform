import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Send, X, Instagram, Globe, Youtube, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SharedLink {
  id: string;
  url: string;
  platform: string;
  icon: React.ReactNode;
  title: string;
  note?: string;
  timeAgo: string;
  sender: string;
}

const detectPlatform = (url: string) => {
  if (url.includes("instagram.com") || url.includes("instagr.am"))
    return { platform: "Instagram", icon: <Instagram className="w-4 h-4" />, color: "from-pink-500 to-purple-500" };
  if (url.includes("youtube.com") || url.includes("youtu.be"))
    return { platform: "YouTube", icon: <Youtube className="w-4 h-4" />, color: "from-red-500 to-red-600" };
  if (url.includes("tiktok.com"))
    return { platform: "TikTok", icon: <Globe className="w-4 h-4" />, color: "from-gray-800 to-gray-900" };
  if (url.includes("bbc.") || url.includes("news") || url.includes("guardian"))
    return { platform: "Article", icon: <Newspaper className="w-4 h-4" />, color: "from-us-navy to-blue-700" };
  return { platform: "Link", icon: <Link2 className="w-4 h-4" />, color: "from-us-warm-gray to-gray-500" };
};

const sampleSharedLinks: SharedLink[] = [
  {
    id: "sl1",
    url: "https://www.instagram.com/p/example1",
    platform: "Instagram",
    icon: <Instagram className="w-4 h-4" />,
    title: "This restaurant looks amazing for date night! 🍝",
    note: "We should try this place next weekend",
    timeAgo: "30m ago",
    sender: "Woody",
  },
  {
    id: "sl2",
    url: "https://www.instagram.com/reel/example2",
    platform: "Instagram",
    icon: <Instagram className="w-4 h-4" />,
    title: "Couple's holiday inspiration ✈️",
    timeAgo: "2h ago",
    sender: "Partner",
  },
  {
    id: "sl3",
    url: "https://www.youtube.com/watch?v=example",
    platform: "YouTube",
    icon: <Youtube className="w-4 h-4" />,
    title: "How to improve communication in relationships",
    note: "This is really good, watch when you get a chance",
    timeAgo: "Yesterday",
    sender: "Woody",
  },
];

interface ShareLinkComposerProps {
  open: boolean;
  onClose: () => void;
  onSend: (url: string, note: string) => void;
}

const ShareLinkComposer = ({ open, onClose, onSend }: ShareLinkComposerProps) => {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const detected = url.length > 8 ? detectPlatform(url) : null;

  const handleSend = () => {
    if (url.trim()) {
      onSend(url.trim(), note.trim());
      setUrl("");
      setNote("");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card rounded-t-3xl p-5 space-y-4 safe-area-bottom"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Share a Link</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* URL input */}
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a link (Instagram, YouTube, article...)"
                className="w-full h-12 rounded-xl bg-secondary px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
              {detected && (
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-gradient-to-br ${detected.color} flex items-center justify-center text-primary-foreground`}>
                  {detected.icon}
                </div>
              )}
            </div>

            {/* Note input */}
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for your partner (optional)"
              className="w-full h-11 rounded-xl bg-secondary px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />

            {/* Send */}
            <Button
              onClick={handleSend}
              disabled={!url.trim()}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-us-coral to-us-terracotta text-primary-foreground font-semibold disabled:opacity-40"
            >
              <Send className="w-4 h-4 mr-2" />
              Send to Partner
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface SharedLinksWidgetProps {
  links?: SharedLink[];
}

const SharedLinksWidget = ({ links = sampleSharedLinks }: SharedLinksWidgetProps) => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [allLinks, setAllLinks] = useState(links);

  const handleSend = (url: string, note: string) => {
    const detected = detectPlatform(url);
    const newLink: SharedLink = {
      id: Date.now().toString(),
      url,
      platform: detected.platform,
      icon: detected.icon,
      title: note || url,
      timeAgo: "Just now",
      sender: "You",
    };
    setAllLinks([newLink, ...allLinks]);
  };

  return (
    <>
      {/* Shared links section in feed */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-us-coral" />
            <h3 className="font-display text-base font-semibold text-foreground">Shared Links</h3>
          </div>
          <button
            onClick={() => setComposerOpen(true)}
            className="text-xs font-semibold text-us-coral hover:text-us-terracotta transition-colors"
          >
            + Share
          </button>
        </div>

        <div className="divide-y divide-border/50">
          {allLinks.map((link) => {
            const isInstagram = link.url.includes("instagram.com") || link.url.includes("instagr.am");
            return (
              <div key={link.id} className="px-4 py-3 hover:bg-secondary/50 transition-colors">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${detectPlatform(link.url).color} flex items-center justify-center text-primary-foreground shrink-0 mt-0.5`}>
                    {link.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                      {link.title}
                    </p>
                    {link.note && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{link.note}"</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground">{link.sender}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{link.platform}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{link.timeAgo}</span>
                    </div>
                  </div>
                </a>
                {/* Instagram embed preview */}
                {isInstagram && (
                  <div className="mt-2 ml-13">
                    <iframe
                      src={`${link.url.split("?")[0]}embed`}
                      className="w-full rounded-lg border border-border/30"
                      style={{ height: 320, maxWidth: 320 }}
                      scrolling="no"
                      allowTransparency
                      title="Instagram embed"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ShareLinkComposer open={composerOpen} onClose={() => setComposerOpen(false)} onSend={handleSend} />
    </>
  );
};

export default SharedLinksWidget;
