import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, RefreshCw, Sparkles } from "lucide-react";
import { apiInvoke } from "@/lib/api";
import { useContentLikes } from "@/hooks/useContentLikes";
import LikeButton from "@/components/LikeButton";

const ProductImage = ({ categoryImageUrl, emoji, name }: { categoryImageUrl?: string; emoji: string; name: string }) => {
  const [failed, setFailed] = useState(false);

  if (!categoryImageUrl || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary/60">
        <span className="text-5xl drop-shadow-sm">{emoji}</span>
      </div>
    );
  }

  return (
    <img
      src={categoryImageUrl}
      alt={name}
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

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

// Reliable Unsplash images by category keyword
const categoryImages: Record<string, string> = {
  "Date Night": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop",
  "Stationery": "https://images.unsplash.com/photo-1497942304796-b8bc2cc898f3?w=400&h=400&fit=crop",
  "Wellness": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
  "Travel": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=400&fit=crop",
  "Dining": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop",
  "Intimacy": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=400&fit=crop",
  "Experiences": "https://images.unsplash.com/photo-1529543544282-ea57407bc2f3?w=400&h=400&fit=crop",
  "Games": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400&h=400&fit=crop",
  "Home": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop",
  "Books": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop",
  "general": "https://images.unsplash.com/photo-1529543544282-ea57407bc2f3?w=400&h=400&fit=crop",
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
      const { data, error } = await apiInvoke("suggest-products", {
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

  useEffect(() => {
    // Clear old caches that may have stale data
    CATEGORIES.forEach(c => localStorage.removeItem(`${CACHE_KEY}-${c.key}`));
    fetchProducts(activeCategory, true);
  }, []);

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

      {/* Products — horizontal scroll */}
      <div className="pb-1">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-3 pb-2">
          {(loading && !products.length
            ? Array.from({ length: 4 })
            : products.slice(0, 6)
          ).map((product, i) => {
            const p = product as Product | undefined;
            const categoryImg = p ? (categoryImages[p.category] || categoryImages["Experiences"]) : undefined;

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
                className="group flex-shrink-0 w-40 rounded-xl bg-secondary/50 hover:bg-secondary overflow-hidden text-left transition-all hover:shadow-sm"
              >
                {p ? (
                  <>
                    {/* Product visual */}
                    <div className="relative w-full h-36 overflow-hidden">
                      <ProductImage categoryImageUrl={categoryImg} emoji={p.emoji} name={p.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <div className="absolute bottom-1.5 left-1.5">
                        <span className="text-[9px] bg-background/80 backdrop-blur-sm text-foreground px-1.5 py-0.5 rounded-full font-medium">{p.category}</span>
                      </div>
                    </div>
                    {/* Product info */}
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.brand}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs font-bold text-primary">{p.price}</p>
                        <LikeButton
                          liked={isLikedByMe(p.affiliateTag)}
                          partnerLiked={isLikedByPartner(p.affiliateTag)}
                          mutual={isMutualLike(p.affiliateTag)}
                          onToggle={() => toggleLike(p.affiliateTag, p.name)}
                        />
                      </div>
                      {/* Amazon CTA */}
                      <div
                        className="mt-2 flex items-center justify-center gap-1 bg-[#FF9900] hover:bg-[#e88b00] text-white text-[10px] font-semibold py-1.5 rounded-lg transition-colors"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>View on Amazon</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 animate-pulse p-3">
                    <div className="w-full h-36 bg-muted rounded-lg" />
                    <div className="w-3/4 h-3 bg-muted rounded" />
                    <div className="w-1/2 h-2 bg-muted rounded" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-2.5 flex items-center gap-1">
        <ShoppingBag className="w-2.5 h-2.5 text-muted-foreground/50" />
        <p className="text-[9px] text-muted-foreground/50">Sponsored · Curated for couples</p>
      </div>
    </motion.div>
  );
};

export default SuggestedProducts;
