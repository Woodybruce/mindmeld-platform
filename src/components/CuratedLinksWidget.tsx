import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bookmark, RefreshCw, ExternalLink, ListPlus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useContentLikes } from "@/hooks/useContentLikes";
import LikeButton from "@/components/LikeButton";

interface Article {
  title: string;
  description: string;
  source: string;
  category: string;
  emoji: string;
  url: string;
  imageHint: string;
}

interface SharedLink {
  id: string;
  url: string;
  title: string | null;
  platform: string;
  created_at: string;
}

const CACHE_KEY = "curated-articles";
const CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

const extractDomain = (url: string) => {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
};

const getFavicon = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch { return null; }
};

const CuratedLinksWidget = () => {
  const { user, profile } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { toggleLike, isLikedByMe, isLikedByPartner, isMutualLike } = useContentLikes("article");

  // Fetch shared links
  useEffect(() => {
    if (!user) return;
    const fetchLinks = async () => {
      const { data } = await supabase
        .from("shared_links")
        .select("id, url, title, platform, created_at")
        .order("created_at", { ascending: false })
        .limit(3);
      if (data) setSharedLinks(data);
    };
    fetchLinks();
  }, [user]);

  // Fetch AI articles
  const fetchArticles = async (force = false) => {
    if (!force) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { articles: cached_articles, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL && cached_articles?.length) {
            setArticles(cached_articles);
            setHasLoaded(true);
            return;
          }
        } catch {}
      }
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-articles");
      if (error) throw error;
      if (data?.articles?.length) {
        setArticles(data.articles);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ articles: data.articles, timestamp: Date.now() }));
      }
    } catch (err) {
      console.error("Failed to fetch articles:", err);
      if (!articles.length) {
        setArticles([
          { title: "5 Love Languages: Understanding Your Partner", description: "Learn the framework that transformed millions of relationships", source: "Psychology Today", category: "Communication", emoji: "💬", url: "https://www.psychologytoday.com", imageHint: "couple talking" },
          { title: "10 Creative Date Night Ideas at Home", description: "Budget-friendly ways to keep the spark alive", source: "MindBodyGreen", category: "Date Ideas", emoji: "🕯️", url: "https://www.mindbodygreen.com", imageHint: "date night" },
          { title: "The Gottman Method: Building Trust", description: "Research-backed strategies for stronger bonds", source: "Gottman Institute", category: "Wellness", emoji: "🤝", url: "https://www.gottman.com", imageHint: "couple trust" },
        ]);
      }
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => { fetchArticles(); }, []);

  const saveArticleAsList = (article: Article) => {
    toast.info(`"${article.title}" saved — open Lists to view key points`, { duration: 3000 });
    // Save to localStorage as a new list
    const stored = localStorage.getItem("userLists");
    const lists = stored ? JSON.parse(stored) : [];
    const newList = {
      id: `article-${Date.now()}`,
      name: article.title,
      icon: article.emoji,
      template: "article",
      createdAt: new Date().toISOString(),
      maxItems: 10,
      items: [
        { id: `h-${Date.now()}`, text: `Key Takeaways`, done: false, isHeading: true },
        { id: `i1-${Date.now()}`, text: `Read: ${article.url}`, done: false },
        { id: `i2-${Date.now()}`, text: article.description, done: false },
      ],
    };
    lists.push(newList);
    localStorage.setItem("userLists", JSON.stringify(lists));
  };

  if (!hasLoaded && !loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Bookmark className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">For You</h3>
            <p className="text-[10px] text-muted-foreground">Links & relationship reads</p>
          </div>
        </div>
        <button onClick={() => fetchArticles(true)} disabled={loading} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Shared links section */}
      {sharedLinks.length > 0 && (
        <div className="px-3 pb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-1.5">Your Saved Links</p>
          {sharedLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <img
                src={getFavicon(link.url) || ""}
                alt=""
                className="w-6 h-6 rounded flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{link.title || extractDomain(link.url)}</p>
                <p className="text-[10px] text-muted-foreground">{extractDomain(link.url)}</p>
              </div>
              <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </a>
          ))}
        </div>
      )}

      {/* Curated articles — horizontal scroll */}
      <div className="pb-1">
        <div className="flex items-center gap-1 px-4 pb-1.5">
          <Sparkles className="w-3 h-3 text-primary" />
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested Reads</p>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-3 pb-1">
          {(loading && !articles.length
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-48 animate-pulse bg-secondary/60 rounded-xl p-3 space-y-2">
                  <div className="w-full h-24 bg-muted rounded-lg" />
                  <div className="w-3/4 h-3 bg-muted rounded" />
                  <div className="w-full h-2 bg-muted rounded" />
                </div>
              ))
            : articles.slice(0, 6).map((article, i) => (
                <div key={i} className="flex-shrink-0 w-48 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors overflow-hidden group">
                  <div className="relative w-full h-24 bg-gradient-to-br from-secondary to-muted flex items-center justify-center overflow-hidden">
                    <img
                      src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(article.url)}&size=128`}
                      alt=""
                      className="w-10 h-10 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-4xl opacity-10 select-none">{article.emoji}</span>
                    <div className="absolute bottom-1.5 left-1.5">
                      <span className="text-[9px] bg-background/80 backdrop-blur-sm text-foreground px-1.5 py-0.5 rounded-full font-medium">{article.category}</span>
                    </div>
                  </div>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="block p-2.5">
                    <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{article.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{article.source}</p>
                  </a>
                  <div className="px-2.5 pb-2 flex items-center justify-between">
                    <LikeButton
                      liked={isLikedByMe(article.url)}
                      partnerLiked={isLikedByPartner(article.url)}
                      mutual={isMutualLike(article.url)}
                      onToggle={() => toggleLike(article.url, article.title)}
                    />
                    <button
                      onClick={() => saveArticleAsList(article)}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-all"
                      title="Save as list"
                    >
                      <ListPlus className="w-3.5 h-3.5 text-primary" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="px-4 pb-2.5">
        <p className="text-[9px] text-muted-foreground/50">✨ AI-curated · Tap to read · Save to create a list</p>
      </div>
    </motion.div>
  );
};

export default CuratedLinksWidget;
