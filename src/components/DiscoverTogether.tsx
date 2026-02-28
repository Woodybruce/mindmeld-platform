import { useState, useEffect, useCallback } from "react";

const AMAZON_TAG = "woodybruce-21";
const CJ_PID = "7540258";

const withAffiliateTag = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.hostname.includes("amazon.co.uk") || u.hostname.includes("amazon.com")) {
      u.searchParams.set("tag", AMAZON_TAG);
      return u.toString();
    }
    if (u.hostname.includes("booking.com")) {
      u.searchParams.set("affiliate_id", CJ_PID);
      if (!u.searchParams.has("aid")) u.searchParams.set("aid", "356980");
      return u.toString();
    }
    return url;
  } catch {}
  return undefined;
};

const amazonSearch = (name: string): string =>
  `https://www.amazon.co.uk/s?k=${encodeURIComponent(name)}&tag=${AMAZON_TAG}`;

const getLink = (url?: string, name?: string): string =>
  withAffiliateTag(url) || amazonSearch(name || "couples gift");
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ExternalLink, Sparkles, ShoppingBag, MapPin, Heart, Plane, ShoppingCart } from "lucide-react";
import { apiInvoke } from "@/lib/api";
import { useContentLikes } from "@/hooks/useContentLikes";
import LikeButton from "@/components/LikeButton";
import { useShopProducts, type ShopProduct } from "@/hooks/useShopProducts";
import AiSearchBar from "@/components/AiSearchBar";

interface Product { name: string; brand: string; price: string; description: string; category: string; emoji: string; affiliateTag: string; productUrl?: string; }
interface Experience { name: string; venue: string; price: string; description: string; category: string; emoji: string; city: string; bookingUrl?: string; duration: string; }
interface IntimacyItem { name: string; brand: string; price: string; description: string; category: string; emoji: string; affiliateTag: string; productUrl?: string; }
interface TravelItem { name: string; destination: string; country: string; price: string; description: string; category: string; emoji: string; duration: string; bookingUrl?: string; }

type TabKey = "shop" | "experiences" | "products" | "intimacy" | "travel";

interface Tab { key: TabKey; label: string; icon: React.ReactNode; colour: string; }

const TABS: Tab[] = [
  { key: "shop",        label: "Our Shopping List",  icon: <ShoppingCart className="w-3 h-3" />, colour: "from-primary/20 to-us-coral/20" },
  { key: "experiences", label: "Date Night",  icon: <MapPin className="w-3 h-3" />,       colour: "from-us-coral/20 to-us-blush/30" },
  { key: "products",    label: "Gifts",       icon: <ShoppingBag className="w-3 h-3" />,  colour: "from-us-gold/20 to-us-cream/40" },
  { key: "intimacy",    label: "Intimacy",    icon: <Heart className="w-3 h-3" />,         colour: "from-us-blush/30 to-us-coral/10" },
  { key: "travel",      label: "Travel",      icon: <Plane className="w-3 h-3" />,          colour: "from-us-sage/20 to-primary/10" },
];

const PRODUCT_CATEGORIES: Record<string, { key: string; label: string }[]> = {
  products: [
    { key: "general", label: "All" },
    { key: "date night", label: "Date Night" },
    { key: "wellness", label: "Wellness" },
    { key: "games", label: "Games" },
  ],
};

const SHOP_FILTERS = [
  { key: "all", label: "All" },
  { key: "Date Night", label: "Date Night" },
  { key: "Gifts", label: "Gifts" },
  { key: "Wellness", label: "Wellness" },
  { key: "Games", label: "Games" },
  { key: "Intimacy", label: "Intimacy" },
  { key: "Experiences", label: "Experiences" },
];

