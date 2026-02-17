import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, RefreshCw, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useContentLikes } from "@/hooks/useContentLikes";
import LikeButton from "@/components/LikeButton";

interface Product {
  name: string;
  brand: string;
  price: string;
  description: string;
  category: string;
  emoji: string;
  affiliateTag: string;
  imageHint?: string;
  productUrl?: string;
  imageUrl?: string;
}

const CATEGORIES = [
  { key: "general", label: "For You" },
  { key: "experiences", label: "Experiences" },
  { key: "intimacy", label: "Intimacy" },
  { key: "travel", label: "Travel" },
  { key: "dining", label: "Dining" },
];

const CACHE_KEY = "suggested-products";
const CACHE_TTL = 1000 * 60 * 60;

// Category-based gradient backgrounds for product cards
const categoryGradients: Record<string, string> = {
  "Date Night": "from-rose-200/80 to-amber-100/80 dark:from-rose-900/40 dark:to-amber-900/30",
  "Stationery": "from-sky-200/80 to-indigo-100/80 dark:from-sky-900/40 dark:to-indigo-900/30",
  "Wellness": "from-emerald-200/80 to-teal-100/80 dark:from-emerald-900/40 dark:to-teal-900/30",
  "Travel": "from-blue-200/80 to-cyan-100/80 dark:from-blue-900/40 dark:to-cyan-900/30",
  "Dining": "from-orange-200/80 to-red-100/80 dark:from-orange-900/40 dark:to-red-900/30",
  "Intimacy": "from-pink-200/80 to-fuchsia-100/80 dark:from-pink-900/40 dark:to-fuchsia-900/30",
  "Experiences": "from-violet-200/80 to-purple-100/80 dark:from-violet-900/40 dark:to-purple-900/30",
};

const SuggestedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("general");
  const { toggleLike, isLikedByMe, isLikedByPartner, isMutualLike } = useContentLikes("product");

  const fetchProducts = async (category: string, force = false) => {
    const cacheKey = `${CACHE_KEY}-${category}`;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { products: cachedProducts, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL && cachedProducts?.length) {
            setProducts(cachedProducts);
            setHasLoaded(true);
            return;
          }
        } catch {}
      }
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("suggest-products", {
        body: { category },
      });
      if (error) throw error;
      if (data?.products?.length) {
        setProducts(data.products);
        localStorage.setItem(cacheKey, JSON.stringify({ products: data.products, timestamp: Date.now() }));
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      if (!products.length) {
        setProducts([
          { name: "Date Night Box", brand: "Cosy Couple Co.", price: "£34.99", description: "Everything you need for the perfect night in", category: "Date Night", emoji: "🕯️", affiliateTag: "date-night-box", imageHint: "candle gift box", productUrl: "https://www.amazon.co.uk/s?k=date+night+box+couples" },
          { name: "Couple's Journal", brand: "Papier", price: "£22.00", description: "365 prompts to deepen your connection", category: "Stationery", emoji: "📔", affiliateTag: "couples-journal", imageHint: "couples journal book", productUrl: "https://www.amazon.co.uk/s?k=couples+journal" },
          { name: "Massage Oil Set", brand: "Neal's Yard", price: "£28.00", description: "Organic aromatherapy oils for two", category: "Wellness", emoji: "💆", affiliateTag: "massage-set", imageHint: "massage oil bottles", productUrl: "https://www.amazon.co.uk/s?k=massage+oil+set+couples" },
          { name: "Adventure Scratch Map", brand: "Luckies", price: "£19.99", description: "Track your travels together worldwide", category: "Travel", emoji: "🗺️", affiliateTag: "scratch-map", imageHint: "scratch world map", productUrl: "https://www.amazon.co.uk/s?k=scratch+map+couples" },
        ]);
      }
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => { fetchProducts(activeCategory); }, []);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    
    fetchProducts(cat);
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
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Picked for You</h3>
            <p className="text-[10px] text-muted-foreground">AI-curated couple gifts & experiences</p>
          </div>
        </div>
        <button onClick={() => fetchProducts(activeCategory, true)} disabled={loading} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Category tabs */}
      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategoryChange(cat.key)}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div className="px-3 pb-3 grid grid-cols-2 gap-2">
        {(loading && !products.length
          ? Array.from({ length: 4 })
          : products.slice(0, 4)
        ).map((product, i) => {
          const p = product as Product | undefined;
          const gradient = p ? (categoryGradients[p.category] || categoryGradients["Experiences"]) : "";

          return (
            <motion.button
              key={p ? p.affiliateTag : i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                if (p?.productUrl) {
                  window.open(p.productUrl, "_blank", "noopener,noreferrer");
                }
              }}
              className="group rounded-xl bg-secondary/50 hover:bg-secondary overflow-hidden text-left transition-all hover:shadow-sm"
            >
              {p ? (
                <>
                  {/* Product visual */}
                  <div className={`relative w-full aspect-square overflow-hidden bg-gradient-to-br ${gradient}`}>
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={`https://loremflickr.com/400/400/${encodeURIComponent(p.imageHint || p.name)}`}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = "none";
                          img.parentElement?.querySelector('.emoji-fallback')?.classList.remove('hidden');
                        }}
                      />
                      <span className="emoji-fallback hidden text-5xl drop-shadow-sm absolute">{p.emoji}</span>
                    </div>
                    <div className="absolute top-1.5 right-1.5">
                      <ExternalLink className="w-3 h-3 text-white/70 drop-shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="absolute bottom-1.5 left-1.5">
                      <span className="text-[9px] bg-background/80 backdrop-blur-sm text-foreground px-1.5 py-0.5 rounded-full font-medium">{p.category}</span>
                    </div>
                  </div>
                  {/* Product info */}
                  <div className="p-2.5 flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.brand}</p>
                      <p className="text-xs font-bold text-primary mt-1">{p.price}</p>
                    </div>
                    <LikeButton
                      liked={isLikedByMe(p.affiliateTag)}
                      partnerLiked={isLikedByPartner(p.affiliateTag)}
                      mutual={isMutualLike(p.affiliateTag)}
                      onToggle={() => toggleLike(p.affiliateTag, p.name)}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2 animate-pulse p-3">
                  <div className="w-full aspect-square bg-muted rounded-lg" />
                  <div className="w-3/4 h-3 bg-muted rounded" />
                  <div className="w-1/2 h-2 bg-muted rounded" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="px-4 pb-2.5 flex items-center gap-1">
        <ShoppingBag className="w-2.5 h-2.5 text-muted-foreground/50" />
        <p className="text-[9px] text-muted-foreground/50">Sponsored · Curated for couples</p>
      </div>
    </motion.div>
  );
};

export default SuggestedProducts;
