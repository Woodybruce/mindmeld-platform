import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ShoppingBag, Star, X, Sparkles, Wine, Gift, Flower2, Flame, Home, Heart as HeartIcon, CreditCard, Loader2 } from "lucide-react";

import { apiInvoke } from "@/lib/api";
import { useContentLikes } from "@/hooks/useContentLikes";
import LikeButton from "@/components/LikeButton";

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
  source: string;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
}

type ShopCategory = "all" | "date-night" | "gifts" | "wellness" | "intimacy" | "home";

interface CategoryDef { key: ShopCategory; label: string; icon: typeof Sparkles; }

const CATEGORIES: CategoryDef[] = [
  { key: "all", label: "All", icon: HeartIcon },
  { key: "intimacy", label: "Intimacy", icon: Flame },
  { key: "wellness", label: "Wellness", icon: Flower2 },
  { key: "gifts", label: "Gifts", icon: Gift },
  { key: "date-night", label: "Date Night", icon: Wine },
  { key: "home", label: "Home", icon: Home },
];

const CATEGORY_MAP: Record<string, ShopCategory> = {
  "intimacy": "intimacy",
  "wellness": "wellness",
  "gifts": "gifts",
  "date night": "date-night",
  "home": "home",
};

const CACHE_KEY = "discover_catalog_v4";
const CACHE_TTL = 1000 * 60 * 30;

const BRAND_GRADIENTS: Record<string, string> = {
  "coco de mer": "from-stone-950 via-stone-900 to-stone-800",
  "agent provocateur": "from-pink-950 via-stone-900 to-stone-950",
  "goop": "from-stone-100 via-stone-50 to-white",
  "space nk": "from-stone-800 via-stone-700 to-stone-600",
  "sophie & olivia": "from-rose-950 via-stone-900 to-stone-950",
  "lelo": "from-stone-950 via-stone-900 to-stone-800",
  "lovehoney": "from-purple-950 via-stone-900 to-stone-950",
};

const getBrandGradient = (brand: string) => {
  const b = brand.toLowerCase();
  for (const [key, val] of Object.entries(BRAND_GRADIENTS)) {
    if (b.includes(key)) return val;
  }
  return "from-stone-900 via-stone-800 to-stone-700";
};

const isGoopBrand = (brand: string) => brand.toLowerCase().includes("goop");

