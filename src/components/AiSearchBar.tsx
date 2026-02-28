import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, X, Loader2, ShoppingCart, ExternalLink, MapPin, Plane, BookOpen, Headphones, PlayCircle, Quote } from "lucide-react";
import { apiInvoke } from "@/lib/api";

const AMAZON_TAG = "woodybruce-21";

interface AiItem {
  name: string;
  description: string;
  category: string;
  emoji: string;
  type: string;
  price?: string;
  brand?: string;
  amazonSearchUrl?: string;
  venue?: string;
  city?: string;
  duration?: string;
  destination?: string;
  country?: string;
  url?: string;
  source?: string;
  spotifyShowName?: string;
  host?: string;
  youtubeSearchQuery?: string;
  creator?: string;
  text?: string;
  author?: string;
}

const QUICK_PROMPTS: Record<string, string[]> = {
  discover: [
    "Best couples board games",
    "Romantic weekend getaways UK",
    "Anniversary gift ideas",
    "Fun date night activities London",
  ],
  foryou: [
    "How to improve communication",
    "Best relationship podcasts",
    "Keeping the spark alive",
    "Love languages explained",
  ],
};

const withAmazonTag = (url?: string, productName?: string): string => {
  const searchFallback = `https://www.amazon.co.uk/s?k=${encodeURIComponent(productName || "")}&tag=${AMAZON_TAG}`;
  if (url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes("coco-de-mer.com") || u.hostname.includes("agentprovocateur.com")) return url;
      if (u.pathname.includes("/dp/") || u.pathname.includes("/gp/")) {
        return searchFallback;
      }
      u.searchParams.set("tag", AMAZON_TAG);
      return u.toString();
    } catch {}
  }
  return searchFallback;
};

