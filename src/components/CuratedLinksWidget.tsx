import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, RefreshCw, ExternalLink, ListPlus, Sparkles, BookOpen, Headphones, PlayCircle, Quote, X, ArrowLeft, Clock, Share2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { apiInvoke } from "@/lib/api";
import { toast } from "sonner";
import { useContentLikes } from "@/hooks/useContentLikes";
import { useSharedLists } from "@/hooks/useSharedLists";
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

interface OgMeta {
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
  siteName: string;
}

interface ArticleContent {
  title: string;
  image: string;
  siteName: string;
  author: string;
  content: string;
  url: string;
}

interface Podcast {
  title: string;
  description: string;
  host: string;
  category: string;
  emoji?: string;
  spotifyId?: string;
  appleId: string;
  imageUrl: string;
  duration: string;
}

interface Video {
  title: string;
  description: string;
  creator: string;
  category: string;
  emoji: string;
  youtubeId: string;
  tedSlug: string;
  thumbnailUrl: string;
  duration: string;
}

interface QuoteItem {
  text: string;
  author: string;
  category: string;
}

interface SharedLink {
  id: string;
  url: string;
  title: string | null;
  platform: string;
  created_at: string;
}

type TabKey = "articles" | "podcasts" | "videos" | "quotes";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "articles", label: "Articles", icon: <BookOpen className="w-3 h-3" /> },
  { key: "podcasts", label: "Podcasts", icon: <Headphones className="w-3 h-3" /> },
  { key: "videos", label: "Videos", icon: <PlayCircle className="w-3 h-3" /> },
  { key: "quotes", label: "Quotes", icon: <Quote className="w-3 h-3" /> },
];

const CACHE_TTL = 1000 * 60 * 60 * 2;

const cacheGet = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
};

const cacheSet = (key: string, data: unknown) => {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
};

const extractDomain = (url: string) => {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
};

const getFavicon = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch { return null; }
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const GRADIENT_PALETTES = [
  "from-rose-100 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/20",
  "from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20",
  "from-sky-100 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/20",
  "from-emerald-100 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20",
  "from-violet-100 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/20",
];

const ArticleImage = ({ url, ogMeta, emoji, onLoad }: { url: string; ogMeta?: OgMeta; emoji: string; onLoad?: () => void }) => {
  const [failed, setFailed] = useState(false);
  const imgSrc = ogMeta?.ogImage;

  if (imgSrc && !failed) {
    return (
      <img
        src={imgSrc}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
        onLoad={onLoad}
      />
    );
  }
  return (
    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
      <img
        src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=128`}
        alt=""
        className="w-12 h-12 object-contain rounded-xl"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-4xl opacity-10 select-none">{emoji}</span>
    </div>
  );
};

const ArticleReaderModal = ({ article, ogMeta, onClose }: { article: ArticleContent | null; ogMeta?: OgMeta; onClose: () => void }) => {
  if (!article) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm overflow-hidden"
      data-testid="article-reader-modal"
    >
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0 safe-area-top">
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="article-reader-close">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
              data-testid="article-reader-external"
            >
              Open original <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(article.image || ogMeta?.ogImage) && (
            <div className="w-full aspect-[2/1] bg-muted overflow-hidden relative">
              <img
                src={article.image || ogMeta?.ogImage || ""}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            </div>
          )}
          <div className="px-5 py-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <img
                src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(article.url)}&size=64`}
                alt=""
                className="w-4 h-4 rounded"
              />
              <span className="text-xs text-muted-foreground font-medium">{article.siteName}</span>
              {article.author && <span className="text-xs text-muted-foreground">by {article.author}</span>}
            </div>
            <h1 className="text-xl font-display font-bold text-foreground leading-tight mb-4">{article.title}</h1>
            {article.content ? (
              <div
                className="article-reader-content prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">This article is best read on the original site</p>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                >
                  Read on {article.siteName} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
          <div className="h-20" />
        </div>
      </div>
    </motion.div>
  );
};

const PodcastImage = ({ imageUrl, title }: { imageUrl?: string; title: string }) => {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#1DB954]/10">
        <Headphones className="w-8 h-8 text-[#1DB954]" />
      </div>
    );
  }
  return <img src={imageUrl} alt={title} className="w-full h-full object-cover" onError={() => setFailed(true)} />;
};

