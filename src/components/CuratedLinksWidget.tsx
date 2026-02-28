import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, RefreshCw, ExternalLink, ListPlus, Sparkles, BookOpen, Headphones, PlayCircle, Quote } from "lucide-react";
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

interface Podcast {
  title: string;
  description: string;
  host: string;
  category: string;
  emoji: string;
  spotifyId: string;
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

const PodcastImage = ({ imageUrl, title }: { imageUrl?: string; title: string }) => {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return (
      <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-[#1DB954]/10 flex items-center justify-center">
        <Headphones className="w-6 h-6 text-[#1DB954]" />
      </div>
    );
  }
  return (
    <div className="w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden bg-muted">
      <img src={imageUrl} alt={title} className="w-full h-full object-cover" onError={() => setFailed(true)} />
    </div>
  );
};

const SkeletonCard = ({ wide = false }: { wide?: boolean }) => (
  <div className={`flex-shrink-0 ${wide ? "w-64" : "w-48"} animate-pulse bg-secondary/60 rounded-xl overflow-hidden`}>
    <div className={`w-full ${wide ? "h-36" : "h-24"} bg-muted`} />
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
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [expandedPodcast, setExpandedPodcast] = useState<string | null>(null);

  useEffect(() => { setExpandedVideo(null); setExpandedPodcast(null); }, [activeTab]);

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

  const fetchPodcasts = useCallback(async (force = false) => {
    const key = "foryou-podcasts";
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
    if (v !== "2") {
      ["foryou-articles", "foryou-podcasts", "foryou-videos", "foryou-quotes", "curated-articles"].forEach(k => localStorage.removeItem(k));
      localStorage.setItem("foryou-cache-v", "2");
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
            <p className="text-[10px] text-muted-foreground">
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
            className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`foryou-tab-${tab.key}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="pb-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "articles" && (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide px-3 pb-1">
                {isTabLoading && !combinedArticles.length
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
                            className="flex-shrink-0 w-48 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors overflow-hidden block"
                            data-testid={`saved-link-${link.id}`}
                          >
                            <div className="w-full h-24 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center relative">
                              <img
                                src={getFavicon(link.url) || ""}
                                alt=""
                                className="w-12 h-12 object-contain rounded-xl"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                              <div className="absolute bottom-1.5 left-1.5">
                                <span className="text-[9px] bg-background/80 backdrop-blur-sm text-foreground px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <Bookmark className="w-2.5 h-2.5" /> Saved
                                </span>
                              </div>
                            </div>
                            <div className="p-2.5">
                              <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{link.title || extractDomain(link.url)}</p>
                              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                {extractDomain(link.url)} <ExternalLink className="w-2.5 h-2.5" />
                              </p>
                            </div>
                          </a>
                        );
                      }
                      const article = item.data;
                      return (
                        <div key={`article-${i}`} className="flex-shrink-0 w-48 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors overflow-hidden">
                          <div className="relative w-full h-24 bg-gradient-to-br from-secondary to-muted flex items-center justify-center overflow-hidden">
                            <img
                              src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(article.url)}&size=128`}
                              alt=""
                              className="w-12 h-12 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-4xl opacity-10 select-none">{article.emoji}</span>
                            <div className="absolute bottom-1.5 left-1.5">
                              <span className="text-[9px] bg-background/80 backdrop-blur-sm text-foreground px-1.5 py-0.5 rounded-full font-medium">{article.category}</span>
                            </div>
                          </div>
                          <a href={article.url} target="_blank" rel="noopener noreferrer" className="block p-2.5" data-testid={`article-link-${i}`}>
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
                              data-testid={`save-article-${i}`}
                            >
                              <ListPlus className="w-3.5 h-3.5 text-primary" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
              </div>
            )}

            {activeTab === "podcasts" && (
              <div className="flex flex-col gap-2.5 px-3 pb-1">
                {isTabLoading && !podcasts.length
                  ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} wide />)
                  : podcasts.map((pod, i) => {
                      const podKey = `pod-${pod.spotifyId}`;
                      const isExpanded = expandedPodcast === podKey;
                      return (
                        <motion.div
                          key={podKey}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-xl bg-secondary/50 overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedPodcast(isExpanded ? null : podKey)}
                            className="w-full text-left p-3 flex items-start gap-3"
                            data-testid={`podcast-${i}`}
                          >
                            <PodcastImage imageUrl={pod.imageUrl} title={pod.title} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{pod.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{pod.host} · {pod.duration}</p>
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-2">{pod.description}</p>
                            </div>
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                              <PlayCircle className={`w-5 h-5 transition-colors ${isExpanded ? "text-[#8232D2]" : "text-muted-foreground"}`} />
                              <span className="text-[8px] text-muted-foreground">{pod.category}</span>
                            </div>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (pod.appleId || pod.spotifyId) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 175, opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                {pod.appleId ? (
                                  <iframe
                                    src={`https://embed.podcasts.apple.com/us/podcast/id${pod.appleId}?theme=auto`}
                                    width="100%"
                                    height="175"
                                    allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                                    sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                                    loading="lazy"
                                    className="border-0 rounded-none"
                                    title={pod.title}
                                  />
                                ) : (
                                  <iframe
                                    src={`https://open.spotify.com/embed/show/${pod.spotifyId}?utm_source=generator&theme=0`}
                                    width="100%"
                                    height="175"
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    loading="lazy"
                                    className="border-0"
                                    title={pod.title}
                                  />
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="px-3 pb-2 flex items-center justify-between">
                            <LikeButton
                              liked={isLikedByMe(podKey)}
                              partnerLiked={isLikedByPartner(podKey)}
                              mutual={isMutualLike(podKey)}
                              onToggle={() => toggleLike(podKey, pod.title)}
                            />
                            <div className="flex items-center gap-2">
                              <a
                                href={`https://podcasts.apple.com/podcast/id${pod.appleId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-medium text-[#8232D2] hover:underline flex items-center gap-1"
                                data-testid={`podcast-apple-${i}`}
                              >
                                Apple <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <a
                                href={`https://open.spotify.com/show/${pod.spotifyId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-medium text-[#1DB954] hover:underline flex items-center gap-1"
                                data-testid={`podcast-spotify-${i}`}
                              >
                                Spotify <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
              </div>
            )}

            {activeTab === "videos" && (
              <div className="flex flex-col gap-2.5 px-3 pb-1">
                {isTabLoading && !videos.length
                  ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} wide />)
                  : videos.map((vid, i) => {
                      const isExpanded = expandedVideo === vid.youtubeId;
                      const isTed = !!vid.tedSlug;
                      const thumbSrc = vid.thumbnailUrl || `https://img.youtube.com/vi/${vid.youtubeId}/mqdefault.jpg`;
                      return (
                        <motion.div
                          key={vid.youtubeId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-xl bg-secondary/50 overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedVideo(isExpanded ? null : vid.youtubeId)}
                            className="w-full text-left"
                            data-testid={`video-${i}`}
                          >
                            <div className="relative w-full aspect-video bg-black/5 overflow-hidden">
                              {isExpanded ? (
                                <iframe
                                  src={isTed
                                    ? `https://embed.ted.com/talks/${vid.tedSlug}`
                                    : `https://www.youtube.com/embed/${vid.youtubeId}?autoplay=1&rel=0`
                                  }
                                  width="100%"
                                  height="100%"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="absolute inset-0 border-0"
                                  title={vid.title}
                                />
                              ) : (
                                <>
                                  <img
                                    src={thumbSrc}
                                    alt={vid.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${vid.youtubeId}/mqdefault.jpg`; }}
                                  />
                                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${isTed ? "bg-[#e62b1e]" : "bg-white/90"}`}>
                                      <PlayCircle className={`w-7 h-7 ${isTed ? "text-white" : "text-red-600"}`} />
                                    </div>
                                  </div>
                                  <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                                    {isTed && (
                                      <span className="text-[9px] bg-[#e62b1e] text-white px-1.5 py-0.5 rounded font-bold">TED</span>
                                    )}
                                    <span className="text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded font-medium">{vid.duration}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </button>
                          <div className="p-2.5">
                            <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{vid.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{vid.creator} · {vid.category}</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-2">{vid.description}</p>
                          </div>
                          <div className="px-2.5 pb-2 flex items-center justify-between">
                            <LikeButton
                              liked={isLikedByMe(vid.youtubeId)}
                              partnerLiked={isLikedByPartner(vid.youtubeId)}
                              mutual={isMutualLike(vid.youtubeId)}
                              onToggle={() => toggleLike(vid.youtubeId, vid.title)}
                            />
                            <span className="text-[9px] text-muted-foreground/50">{vid.category}</span>
                          </div>
                        </motion.div>
                      );
                    })}
              </div>
            )}

            {activeTab === "quotes" && (
              <div className="flex flex-col gap-2.5 px-3 pb-1">
                {isTabLoading && !quotes.length
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse rounded-xl bg-secondary/50 p-6">
                        <div className="w-3/4 h-4 bg-muted rounded mx-auto mb-3" />
                        <div className="w-1/2 h-3 bg-muted rounded mx-auto" />
                      </div>
                    ))
                  : quotes.map((quote, i) => (
                      <motion.div
                        key={`${quote.author}-${i}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.08 }}
                        className={`rounded-xl bg-gradient-to-br ${GRADIENT_PALETTES[i % GRADIENT_PALETTES.length]} p-5 text-center relative overflow-hidden`}
                      >
                        <Quote className="w-6 h-6 text-foreground/10 absolute top-3 left-3" />
                        <Quote className="w-6 h-6 text-foreground/10 absolute bottom-3 right-3 rotate-180" />
                        <p className="text-sm font-serif italic text-foreground leading-relaxed relative z-10">
                          "{quote.text}"
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground mt-2.5 relative z-10">
                          — {quote.author}
                        </p>
                        <div className="mt-2.5 flex items-center justify-center">
                          {(() => {
                            const quoteId = `quote-${quote.text.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}`;
                            return (
                              <LikeButton
                                liked={isLikedByMe(quoteId)}
                                partnerLiked={isLikedByPartner(quoteId)}
                                mutual={isMutualLike(quoteId)}
                                onToggle={() => toggleLike(quoteId, quote.text.slice(0, 50))}
                              />
                            );
                          })()}
                        </div>
                      </motion.div>
                    ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-4 pb-2.5">
        <p className="text-[9px] text-muted-foreground/50">
          {activeTab === "articles" && "Curated reads + your saved links · Tap to reshuffle"}
          {activeTab === "podcasts" && "Tap to play in-app · Also on Spotify & Apple Podcasts"}
          {activeTab === "videos" && "Tap to play inline · TED Talks play directly in-app"}
          {activeTab === "quotes" && "Share your favourite with your partner"}
        </p>
      </div>
    </motion.div>
  );
};

export default CuratedLinksWidget;