const AiSearchBar = ({ section }: { section: "discover" | "foryou" }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AiItem[]>([]);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    setResults([]);
    try {
      const { data } = await apiInvoke("ai-search", { body: { query: searchQuery, section } });
      if (data?.items?.length) setResults(data.items);
    } catch (e) {
      console.error("AI search failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  const safeOpen = (url: string) => {
    try {
      const u = new URL(url);
      if (u.protocol === "https:" || u.protocol === "http:") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {}
  };

  const openExternal = (item: AiItem) => {
    if (item.type === "product") {
      safeOpen(withAmazonTag(item.amazonSearchUrl, item.name));
    } else if (item.type === "article" && item.url) {
      safeOpen(item.url);
    } else if (item.type === "video" && item.youtubeSearchQuery) {
      safeOpen(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.youtubeSearchQuery)}`);
    } else if (item.type === "podcast" && item.spotifyShowName) {
      safeOpen(`https://open.spotify.com/search/${encodeURIComponent(item.spotifyShowName)}/shows`);
    } else if (item.type === "experience") {
      const q = [item.name, item.venue, item.city].filter(Boolean).join(" ");
      safeOpen(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
    } else if (item.type === "travel") {
      const q = [item.name, item.destination, item.country].filter(Boolean).join(" ");
      safeOpen(`https://www.google.com/search?q=${encodeURIComponent(q + " holidays")}`);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "product": return <ShoppingCart className="w-3 h-3" />;
      case "experience": return <MapPin className="w-3 h-3" />;
      case "travel": return <Plane className="w-3 h-3" />;
      case "article": return <BookOpen className="w-3 h-3" />;
      case "podcast": return <Headphones className="w-3 h-3" />;
      case "video": return <PlayCircle className="w-3 h-3" />;
      case "quote": return <Quote className="w-3 h-3" />;
      default: return <Sparkles className="w-3 h-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "product": return "bg-[#FF9900]/10 text-[#FF9900]";
      case "experience": return "bg-rose-500/10 text-rose-500";
      case "travel": return "bg-sky-500/10 text-sky-500";
      case "article": return "bg-emerald-500/10 text-emerald-500";
      case "podcast": return "bg-[#1DB954]/10 text-[#1DB954]";
      case "video": return "bg-red-500/10 text-red-500";
      case "quote": return "bg-violet-500/10 text-violet-500";
      default: return "bg-primary/10 text-primary";
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case "product": return "Buy on Amazon";
      case "experience": return "Find out more";
      case "travel": return "Explore";
      case "article": return "Read article";
      case "podcast": return "Open on Spotify";
      case "video": return "Watch on YouTube";
      default: return "";
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="mx-3 mb-2 flex items-center gap-2 w-[calc(100%-1.5rem)] px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-left"
        data-testid={`ai-search-open-${section}`}
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-2.5 h-2.5 text-white" />
        </div>
        <span className="text-[11px] text-muted-foreground">Ask AI to find the best {section === "discover" ? "products & experiences" : "articles, podcasts & videos"}...</span>
      </button>
    );
  }

  return (
    <div className="mx-3 mb-2">
      <div className="flex items-center gap-2 bg-secondary/80 rounded-xl px-3 py-2 border border-primary/20">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-2.5 h-2.5 text-white" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          placeholder={section === "discover" ? "e.g. Best couples gifts under £30" : "e.g. How to keep the spark alive"}
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
          data-testid={`ai-search-input-${section}`}
        />
        {loading ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
        ) : query ? (
          <button onClick={() => handleSearch()} className="p-1 rounded-lg hover:bg-primary/10" data-testid={`ai-search-submit-${section}`}>
            <Search className="w-3.5 h-3.5 text-primary" />
          </button>
        ) : null}
        <button onClick={handleClose} className="p-1 rounded-lg hover:bg-secondary" data-testid={`ai-search-close-${section}`}>
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {!searched && !loading && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
          {QUICK_PROMPTS[section].map((prompt) => (
            <button
              key={prompt}
              onClick={() => { setQuery(prompt); handleSearch(prompt); }}
              className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-primary/5 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
              data-testid={`ai-quick-${prompt.slice(0, 10)}`}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 mt-3 px-1">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[10px] text-muted-foreground">Finding the best recommendations...</span>
          </motion.div>
        )}

        {searched && !loading && results.length === 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-muted-foreground mt-3 px-1">
            No results found. Try a different question.
          </motion.p>
        )}

        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-2">
            {results.map((item, i) => (
              <motion.div
                key={`${item.name}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex gap-2.5 p-2.5 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(item.type)}`}>
                  <span className="text-lg">{item.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-foreground leading-tight line-clamp-1">{item.name}</p>
                    <span className={`flex items-center gap-0.5 text-[8px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${getTypeColor(item.type)}`}>
                      {getTypeIcon(item.type)}
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {item.price && <span className="text-[11px] font-bold text-primary">{item.price}</span>}
                    {item.brand && <span className="text-[9px] text-muted-foreground">{item.brand}</span>}
                    {item.venue && <span className="text-[9px] text-muted-foreground">{item.venue}</span>}
                    {item.host && <span className="text-[9px] text-muted-foreground">{item.host}</span>}
                    {item.creator && <span className="text-[9px] text-muted-foreground">{item.creator}</span>}
                    {item.duration && <span className="text-[9px] text-muted-foreground">· {item.duration}</span>}
                    {item.destination && <span className="text-[9px] text-muted-foreground">{item.destination}, {item.country}</span>}
                    {item.source && <span className="text-[9px] text-muted-foreground">{item.source}</span>}
                    {item.author && <span className="text-[9px] text-muted-foreground italic">— {item.author}</span>}
                  </div>
                  {item.type === "quote" && item.text && (
                    <p className="text-[10px] italic text-foreground/70 mt-1 line-clamp-3">"{item.text}"</p>
                  )}
                  {getActionLabel(item.type) && (
                    <button
                      onClick={() => openExternal(item)}
                      className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        item.type === "product"
                          ? "bg-[#FF9900] text-black hover:bg-[#FFa820]"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                      data-testid={`ai-result-action-${i}`}
                    >
                      {item.type === "product" ? <ShoppingCart className="w-2.5 h-2.5" /> : <ExternalLink className="w-2.5 h-2.5" />}
                      {getActionLabel(item.type)}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AiSearchBar;