const CATEGORY_PHOTOS: Record<string, string> = {
  "Date Night": "photo-1414235077428-338989a2e8c0",
  "Wellness": "photo-1544367567-0f2fcb009e0b",
  "Travel": "photo-1488646953014-85cb44e25828",
  "Intimacy": "photo-1518199266791-5375a83190b7",
  "Experiences": "photo-1529543544282-ea57407bc2f3",
  "Games": "photo-1610890716171-6b1bb98ffd09",
  "Home": "photo-1555041469-a586c61ea9bc",
  "Books": "photo-1512820790803-83ca734da794",
  "Stationery": "photo-1497942304796-b8bc2cc898f3",
  "Dining": "photo-1414235077428-338989a2e8c0",
  "Massage": "photo-1544367567-0f2fcb009e0b",
  "Candles": "photo-1602607109874-38f32b456bea",
  "Lingerie": "photo-1518199266791-5375a83190b7",
  "Vibrators": "photo-1518199266791-5375a83190b7",
  "Bath": "photo-1552058544-f2b08422138a",
  "Toys": "photo-1529543544282-ea57407bc2f3",
  "Accessories": "photo-1518199266791-5375a83190b7",
  "Bondage": "photo-1518199266791-5375a83190b7",
};

const getCategoryImage = (category: string) => {
  const photoId = CATEGORY_PHOTOS[category] || CATEGORY_PHOTOS["Experiences"];
  return `https://images.unsplash.com/${photoId}?w=400&h=400&fit=crop&q=80`;
};

const CACHE_TTL = 1000 * 60 * 60;

const CardImage = ({ src, emoji, alt }: { src?: string; emoji: string; alt: string }) => {
  const [failed, setFailed] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => { setCurrentSrc(src); setFailed(false); }, [src]);

  if (!currentSrc || failed) return (
    <div className="w-full h-full flex items-center justify-center bg-secondary/60">
      <span className="text-5xl drop-shadow-sm">{emoji}</span>
    </div>
  );
  return <img src={currentSrc} alt={alt} className="w-full h-full object-cover" loading="lazy" onError={() => setFailed(true)} />;
};

const SkeletonCard = () => (
  <div className="flex-shrink-0 w-40 rounded-xl bg-secondary/50 overflow-hidden animate-pulse">
    <div className="w-full h-36 bg-muted" />
    <div className="p-2.5 space-y-2">
      <div className="w-3/4 h-3 bg-muted rounded" />
      <div className="w-1/2 h-2 bg-muted rounded" />
    </div>
  </div>
);

