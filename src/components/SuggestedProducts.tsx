import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, RefreshCw, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  name: string;
  brand: string;
  price: string;
  description: string;
  category: string;
  emoji: string;
  affiliateTag: string;
}

const CACHE_KEY = "suggested-products";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

const SuggestedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchProducts = async (force = false) => {
    // Check cache first
    if (!force) {
      const cached = localStorage.getItem(CACHE_KEY);
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
        body: { category: "general" },
      });

      if (error) throw error;
      if (data?.products?.length) {
        setProducts(data.products);
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ products: data.products, timestamp: Date.now() })
        );
      }
    } catch (err: any) {
      console.error("Failed to fetch products:", err);
      if (!products.length) {
        // Show fallback products
        setProducts([
          { name: "Date Night Box", brand: "Cosy Couple Co.", price: "£34.99", description: "Everything you need for the perfect night in", category: "Date Night", emoji: "🕯️", affiliateTag: "date-night-box" },
          { name: "Couple's Journal", brand: "Papier", price: "£22.00", description: "365 prompts to deepen your connection", category: "Stationery", emoji: "📔", affiliateTag: "couples-journal" },
          { name: "Massage Oil Set", brand: "Neal's Yard", price: "£28.00", description: "Organic aromatherapy oils for two", category: "Wellness", emoji: "💆", affiliateTag: "massage-set" },
          { name: "Adventure Scratch Map", brand: "Luckies", price: "£19.99", description: "Track your travels together worldwide", category: "Travel", emoji: "🗺️", affiliateTag: "scratch-map" },
        ]);
      }
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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
        <button
          onClick={() => fetchProducts(true)}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Products grid */}
      <div className="px-3 pb-3 grid grid-cols-2 gap-2">
        {(loading && !products.length
          ? Array.from({ length: 4 })
          : products.slice(0, 4)
        ).map((product, i) => (
          <motion.button
            key={product ? (product as Product).affiliateTag : i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => {
              if (product) {
                toast.info(`Opening ${(product as Product).name}…`);
                // In production, this would open an affiliate link
                // window.open(`https://affiliate.example.com/${(product as Product).affiliateTag}`, '_blank');
              }
            }}
            className="group rounded-xl bg-secondary/50 hover:bg-secondary p-3 text-left transition-all hover:shadow-sm"
          >
            {product ? (
              <>
                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-xl">{(product as Product).emoji}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
                  {(product as Product).name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{(product as Product).brand}</p>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                  {(product as Product).description}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-primary">{(product as Product).price}</span>
                  <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                    {(product as Product).category}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-2 animate-pulse">
                <div className="w-6 h-6 bg-muted rounded" />
                <div className="w-3/4 h-3 bg-muted rounded" />
                <div className="w-1/2 h-2 bg-muted rounded" />
                <div className="w-full h-2 bg-muted rounded mt-2" />
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Subtle ad disclosure */}
      <div className="px-4 pb-2.5 flex items-center gap-1">
        <ShoppingBag className="w-2.5 h-2.5 text-muted-foreground/50" />
        <p className="text-[9px] text-muted-foreground/50">Sponsored · Curated for couples</p>
      </div>
    </motion.div>
  );
};

export default SuggestedProducts;