const SkeletonCard = () => (
  <div className="flex-shrink-0 w-44 animate-pulse bg-secondary/60 rounded-xl overflow-hidden">
    <div className="w-full h-28 bg-muted" />
    <div className="p-2.5 space-y-2">
      <div className="w-3/4 h-3 bg-muted rounded" />
      <div className="w-full h-2 bg-muted rounded" />
    </div>
  </div>
);

const CuratedLinksWidget = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("articles");
  const [articles, setArticles] = useState<Article[]>([]);
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({ articles: false, podcasts: false, videos: false, quotes: false });
  const [loaded, setLoaded] = useState<Record<TabKey, boolean>>({ articles: false, podcasts: false, videos: false, quotes: false });
  const [playerModal, setPlayerModal] = useState<{ type: "podcast" | "video"; title: string; embedUrl: string } | null>(null);
  const [ogMetaMap, setOgMetaMap] = useState<Record<string, OgMeta>>({});
  const [readerArticle, setReaderArticle] = useState<ArticleContent | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const fetchedOgUrls = useRef(new Set<string>());

  useEffect(() => { setPlayerModal(null); }, [activeTab]);

  const { toggleLike, isLikedByMe, isLikedByPartner, isMutualLike } = useContentLikes("article");
  const { addList: addSharedList } = useSharedLists();

  useEffect(() => {
    if (!user) return;
    const fetchLinks = async () => {
      const { data } = await supabase
        .from("shared_links")
        .select("id, url, title, platform, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      if (data) setSharedLinks(data);
    };
    fetchLinks();
  }, [user]);

  const fetchArticles = useCallback(async (force = false) => {
    const key = "foryou-articles";
    if (!force) { const c = cacheGet(key); if (c) { setArticles(c); setLoaded(p => ({ ...p, articles: true })); return; } }
    setLoading(p => ({ ...p, articles: true }));
    try {
      const { data, error } = await apiInvoke("suggest-articles");
      if (error) throw error;
      if (data?.articles?.length) { setArticles(data.articles); cacheSet(key, data.articles); }
    } catch (err) {
      console.error("Failed to fetch articles:", err);
      if (!articles.length) {
        setArticles([
          { title: "5 Love Languages: Understanding Your Partner", description: "Learn the framework that transformed millions of relationships", source: "Psychology Today", category: "Communication", emoji: "\u{1F4AC}", url: "https://www.psychologytoday.com", imageHint: "couple talking" },
          { title: "10 Creative Date Night Ideas at Home", description: "Budget-friendly ways to keep the spark alive", source: "MindBodyGreen", category: "Date Ideas", emoji: "\u{1F56F}\uFE0F", url: "https://www.mindbodygreen.com", imageHint: "date night" },
        ]);
      }
    } finally { setLoading(p => ({ ...p, articles: false })); setLoaded(p => ({ ...p, articles: true })); }
  }, [articles.length]);

  useEffect(() => {
    if (!articles.length) return;
    articles.forEach(a => {
      if (fetchedOgUrls.current.has(a.url)) return;
      fetchedOgUrls.current.add(a.url);
      fetch(`/api/article-metadata?url=${encodeURIComponent(a.url)}`)
        .then(r => r.json())
        .then((meta: OgMeta) => {
          if (meta.ogImage) {
            setOgMetaMap(prev => ({ ...prev, [a.url]: meta }));
          }
        })
        .catch(() => {});
    });
  }, [articles]);

  const openArticleReader = useCallback(async (article: Article) => {
    setReaderLoading(true);
    try {
      const resp = await fetch(`/api/article-content?url=${encodeURIComponent(article.url)}`);
      if (!resp.ok) throw new Error("fetch failed");
      const data: ArticleContent = await resp.json();
      setReaderArticle(data);
    } catch {
      window.open(article.url, "_blank", "noopener,noreferrer");
    } finally {
      setReaderLoading(false);
    }
  }, []);

  const fetchPodcasts = useCallback(async (force = false) => {
    const key = "foryou-podcasts-v2";
    if (!force) { const c = cacheGet(key); if (c) { setPodcasts(c); setLoaded(p => ({ ...p, podcasts: true })); return; } }
    setLoading(p => ({ ...p, podcasts: true }));
    try {
      const { data, error } = await apiInvoke("curated-podcasts");
      if (error) throw error;
      if (data?.podcasts?.length) { setPodcasts(data.podcasts); cacheSet(key, data.podcasts); }
    } catch (err) { console.error("Failed to fetch podcasts:", err); }
    finally { setLoading(p => ({ ...p, podcasts: false })); setLoaded(p => ({ ...p, podcasts: true })); }
  }, []);

  const fetchVideos = useCallback(async (force = false) => {
    const key = "foryou-videos";
    if (!force) { const c = cacheGet(key); if (c) { setVideos(c); setLoaded(p => ({ ...p, videos: true })); return; } }
    setLoading(p => ({ ...p, videos: true }));
    try {
      const { data, error } = await apiInvoke("curated-videos");
      if (error) throw error;
      if (data?.videos?.length) { setVideos(data.videos); cacheSet(key, data.videos); }
    } catch (err) { console.error("Failed to fetch videos:", err); }
    finally { setLoading(p => ({ ...p, videos: false })); setLoaded(p => ({ ...p, videos: true })); }
  }, []);

  const fetchQuotes = useCallback(async (force = false) => {
    const key = "foryou-quotes";
    if (!force) { const c = cacheGet(key); if (c) { setQuotes(c); setLoaded(p => ({ ...p, quotes: true })); return; } }
    setLoading(p => ({ ...p, quotes: true }));
    try {
      const { data, error } = await apiInvoke("curated-quotes");
      if (error) throw error;
      if (data?.quotes?.length) { setQuotes(data.quotes); cacheSet(key, data.quotes); }
    } catch (err) { console.error("Failed to fetch quotes:", err); }
    finally { setLoading(p => ({ ...p, quotes: false })); setLoaded(p => ({ ...p, quotes: true })); }
  }, []);

  useEffect(() => {
    const v = localStorage.getItem("foryou-cache-v");
    if (v !== "5") {
      ["foryou-articles", "foryou-podcasts", "foryou-podcasts-v2", "foryou-videos", "foryou-quotes", "curated-articles"].forEach(k => localStorage.removeItem(k));
      localStorage.setItem("foryou-cache-v", "5");
    }
    if (!loaded.articles) fetchArticles();
  }, []);
  useEffect(() => { if (activeTab === "podcasts" && !loaded.podcasts) fetchPodcasts(); }, [activeTab]);
  useEffect(() => { if (activeTab === "videos" && !loaded.videos) fetchVideos(); }, [activeTab]);
  useEffect(() => { if (activeTab === "quotes" && !loaded.quotes) fetchQuotes(); }, [activeTab]);

  const handleRefresh = () => {
    if (activeTab === "articles") fetchArticles(true);
    else if (activeTab === "podcasts") fetchPodcasts(true);
    else if (activeTab === "videos") fetchVideos(true);
    else fetchQuotes(true);
  };

  const saveArticleAsList = async (article: Article) => {
    toast.info(`"${article.title}" saved — open Lists to view key points`, { duration: 3000 });
    await addSharedList({
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
    });
  };

  const combinedArticles = useMemo(() => {
    const articleItems = articles.map(a => ({ kind: "article" as const, data: a }));
    const linkItems = sharedLinks.map(l => ({ kind: "link" as const, data: l }));
    return shuffle([...articleItems, ...linkItems]);
  }, [articles, sharedLinks]);

  const isTabLoading = loading[activeTab];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">For You</h3>
            <p className="text-[14px] text-muted-foreground">
              {activeTab === "articles" && "Reads & saved links"}
              {activeTab === "podcasts" && "Listen together in-app"}
              {activeTab === "videos" && "TED Talks & more"}
              {activeTab === "quotes" && "Words to inspire"}
            </p>
          </div>
        </div>
        <button onClick={handleRefresh} disabled={isTabLoading} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" data-testid="refresh-foryou">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isTabLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1 text-[14px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`foryou-tab-${tab.key}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="pb-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="flex gap-3 overflow-x-auto scrollbar-hide px-3 pb-2"
          >
            {activeTab === "articles" && (
              isTabLoading && !combinedArticles.length
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : combinedArticles.map((item, i) => {
                    if (item.kind === "link") {
                      const link = item.data;
                      return (
                        <a
                          key={`link-${link.id}`}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 w-44 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors overflow-hidden block"
                          data-testid={`saved-link-${link.id}`}
                        >
                          <div className="w-full h-24 bg-primary/5 flex items-center justify-center">
                            <Bookmark className="w-6 h-6 text-primary/40" />
                          </div>
                          <div className="p-2.5">
                            <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{link.title || extractDomain(link.url)}</p>
                            <p className="text-[14px] text-muted-foreground mt-1 flex items-center gap-1">
                              <img src={getFavicon(link.url) || ""} alt="" className="w-3 h-3 rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              {extractDomain(link.url)}
                            </p>
                          </div>
                        </a>
                      );
                    }
                    const article = item.data;
                    const og = ogMetaMap[article.url];
                    const hasImage = !!og?.ogImage;
                    return (
                      <motion.div
                        key={`article-${i}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex-shrink-0 w-44 rounded-xl bg-secondary/50 overflow-hidden"
                      >
                        <button
                          onClick={() => openArticleReader(article)}
                          className="w-full text-left"
                          data-testid={`article-link-${i}`}
                          disabled={readerLoading}
                        >
                          <div className={`relative w-full overflow-hidden bg-muted ${hasImage ? "h-28" : "h-16"}`}>
                            <ArticleImage url={article.url} ogMeta={og} emoji={article.emoji} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <div className="absolute bottom-1.5 left-1.5">
                              <span className="text-[13px] bg-white/20 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full font-medium">{article.category}</span>
                            </div>
                          </div>
                          <div className="p-2.5">
                            <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{article.title}</p>
                            <p className="text-[14px] text-muted-foreground mt-0.5 line-clamp-2">{og?.ogDescription || article.description}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <img
                                src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(article.url)}&size=64`}
                                alt="" className="w-3 h-3 rounded"
                              />
                              <span className="text-[13px] text-muted-foreground">{og?.siteName || article.source}</span>
                            </div>
                          </div>
                        </button>
                        <div className="px-2.5 pb-2 flex items-center justify-between">
                          <LikeButton
                            liked={isLikedByMe(article.url)}
                            partnerLiked={isLikedByPartner(article.url)}
                            mutual={isMutualLike(article.url)}
                            onToggle={() => toggleLike(article.url, article.title)}
                          />
                          <div className="flex items-center gap-1">
                            <button onClick={() => saveArticleAsList(article)} className="p-1 rounded-lg hover:bg-secondary" data-testid={`save-article-${i}`}>
                              <ListPlus className="w-3 h-3 text-primary" />
                            </button>
                            <a href={article.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded-lg hover:bg-secondary">
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
            )}

            {activeTab === "podcasts" && (
              isTabLoading && !podcasts.length
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : podcasts.map((pod, i) => {
                    const podKey = `pod-${pod.appleId}`;
                    return (
                      <motion.div
                        key={podKey}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex-shrink-0 w-44 rounded-xl bg-secondary/50 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            const embedUrl = `https://embed.podcasts.apple.com/us/podcast/id${pod.appleId}?theme=auto`;
                            setPlayerModal({ type: "podcast", title: pod.title, embedUrl });
                          }}
                          className="w-full text-left"
                          data-testid={`podcast-${i}`}
                        >
                          <div className="relative w-full h-36 overflow-hidden bg-muted">
                            <PodcastImage imageUrl={pod.imageUrl} title={pod.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <div className="absolute bottom-1.5 left-1.5">
                              <span className="text-[13px] bg-white/20 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full font-medium">{pod.category}</span>
                            </div>
                            <div className="absolute top-1.5 right-1.5">
                              <PlayCircle className="w-5 h-5 drop-shadow text-white/80" />
                            </div>
                          </div>
                          <div className="p-2.5">
                            <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{pod.title}</p>
                            <p className="text-[14px] text-muted-foreground mt-0.5">{pod.host} · {pod.duration}</p>
                          </div>
                        </button>

                        <div className="px-2.5 pb-2 flex items-center justify-between">
                          <LikeButton
                            liked={isLikedByMe(podKey)}
                            partnerLiked={isLikedByPartner(podKey)}
                            mutual={isMutualLike(podKey)}
                            onToggle={() => toggleLike(podKey, pod.title)}
                          />
                          <a href={`https://podcasts.apple.com/podcast/id${pod.appleId}`} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-[#8232D2]" data-testid={`podcast-apple-${i}`}>Apple Podcasts</a>
                        </div>
                      </motion.div>
                    );
                  })
            )}

            {activeTab === "videos" && (
              isTabLoading && !videos.length
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : videos.map((vid, i) => {
                    const isTed = !!vid.tedSlug;
                    const thumbSrc = vid.thumbnailUrl || `https://img.youtube.com/vi/${vid.youtubeId}/mqdefault.jpg`;
                    return (
                      <motion.div
                        key={vid.youtubeId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex-shrink-0 w-44 rounded-xl bg-secondary/50 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            const embedUrl = isTed
                              ? `https://embed.ted.com/talks/${vid.tedSlug}`
                              : `https://www.youtube.com/embed/${vid.youtubeId}?autoplay=1&rel=0`;
                            setPlayerModal({ type: "video", title: vid.title, embedUrl });
                          }}
                          className="w-full text-left"
                          data-testid={`video-${i}`}
                        >
                          <div className="relative w-full h-24 bg-black/5 overflow-hidden">
                            <img src={thumbSrc} alt={vid.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${vid.youtubeId}/mqdefault.jpg`; }} />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${isTed ? "bg-[#e62b1e]" : "bg-white/90"}`}>
                                <PlayCircle className={`w-5 h-5 ${isTed ? "text-white" : "text-red-600"}`} />
                              </div>
                            </div>
                            <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
                              {isTed && <span className="text-[8px] bg-[#e62b1e] text-white px-1 py-0.5 rounded font-bold">TED</span>}
                              <span className="text-[8px] bg-black/70 text-white px-1 py-0.5 rounded font-medium">{vid.duration}</span>
                            </div>
                          </div>
                        </button>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{vid.title}</p>
                          <p className="text-[14px] text-muted-foreground mt-0.5">{vid.creator} · {vid.duration}</p>
                        </div>
                        <div className="px-2.5 pb-2 flex items-center justify-between">
                          <LikeButton
                            liked={isLikedByMe(vid.youtubeId)}
                            partnerLiked={isLikedByPartner(vid.youtubeId)}
                            mutual={isMutualLike(vid.youtubeId)}
                            onToggle={() => toggleLike(vid.youtubeId, vid.title)}
                          />
                          <span className="text-[13px] text-muted-foreground/50">{vid.category}</span>
                        </div>
                      </motion.div>
                    );
                  })
            )}

            {activeTab === "quotes" && (
              isTabLoading && !quotes.length
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-44 animate-pulse rounded-xl bg-secondary/50 p-6">
                      <div className="w-3/4 h-4 bg-muted rounded mx-auto mb-3" />
                      <div className="w-1/2 h-3 bg-muted rounded mx-auto" />
                    </div>
                    ))
                  : quotes.map((quote, i) => {
                      const quoteId = `quote-${quote.text.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}`;
                      return (
                        <motion.div
                          key={`${quote.author}-${i}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.08 }}
                          className={`flex-shrink-0 w-44 rounded-xl bg-gradient-to-br ${GRADIENT_PALETTES[i % GRADIENT_PALETTES.length]} p-4 text-center relative overflow-hidden`}
                        >
                          <Quote className="w-4 h-4 text-foreground/10 absolute top-2 left-2" />
                          <p className="text-[13px] font-serif italic text-foreground leading-relaxed relative z-10 line-clamp-5">
                            "{quote.text}"
                          </p>
                          <p className="text-[14px] font-medium text-muted-foreground mt-2 relative z-10">
                            — {quote.author}
                          </p>
                          <div className="mt-2 flex items-center justify-center">
                            <LikeButton
                              liked={isLikedByMe(quoteId)}
                              partnerLiked={isLikedByPartner(quoteId)}
                              mutual={isMutualLike(quoteId)}
                              onToggle={() => toggleLike(quoteId, quote.text.slice(0, 50))}
                            />
                          </div>
                        </motion.div>
                      );
                    })
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-4 pb-2.5">
        <p className="text-[13px] text-muted-foreground/50">
          {activeTab === "articles" && "Tap to read in-app · Scroll for more"}
          {activeTab === "podcasts" && "Tap to play in-app · Scroll for more"}
          {activeTab === "videos" && "Tap to play inline · Scroll for more"}
          {activeTab === "quotes" && "Share your favourite · Scroll for more"}
        </p>
      </div>

      {readerLoading && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading article...</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {readerArticle && (
          <ArticleReaderModal
            article={readerArticle}
            ogMeta={ogMetaMap[readerArticle.url]}
            onClose={() => setReaderArticle(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {playerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setPlayerModal(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <p className="text-sm font-semibold text-foreground line-clamp-1">{playerModal.title}</p>
                <button onClick={() => setPlayerModal(null)} className="p-1 rounded-full hover:bg-secondary" data-testid="close-player-modal">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className={playerModal.type === "video" ? "aspect-video" : "h-[280px]"}>
                <iframe
                  src={playerModal.embedUrl}
                  width="100%"
                  height="100%"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
                  allowFullScreen
                  sandbox={playerModal.type === "podcast" ? "allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" : undefined}
                  className="border-0"
                  title={playerModal.title}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CuratedLinksWidget;
