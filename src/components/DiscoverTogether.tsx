import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ShoppingBag, Star, X, Sparkles, Wine, Gift, Flower2, Flame, Home, Heart as HeartIcon, CreditCard, Loader2, ChevronLeft, ChevronRight, Ruler, Package, Shirt, Info, TrendingUp } from "lucide-react";

import { apiInvoke, authHeaders } from "@/lib/api";
import { useContentLikes } from "@/hooks/useContentLikes";
import LikeButton from "@/components/LikeButton";

interface ProductSizing {
  type: string;
  options: string[];
  guide?: string;
}

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
  images?: string[];
  source: string;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  sizing?: ProductSizing | null;
  materials?: string | null;
  dimensions?: string | null;
  whatsIncluded?: string[] | null;
  careInstructions?: string | null;
}

type ShopCategory = "all" | "date-night" | "gifts" | "wellness" | "intimacy" | "home";

interface CategoryDef { key: ShopCategory; label: string; icon: typeof Sparkles; }

const CATEGORIES: CategoryDef[] = [
  { key: "all", label: "Bestsellers", icon: TrendingUp },
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

const CACHE_KEY = "discover_catalog_v6";
const CACHE_TTL = 1000 * 60 * 120;

const BRAND_GRADIENTS: Record<string, string> = {
  "coco de mer": "from-stone-950 via-stone-900 to-stone-800",
  "agent provocateur": "from-pink-950 via-stone-900 to-stone-950",
  "goop": "from-stone-100 via-stone-50 to-white",
  "space nk": "from-stone-800 via-stone-700 to-stone-600",
  "sophie & olivia": "from-rose-950 via-stone-900 to-stone-950",
  "lelo": "from-stone-950 via-stone-900 to-stone-800",
  "lovehoney": "from-purple-950 via-stone-900 to-stone-950",
  "jo malone": "from-stone-100 via-amber-50 to-stone-50",
  "le creuset": "from-red-950 via-orange-900 to-red-800",
  "diptyque": "from-stone-900 via-stone-800 to-stone-700",
  "the white company": "from-stone-100 via-white to-stone-50",
  "our place": "from-stone-800 via-teal-900 to-stone-900",
  "piglet in bed": "from-pink-100 via-stone-50 to-pink-50",
  "neom": "from-emerald-900 via-stone-800 to-emerald-950",
  "the school of life": "from-yellow-900 via-amber-800 to-stone-900",
  "aged & charred": "from-amber-950 via-stone-900 to-stone-950",
  "under lucky stars": "from-indigo-950 via-stone-900 to-indigo-900",
};

const getBrandGradient = (brand: string) => {
  const b = brand.toLowerCase();
  for (const [key, val] of Object.entries(BRAND_GRADIENTS)) {
    if (b.includes(key)) return val;
  }
  return "from-stone-900 via-stone-800 to-stone-700";
};

const isLightBrand = (brand: string) => {
  const b = brand.toLowerCase();
  return b.includes("goop") || b.includes("jo malone") || b.includes("white company") || b.includes("piglet in bed");
};

const ProductImage = ({ product, index = 0 }: { product: ShopProduct; index?: number }) => {
  const [failed, setFailed] = useState(false);
  const gradient = getBrandGradient(product.brand);
  const lightBrand = isLightBrand(product.brand);
  const images = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const src = images[index] || product.imageUrl;

  if (src && !failed) {
    return (
      <img
        src={src}
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

const ImageCarousel = ({ product }: { product: ShopProduct }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const images = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const gradient = getBrandGradient(product.brand);
  const lightBrand = isLightBrand(product.brand);
  const validImages = images.filter((_, i) => !failedIndices.has(i));

  const handleImageError = (idx: number) => {
    const updated = new Set(failedIndices).add(idx);
    setFailedIndices(updated);
    if (idx === currentIndex) {
      const nextValid = images.findIndex((_, i) => i !== idx && !updated.has(i));
      if (nextValid !== -1) setCurrentIndex(nextValid);
    }
  };

  if (validImages.length === 0) {
    return (
      <div className={`w-full aspect-[3/2] bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-4`}>
        <p className={`text-[10px] uppercase tracking-[0.25em] ${lightBrand ? "text-stone-400" : "text-white/40"} mb-2`}>{product.brand}</p>
        <p className={`text-sm font-medium ${lightBrand ? "text-stone-700" : "text-white/80"} text-center leading-snug max-w-[80%]`}>{product.name}</p>
        <p className={`text-[13px] font-semibold ${lightBrand ? "text-stone-900" : "text-white/90"} mt-2`}>{product.price}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[3/2] overflow-hidden bg-stone-100 dark:bg-stone-900">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`${product.name} - Image ${currentIndex + 1}`}
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onError={() => handleImageError(currentIndex)}
          data-testid={`product-carousel-image-${currentIndex}`}
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => Math.max(0, i - 1)); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center"
              data-testid="carousel-prev"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {currentIndex < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => Math.min(images.length - 1, i + 1)); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center"
              data-testid="carousel-next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? "bg-white w-4" : "bg-white/40"}`}
                data-testid={`carousel-dot-${i}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const DetailSection = ({ icon: Icon, title, children, defaultOpen = false }: { icon: typeof Ruler; title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-sm font-medium text-foreground"
        data-testid={`section-toggle-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <span className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {title}
        </span>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
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
  onCheckout: (size?: string | null) => void;
  checkoutLoading?: boolean;
}) => {
  const hasPrice = !!product.stripePriceId;
  const hasSizing = product.sizing && product.sizing.options.length > 0;
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

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
        <div className="relative rounded-t-3xl overflow-hidden">
          <ImageCarousel product={product} />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center z-10"
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

          {hasSizing && (
            <div className="mt-5">
              <p className="text-xs font-medium text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5" />
                {product.sizing!.type === "shade" ? "Shade" : product.sizing!.type === "bra" || product.sizing!.type === "clothing" || product.sizing!.type === "corset" || product.sizing!.type === "hosiery" ? "Size" : "Size / Volume"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.sizing!.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedSize(selectedSize === opt ? null : opt)}
                    className={`px-2.5 py-1 rounded-lg text-[12px] font-medium border transition-all ${
                      selectedSize === opt
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-foreground/70 border-border/60 hover:border-foreground/40"
                    }`}
                    data-testid={`size-option-${opt}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {product.sizing!.guide && (
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{product.sizing!.guide}</p>
              )}
            </div>
          )}

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

          <div className="mt-4 space-y-0">
            {product.whatsIncluded && product.whatsIncluded.length > 0 && (
              <DetailSection icon={Package} title="What's Included" defaultOpen>
                <ul className="space-y-1">
                  {product.whatsIncluded.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-foreground/70">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}

            {product.materials && (
              <DetailSection icon={Shirt} title="Materials">
                <p className="text-[13px] text-foreground/70 leading-relaxed">{product.materials}</p>
                {product.dimensions && (
                  <p className="text-[13px] text-foreground/70 mt-1.5">
                    <span className="text-foreground/50">Dimensions:</span> {product.dimensions}
                  </p>
                )}
              </DetailSection>
            )}

            {product.careInstructions && (
              <DetailSection icon={Info} title="Care Instructions">
                <p className="text-[13px] text-foreground/70 leading-relaxed">{product.careInstructions}</p>
              </DetailSection>
            )}
          </div>

          <div className="mt-6 space-y-2.5 pb-4">
            <button
              onClick={() => onCheckout(selectedSize)}
              disabled={checkoutLoading || !hasPrice || (hasSizing && !selectedSize)}
              className="w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all bg-foreground text-background disabled:opacity-60"
              data-testid="button-stripe-checkout"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              {checkoutLoading
                ? "Processing..."
                : !hasPrice
                ? "Coming Soon"
                : hasSizing && !selectedSize
                ? "Select a size"
                : `Buy Now — ${product.price}`}
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

  const handleStripeCheckout = useCallback(async (product: ShopProduct, size?: string | null) => {
    if (!product.stripePriceId) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          priceId: product.stripePriceId,
          productName: `${product.brand} — ${product.name}`,
          size: size || undefined,
        }),
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
    let hadCache = false;
    if (!force) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data, ts } = JSON.parse(raw);
          if (data?.length > 0) {
            setProducts(data);
            setLoaded(true);
            hadCache = true;
            if (Date.now() - ts < CACHE_TTL) return;
          }
        }
      } catch {}
    }

    if (!hadCache) setLoading(true);
    try {
      const { data } = await apiInvoke<{ products: ShopProduct[] }>("shop/curated", { method: "GET" });
      const fetched = data?.products || [];
      if (fetched.length > 0) {
        setProducts(fetched);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: fetched, ts: Date.now() }));
        } catch {}
      }
    } catch (err) {
      console.error("Shop fetch error:", err);
    } finally {
      setLoaded(true);
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
    ? (() => {
        const cats = ["intimacy", "wellness", "gifts", "date-night", "home"] as ShopCategory[];
        const picks: typeof products = [];
        const perCat = Math.max(2, Math.ceil(12 / cats.length));
        for (const c of cats) {
          const catProducts = products.filter(p => mapCategory(p.category) === c);
          picks.push(...catProducts.slice(0, perCat));
        }
        const uncategorised = products.filter(p => !picks.some(pk => pk.id === p.id));
        const remaining = 12 - picks.length;
        if (remaining > 0) picks.push(...uncategorised.slice(0, remaining));
        return picks.slice(0, 12);
      })()
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
            onCheckout={(size) => handleStripeCheckout(selectedProduct, size)}
            checkoutLoading={checkoutLoading}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DiscoverTogether;
