import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, RefreshCw, ShoppingBag, Heart, Star, ExternalLink, X, ChevronRight, Sparkles, Filter, Wine, Gift, Flower2, Flame, Gamepad2, Home } from "lucide-react";
import { apiInvoke } from "@/lib/api";
import { useContentLikes } from "@/hooks/useContentLikes";
import LikeButton from "@/components/LikeButton";
import BottomNav from "@/components/BottomNav";

const AMAZON_TAG = "woodybruce-21";

interface ShopProduct {
  id: string;
  name: string;
  brand: string;
  price: string;
  originalPrice?: string;
  description: string;
  longDescription: string;
  features: string[];
  category: string;
  emoji: string;
  imageKeyword: string;
  imageUrl?: string | null;
  buyUrl: string;
  source: string;
}

type ShopCategory = "all" | "date-night" | "gifts" | "wellness" | "intimacy" | "games" | "home";

const CATEGORY_TO_LABEL: Record<ShopCategory, string> = {
  "all": "Mix of categories: Date Night, Gifts, Wellness, Intimacy, Games, Home",
  "date-night": "Date Night",
  "gifts": "Gifts",
  "wellness": "Wellness",
  "intimacy": "Intimacy",
  "games": "Games",
  "home": "Home",
};

interface CategoryDef { key: ShopCategory; label: string; icon: typeof Sparkles; }

const CATEGORIES: CategoryDef[] = [
  { key: "all", label: "For You", icon: Sparkles },
  { key: "date-night", label: "Date Night", icon: Wine },
  { key: "gifts", label: "Gifts", icon: Gift },
  { key: "wellness", label: "Wellness", icon: Flower2 },
  { key: "intimacy", label: "Intimacy", icon: Flame },
  { key: "games", label: "Games", icon: Gamepad2 },
  { key: "home", label: "Home", icon: Home },
];

const CACHE_KEY = "shop_catalog_v3";
const CACHE_TTL = 1000 * 60 * 30;

const CATEGORY_GRADIENTS: Record<string, string> = {
  "date night": "from-rose-900/80 via-pink-800/60 to-amber-900/40",
  "gifts": "from-violet-900/80 via-purple-800/60 to-pink-900/40",
  "wellness": "from-emerald-900/80 via-teal-800/60 to-cyan-900/40",
  "intimacy": "from-red-900/80 via-rose-800/60 to-pink-900/40",
  "games": "from-blue-900/80 via-indigo-800/60 to-violet-900/40",
  "home": "from-amber-900/80 via-orange-800/60 to-yellow-900/40",
};

const CATEGORY_ICONS: Record<string, typeof Wine> = {
  "date night": Wine,
  "gifts": Gift,
  "wellness": Flower2,
  "intimacy": Flame,
  "games": Gamepad2,
  "home": Home,
};

const getCategoryGradient = (cat: string) => {
  const key = cat.toLowerCase();
  return CATEGORY_GRADIENTS[key] || "from-slate-900/80 via-gray-800/60 to-zinc-900/40";
};