const DiscoverTogether = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("shop");
  const [productCat, setProductCat] = useState("general");
  const [shopFilter, setShopFilter] = useState("all");

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [intimacy, setIntimacy] = useState<IntimacyItem[]>([]);
  const [travel, setTravel] = useState<TravelItem[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({ shop: false, experiences: false, products: false, intimacy: false, travel: false });
  const [loaded, setLoaded] = useState<Record<string, boolean>>({ shop: true, experiences: false, products: false, intimacy: false, travel: false });

  const { toggleLike, isLikedByMe, isLikedByPartner, isMutualLike } = useContentLikes("discover");
  const { getActiveProducts: getCuratedProducts, loading: shopLoading } = useShopProducts();

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

  const fetchExperiences = useCallback(async (force = false) => {
    const key = "disc-experiences";
    if (!force) { const c = cacheGet(key); if (c) { setExperiences(c); setLoaded(p => ({ ...p, experiences: true })); return; } }
    setLoading(p => ({ ...p, experiences: true }));
    try {
      const { data } = await apiInvoke("suggest-experiences", { body: { city: "London" } });
      if (data?.experiences?.length) { setExperiences(data.experiences); cacheSet(key, data.experiences); }
    } catch (e) { console.error(e); } finally { setLoading(p => ({ ...p, experiences: false })); setLoaded(p => ({ ...p, experiences: true })); }
  }, []);

  const fetchProducts = useCallback(async (cat = "general", force = false) => {
    const key = `disc-products-${cat}`;
    if (!force) { const c = cacheGet(key); if (c) { setProducts(c); setLoaded(p => ({ ...p, products: true })); return; } }
    setLoading(p => ({ ...p, products: true }));
    try {
      const { data } = await apiInvoke("suggest-products", { body: { category: cat } });
      if (data?.products?.length) { setProducts(data.products); cacheSet(key, data.products); }
    } catch (e) { console.error(e); } finally { setLoading(p => ({ ...p, products: false })); setLoaded(p => ({ ...p, products: true })); }
  }, []);

  const fetchIntimacy = useCallback(async (force = false) => {
    const key = "disc-intimacy";
    if (!force) { const c = cacheGet(key); if (c) { setIntimacy(c); setLoaded(p => ({ ...p, intimacy: true })); return; } }
    setLoading(p => ({ ...p, intimacy: true }));
    try {
      const { data } = await apiInvoke("suggest-intimacy", { body: {} });
      if (data?.products?.length) { setIntimacy(data.products); cacheSet(key, data.products); }
    } catch (e) { console.error(e); } finally { setLoading(p => ({ ...p, intimacy: false })); setLoaded(p => ({ ...p, intimacy: true })); }
  }, []);

  const fetchTravel = useCallback(async (force = false) => {
    const key = "disc-travel";
    if (!force) { const c = cacheGet(key); if (c) { setTravel(c); setLoaded(p => ({ ...p, travel: true })); return; } }
    setLoading(p => ({ ...p, travel: true }));
    try {
      const { data } = await apiInvoke("suggest-travel", { body: {} });
      if (data?.destinations?.length) { setTravel(data.destinations); cacheSet(key, data.destinations); }
    } catch (e) { console.error(e); } finally { setLoading(p => ({ ...p, travel: false })); setLoaded(p => ({ ...p, travel: true })); }
  }, []);


  useEffect(() => {
    const v = localStorage.getItem("disc-cache-v");
    if (v !== "2") {
      ["disc-experiences", "disc-intimacy", "disc-travel"].forEach(k => localStorage.removeItem(k));
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("disc-products-")) localStorage.removeItem(k);
      }
      localStorage.setItem("disc-cache-v", "2");
    }
  }, []);
  useEffect(() => { if (activeTab === "experiences" && !loaded.experiences) fetchExperiences(); }, [activeTab]);
  useEffect(() => { if (activeTab === "products" && !loaded.products) fetchProducts(productCat); }, [activeTab]);
  useEffect(() => { if (activeTab === "intimacy" && !loaded.intimacy) fetchIntimacy(); }, [activeTab]);
  useEffect(() => { if (activeTab === "travel" && !loaded.travel) fetchTravel(); }, [activeTab]);

  const handleRefresh = () => {
    if (activeTab === "shop") return;
    if (activeTab === "experiences") fetchExperiences(true);
    else if (activeTab === "products") fetchProducts(productCat, true);
    else if (activeTab === "intimacy") fetchIntimacy(true);
    else fetchTravel(true);
  };

  const isLoading = activeTab === "shop" ? shopLoading : loading[activeTab];
  const allCuratedProducts = getCuratedProducts();
  const curatedProducts = shopFilter === "all" ? allCuratedProducts : getCuratedProducts(shopFilter);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Discover Together</h3>
            <p className="text-[10px] text-muted-foreground">{activeTab === "shop" ? "Curated picks for couples" : "AI-curated for couples"}</p>
          </div>
        </div>
        {activeTab !== "shop" && (
          <button onClick={handleRefresh} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" data-testid="refresh-discover">
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.key}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "shop" && (
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {SHOP_FILTERS.filter(f => f.key === "all" || allCuratedProducts.some(p => p.category.toLowerCase() === f.key.toLowerCase())).map(cat => (
            <button
              key={cat.key}
              onClick={() => setShopFilter(cat.key)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                shopFilter === cat.key ? "bg-accent text-accent-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`shop-filter-${cat.key}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "products" && (
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {PRODUCT_CATEGORIES.products.map(cat => (
            <button
              key={cat.key}
              onClick={() => { setProductCat(cat.key); fetchProducts(cat.key); }}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                productCat === cat.key ? "bg-accent text-accent-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <AiSearchBar section="discover" />

      <div className="pb-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (activeTab === "shop" ? shopFilter : "")}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="flex gap-3 overflow-x-auto scrollbar-hide px-3 pb-2"
          >
            {activeTab === "shop" && (
              shopLoading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : curatedProducts.length === 0
                  ? (
                    <div className="w-full text-center py-6">
                      <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">No products in this category yet</p>
                    </div>
                  )
                  : curatedProducts.map((product, i) => {
                      const id = `shop-${product.id}`;
                      return (
                        <motion.div key={id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                          className="flex-shrink-0 w-44 rounded-xl bg-secondary/50 overflow-hidden text-left transition-all hover:shadow-sm"
                        >
                          <div className="relative w-full h-40 overflow-hidden">
                            <CardImage src={product.imageUrl || getCategoryImage(product.category)} emoji="🛍️" alt={product.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <div className="absolute bottom-1.5 left-1.5">
                              <span className="text-[9px] bg-background/80 backdrop-blur-sm text-foreground px-1.5 py-0.5 rounded-full font-medium">{product.category}</span>
                            </div>
                          </div>
                          <div className="p-2.5">
                            <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{product.name}</p>
                            {product.brand && <p className="text-[10px] text-muted-foreground mt-0.5">{product.brand}</p>}
                            {product.description && <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-2">{product.description}</p>}
                            <div className="flex items-center justify-between mt-2">
                              {product.price && <p className="text-sm font-bold text-primary">{product.price}</p>}
                              <LikeButton liked={isLikedByMe(id)} partnerLiked={isLikedByPartner(id)} mutual={isMutualLike(id)} onToggle={() => toggleLike(id, product.name)} />
                            </div>
                            <a
                              href={withAffiliateTag(product.amazonUrl) || `https://www.amazon.co.uk/s?k=${encodeURIComponent(product.name)}&tag=${AMAZON_TAG}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#FF9900] py-1.5 text-[11px] font-semibold text-black hover:bg-[#FFa820] transition-colors"
                              data-testid={`buy-${product.id}`}
                            >
                              <ShoppingCart className="w-3 h-3" />
                              Buy on Amazon
                            </a>
                          </div>
                        </motion.div>
                      );
                    })
            )}

            {activeTab === "experiences" && (
              isLoading && !experiences.length
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : experiences.slice(0, 6).map((exp, i) => {
                    const img = getCategoryImage(exp.category || "Experiences");
                    const id = `exp-${exp.name}`;
                    return (
                      <motion.button key={id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                        onClick={() => window.open(getLink(exp.bookingUrl, exp.name), "_blank", "noopener,noreferrer")}
                        className="group flex-shrink-0 w-40 rounded-xl bg-secondary/50 hover:bg-secondary overflow-hidden text-left transition-all hover:shadow-sm"
                      >
                        <div className="relative w-full h-36 overflow-hidden">
                          <CardImage src={img} emoji={exp.emoji} alt={exp.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <div className="absolute top-1.5 right-1.5">
                            <ExternalLink className="w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                            <span className="text-[9px] bg-background/80 backdrop-blur-sm text-foreground px-1.5 py-0.5 rounded-full font-medium">{exp.category}</span>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{exp.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{exp.venue}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <div>
                              <p className="text-xs font-bold text-primary">{exp.price}</p>
                              <p className="text-[9px] text-muted-foreground">{exp.duration}</p>
                            </div>
                            <LikeButton liked={isLikedByMe(id)} partnerLiked={isLikedByPartner(id)} mutual={isMutualLike(id)} onToggle={() => toggleLike(id, exp.name)} />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })
            )}

            {activeTab === "products" && (
              isLoading && !products.length
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : products.slice(0, 6).map((p, i) => {
                    const img = getCategoryImage(p.category);
                    return (
                      <motion.button key={p.affiliateTag} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                        onClick={() => window.open(getLink(p.productUrl, p.name), "_blank", "noopener,noreferrer")}
                        className="group flex-shrink-0 w-40 rounded-xl bg-secondary/50 hover:bg-secondary overflow-hidden text-left transition-all hover:shadow-sm"
                      >
                        <div className="relative w-full h-36 overflow-hidden">
                          <CardImage src={img} emoji={p.emoji} alt={p.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          <div className="absolute top-1.5 right-1.5">
                            <ExternalLink className="w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-1.5 left-1.5">
                            <span className="text-[9px] bg-background/80 backdrop-blur-sm text-foreground px-1.5 py-0.5 rounded-full font-medium">{p.category}</span>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{p.brand}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-xs font-bold text-primary">{p.price}</p>
                            <LikeButton liked={isLikedByMe(p.affiliateTag)} partnerLiked={isLikedByPartner(p.affiliateTag)} mutual={isMutualLike(p.affiliateTag)} onToggle={() => toggleLike(p.affiliateTag, p.name)} />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })
            )}

            {activeTab === "intimacy" && (
              isLoading && !intimacy.length
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : intimacy.slice(0, 6).map((item, i) => {
                    const img = getCategoryImage(item.category);
                    return (
                      <motion.button key={item.affiliateTag} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                        onClick={() => window.open(getLink(item.productUrl, item.name), "_blank", "noopener,noreferrer")}
                        className="group flex-shrink-0 w-40 rounded-xl bg-secondary/50 hover:bg-secondary overflow-hidden text-left transition-all hover:shadow-sm"
                      >
                        <div className="relative w-full h-36 overflow-hidden">
                          <CardImage src={img} emoji={item.emoji} alt={item.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          <div className="absolute top-1.5 right-1.5">
                            <ExternalLink className="w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-1.5 left-1.5">
                            <span className="text-[9px] bg-background/80 backdrop-blur-sm text-foreground px-1.5 py-0.5 rounded-full font-medium">{item.category}</span>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.brand}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-xs font-bold text-primary">{item.price}</p>
                            <LikeButton liked={isLikedByMe(item.affiliateTag)} partnerLiked={isLikedByPartner(item.affiliateTag)} mutual={isMutualLike(item.affiliateTag)} onToggle={() => toggleLike(item.affiliateTag, item.name)} />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })
            )}

            {activeTab === "travel" && (
              isLoading && !travel.length
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : travel.slice(0, 6).map((dest, i) => {
                    const img = getCategoryImage("Travel");
                    const id = `travel-${dest.destination}`;
                    return (
                      <motion.button key={id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                        onClick={() => window.open(getLink(dest.bookingUrl, `${dest.name} ${dest.destination}`), "_blank", "noopener,noreferrer")}
                        className="group flex-shrink-0 w-40 rounded-xl bg-secondary/50 hover:bg-secondary overflow-hidden text-left transition-all hover:shadow-sm"
                      >
                        <div className="relative w-full h-36 overflow-hidden">
                          <CardImage src={img} emoji={dest.emoji} alt={dest.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <div className="absolute top-1.5 right-1.5">
                            <ExternalLink className="w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-1.5 left-1.5">
                            <span className="text-[9px] bg-background/80 backdrop-blur-sm text-foreground px-1.5 py-0.5 rounded-full font-medium">{dest.category}</span>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{dest.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{dest.destination}, {dest.country}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <div>
                              <p className="text-xs font-bold text-primary">{dest.price}</p>
                              <p className="text-[9px] text-muted-foreground">{dest.duration}</p>
                            </div>
                            <LikeButton liked={isLikedByMe(id)} partnerLiked={isLikedByPartner(id)} mutual={isMutualLike(id)} onToggle={() => toggleLike(id, dest.name)} />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-4 pb-2.5 flex items-center gap-1">
        <Sparkles className="w-2.5 h-2.5 text-muted-foreground/50" />
        <p className="text-[9px] text-muted-foreground/50">
          {activeTab === "shop" ? "Hand-picked · Tap ❤️ to save for later" : "AI-curated · Tap ❤️ to save for later"}
        </p>
      </div>
    </motion.div>
  );
};

export default DiscoverTogether;