const ProductImage = ({ product }: { product: ShopProduct }) => {
  const [failed, setFailed] = useState(false);
  const gradient = getBrandGradient(product.brand);
  const lightBrand = isGoopBrand(product.brand);

  if (product.imageUrl && !failed) {
    return (
      <img
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
        data-testid="product-image"
      />
    );
  }

  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-4`}>
      <p className={`text-[10px] uppercase tracking-[0.25em] ${lightBrand ? "text-stone-400" : "text-white/40"} mb-2`}>{product.brand}</p>
      <p className={`text-sm font-medium ${lightBrand ? "text-stone-700" : "text-white/80"} text-center leading-snug max-w-[80%]`}>{product.name}</p>
      <p className={`text-[13px] font-semibold ${lightBrand ? "text-stone-900" : "text-white/90"} mt-2`}>{product.price}</p>
    </div>
  );
};

const ProductDetailModal = ({
  product,
  onClose,
  liked,
  partnerLiked,
  mutual,
  onToggleLike,
  onCheckout,
  checkoutLoading,
}: {
  product: ShopProduct;
  onClose: () => void;
  liked: boolean;
  partnerLiked: boolean;
  mutual: boolean;
  onToggleLike: () => void;
  onCheckout: () => void;
  checkoutLoading?: boolean;
}) => {
  const hasPrice = !!product.stripePriceId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-lg bg-background rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <div className="w-full aspect-[3/2] overflow-hidden rounded-t-3xl sm:rounded-t-3xl bg-stone-100">
            <ProductImage product={product} />
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center"
            data-testid="close-product-detail"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">{product.brand}</p>
              <h2 className="text-lg font-semibold text-foreground leading-tight mt-0.5">{product.name}</h2>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-semibold text-foreground">{product.price}</p>
              {product.originalPrice && (
                <p className="text-xs text-muted-foreground line-through">{product.originalPrice}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-3 h-3 ${i <= 4 ? "text-foreground fill-foreground" : "text-muted-foreground/20"}`} />
              ))}
              <span className="text-[11px] text-muted-foreground ml-1.5">4.0+</span>
            </div>
            <LikeButton liked={liked} partnerLiked={partnerLiked} mutual={mutual} onToggle={onToggleLike} size="sm" />
          </div>

          <p className="text-sm text-foreground/80 mt-4 leading-relaxed">{product.longDescription}</p>

          {product.features.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border/50">
              <div className="grid grid-cols-2 gap-2">
                {product.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-foreground/40 mt-2 flex-shrink-0" />
                    <p className="text-[13px] text-foreground/60">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2.5 pb-4">
            <button
              onClick={onCheckout}
              disabled={checkoutLoading || !hasPrice}
              className="w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all bg-foreground text-background disabled:opacity-60"
              data-testid="button-stripe-checkout"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              {checkoutLoading ? "Processing..." : hasPrice ? `Buy Now — ${product.price}` : "Coming Soon"}
            </button>
            <p className="text-[11px] text-center text-muted-foreground/50 uppercase tracking-wider">
              {hasPrice ? "Secure checkout · Apple Pay · Google Pay" : ""}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const DiscoverTogether = () => {
  const [category, setCategory] = useState<ShopCategory>("all");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { toggleLike, isLikedByMe, isLikedByPartner, isMutualLike } = useContentLikes("shop");

  const handleStripeCheckout = useCallback(async (product: ShopProduct) => {
    if (!product.stripePriceId) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: product.stripePriceId, productName: `${product.brand} — ${product.name}` }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Checkout failed");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert(err.message || "Something went wrong. Please try again.");
      setCheckoutLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async (force = false) => {
    if (!force) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data, ts } = JSON.parse(raw);
          if (Date.now() - ts < CACHE_TTL && data?.length > 0) {
            setProducts(data);
            setLoaded(true);
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    try {
      const { data } = await apiInvoke<{ products: ShopProduct[] }>("shop/curated", { method: "GET" });
      const fetched = data?.products || [];
      if (fetched.length > 0) {
        setProducts(fetched);
        setLoaded(true);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: fetched, ts: Date.now() }));
        } catch {}
      }
    } catch (err) {
      console.error("Shop fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loaded) fetchProducts();
  }, [loaded, fetchProducts]);

  const mapCategory = (cat: string): ShopCategory => {
    const lower = cat.toLowerCase().trim();
    return CATEGORY_MAP[lower] || "all";
  };

  const filteredProducts = category === "all"
    ? products
    : products.filter(p => mapCategory(p.category) === category);

  const handleRefresh = () => {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    setLoaded(false);
    setProducts([]);
    fetchProducts(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-foreground tracking-tight">Shop</h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">Curated luxury for couples</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          data-testid="refresh-discover"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="px-3 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`text-[13px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all border ${
              category === cat.key
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border/50 hover:border-foreground/30 hover:text-foreground"
            }`}
            data-testid={`tab-${cat.key}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="pb-4 overflow-x-auto scrollbar-hide">
        {loading && filteredProducts.length === 0 ? (
          <div className="px-3 grid grid-rows-2 grid-flow-col auto-cols-[140px] gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-stone-100 dark:bg-stone-900 overflow-hidden animate-pulse">
                <div className="w-full aspect-[3/4]" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="px-3 flex flex-col items-center justify-center py-8">
            <ShoppingBag className="w-6 h-6 text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">No products in this category</p>
          </div>
        ) : (
          <div className="px-3 grid grid-rows-2 grid-flow-col auto-cols-[140px] gap-1.5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="rounded-lg overflow-hidden cursor-pointer active:scale-[0.97] transition-transform bg-stone-50 dark:bg-stone-900/50"
                data-testid={`discover-product-${product.id}`}
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden">
                  <ProductImage product={product} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute top-1.5 right-1.5">
                    <LikeButton
                      liked={isLikedByMe(product.id)}
                      partnerLiked={isLikedByPartner(product.id)}
                      mutual={isMutualLike(product.id)}
                      onToggle={() => toggleLike(product.id, product.name)}
                      size="sm"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-1.5">
                    <p className="text-[8px] uppercase tracking-[0.15em] text-white/60 font-medium truncate">{product.brand}</p>
                    <p className="text-[11px] font-medium text-white leading-tight mt-0.5 line-clamp-1">{product.name}</p>
                    <p className="text-[11px] font-semibold text-white mt-0.5">{product.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && filteredProducts.length > 0 && (
          <div className="flex items-center justify-center py-2">
            <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />
            <span className="text-[11px] text-muted-foreground ml-1.5">Loading...</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            liked={isLikedByMe(selectedProduct.id)}
            partnerLiked={isLikedByPartner(selectedProduct.id)}
            mutual={isMutualLike(selectedProduct.id)}
            onToggleLike={() => toggleLike(selectedProduct.id, selectedProduct.name)}
            onCheckout={() => handleStripeCheckout(selectedProduct)}
            checkoutLoading={checkoutLoading}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DiscoverTogether;