const ProductImage = ({ category, brand, imageUrl }: { category: string; brand: string; imageUrl?: string | null }) => {
  const [failed, setFailed] = useState(false);
  const catKey = category.toLowerCase();
  const Icon = CATEGORY_ICONS[catKey] || ShoppingBag;
  const gradient = getCategoryGradient(category);
  const initials = brand.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={brand}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
        data-testid="product-image"
      />
    );
  }

  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-4 relative`}>
      <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
        <Icon className="w-4 h-4 text-white/70" />
      </div>
      <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-2">
        <span className="text-lg font-bold text-white/90">{initials}</span>
      </div>
      <p className="text-[10px] text-white/50 text-center line-clamp-1 max-w-[90%]">{brand}</p>
    </div>
  );
};

const openBuyLink = (url: string) => {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const ProductDetailModal = ({
  product,
  onClose,
  liked,
  partnerLiked,
  mutual,
  onToggleLike,
}: {
  product: ShopProduct;
  onClose: () => void;
  liked: boolean;
  partnerLiked: boolean;
  mutual: boolean;
  onToggleLike: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-lg bg-background rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <div className="w-full h-72 overflow-hidden rounded-t-3xl sm:rounded-t-3xl">
            <ProductImage category={product.category} brand={product.brand} imageUrl={product.imageUrl} />
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center"
            data-testid="close-product-detail"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-4 left-4 right-4">
            <span className="text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">{product.category}</span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground leading-tight">{product.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{product.brand}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-bold text-primary">{product.price}</p>
              {product.originalPrice && (
                <p className="text-xs text-muted-foreground line-through">{product.originalPrice}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-3.5 h-3.5 ${i <= 4 ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
              ))}
              <span className="text-xs text-muted-foreground ml-1">4.0+</span>
            </div>
            <LikeButton liked={liked} partnerLiked={partnerLiked} mutual={mutual} onToggle={onToggleLike} size="sm" />
          </div>

          <p className="text-sm text-foreground/80 mt-4 leading-relaxed">{product.longDescription}</p>

          {product.features.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Highlights</h3>
              <div className="space-y-1.5">
                {product.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-foreground/70">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2.5 pb-4">
            <button
              onClick={() => openBuyLink(product.buyUrl)}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              data-testid="buy-now-button"
            >
              <ShoppingBag className="w-4 h-4" />
              Buy Now — {product.price}
            </button>
            <p className="text-[10px] text-center text-muted-foreground/60">
              Opens in your browser • Sold by {product.source}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Shop = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<ShopCategory>("all");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set());

  const { toggleLike, isLikedByMe, isLikedByPartner, isMutualLike } = useContentLikes("shop");

  const getCached = useCallback((cat: string) => {
    try {
      const raw = localStorage.getItem(`${CACHE_KEY}_${cat}`);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return null;
      return data as ShopProduct[];
    } catch { return null; }
  }, []);

  const setCache = useCallback((cat: string, data: ShopProduct[]) => {
    try {
      localStorage.setItem(`${CACHE_KEY}_${cat}`, JSON.stringify({ data, ts: Date.now() }));
    } catch {}
  }, []);

  const fetchProducts = useCallback(async (cat: ShopCategory, force = false) => {
    if (!force) {
      const cached = getCached(cat);
      if (cached) {
        setProducts(prev => {
          const existing = new Set(prev.map(p => p.id));
          const newItems = cached.filter((p: ShopProduct) => !existing.has(p.id));
          return [...prev, ...newItems];
        });
        setLoadedCategories(prev => new Set([...prev, cat]));
        return;
      }
    }

    setLoading(true);
    try {
      const { data, error } = await apiInvoke<{ products: ShopProduct[] }>("shop/generate", {
        body: { category: CATEGORY_TO_LABEL[cat] || cat },
      });
      if (data?.products) {
        setCache(cat, data.products);
        setProducts(prev => {
          const existing = new Set(prev.map(p => p.id));
          const newItems = data.products.filter(p => !existing.has(p.id));
          return [...prev, ...newItems];
        });
        setLoadedCategories(prev => new Set([...prev, cat]));
      }
    } catch (err) {
      console.error("Shop fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [getCached, setCache]);

  useEffect(() => {
    if (!loadedCategories.has(category)) {
      fetchProducts(category);
    }
  }, [category, loadedCategories, fetchProducts]);

  const filteredProducts = category === "all"
    ? products
    : products.filter(p => p.category.toLowerCase().replace(/\s+/g, "-") === category);

  const handleRefresh = () => {
    try { localStorage.removeItem(`${CACHE_KEY}_${category}`); } catch {}
    setProducts(prev => prev.filter(p => p.category.toLowerCase().replace(/\s+/g, "-") !== category));
    setLoadedCategories(prev => {
      const next = new Set(prev);
      next.delete(category);
      return next;
    });
    fetchProducts(category, true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50 safe-area-top">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-secondary/50 transition-colors" data-testid="shop-back">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">Shop</h1>
              <p className="text-[11px] text-muted-foreground">AI-curated picks for you both</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-secondary/50 transition-colors"
              data-testid="shop-refresh"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    category === cat.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                  }`}
                  data-testid={`shop-cat-${cat.key}`}
                >
                  <Icon className="w-3 h-3" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-4">
          {loading && filteredProducts.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-secondary/50 overflow-hidden animate-pulse">
                  <div className="w-full aspect-square bg-muted" />
                  <div className="p-3 space-y-2">
                    <div className="w-3/4 h-3 bg-muted rounded" />
                    <div className="w-1/2 h-2.5 bg-muted rounded" />
                    <div className="w-1/3 h-4 bg-muted rounded mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No products yet</p>
              <button onClick={handleRefresh} className="mt-3 text-xs text-primary font-medium" data-testid="shop-load">
                Load suggestions
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map((product, i) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedProduct(product)}
                      className="rounded-2xl bg-secondary/40 overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
                      data-testid={`shop-product-${product.id}`}
                    >
                      <div className="relative w-full aspect-square overflow-hidden">
                        <ProductImage category={product.category} brand={product.brand} imageUrl={product.imageUrl} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute top-2 right-2">
                          <LikeButton
                            liked={isLikedByMe(product.id)}
                            partnerLiked={isLikedByPartner(product.id)}
                            mutual={isMutualLike(product.id)}
                            onToggle={() => toggleLike(product.id, product.name)}
                            size="sm"
                          />
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <span className="text-[9px] bg-background/80 backdrop-blur-sm text-foreground px-1.5 py-0.5 rounded-full font-medium">
                            {product.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{product.brand}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm font-bold text-primary">{product.price}</p>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                  <span className="text-xs text-muted-foreground ml-2">Finding more...</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="h-24" />
      </div>

      <BottomNav />

      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            liked={isLikedByMe(selectedProduct.id)}
            partnerLiked={isLikedByPartner(selectedProduct.id)}
            mutual={isMutualLike(selectedProduct.id)}
            onToggleLike={() => toggleLike(selectedProduct.id, selectedProduct.name)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Shop;
