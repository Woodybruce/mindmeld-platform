import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bookmark, RefreshCw, ExternalLink, ListPlus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

  if (!hasLoaded && !loading && sharedLinks.length === 0) return null;

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

      {/* Curated articles */}
      <div className="px-3 pb-1">
        <div className="flex items-center gap-1 px-1 pb-1.5">
          <Sparkles className="w-3 h-3 text-primary" />
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested Reads</p>
        </div>
        <div className="space-y-1">
          {(loading && !articles.length
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-2 animate-pulse">
                  <div className="w-14 h-14 bg-muted rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 py-1">
                    <div className="w-3/4 h-3 bg-muted rounded" />
                    <div className="w-full h-2 bg-muted rounded" />
                    <div className="w-1/3 h-2 bg-muted rounded" />
                  </div>
                </div>
              ))
            : articles.slice(0, 4).map((article, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors group">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-2xl flex-shrink-0">
                    {article.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
                      <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{article.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{article.description}</p>
                      <p className="text-[9px] text-muted-foreground/70 mt-1">{article.source} · {article.category}</p>
                    </a>
                  </div>
                  <button
                    onClick={() => saveArticleAsList(article)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all flex-shrink-0"
                    title="Save as list"
                  >
                    <ListPlus className="w-3.5 h-3.5 text-primary" />
                  </button>
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
