import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Package, Trash2, Loader2, Plus, RefreshCw, AlertCircle, ExternalLink, TrendingUp, Users, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, string> | null;
  images: string[] | null;
  prices: { id: string; unit_amount: number; currency: string }[];
}

interface CreatedProduct {
  productId: string;
  priceId: string;
  name: string;
  brand: string;
  retailPrice: string;
  wholesalePrice: string;
  margin: string;
  description: string;
  category: string;
  features: string[];
  supplier: string;
  supplierUrl: string;
  marginNotes: string;
}

const AdminProducts = () => {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [lastCreated, setLastCreated] = useState<CreatedProduct[]>([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [usePersonalisation, setUsePersonalisation] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError("");
    setLastCreated([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/stripe/ai-create-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          count,
          usePersonalisation,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create products");
      setLastCreated(data.products || []);
      setPrompt("");
      setTimeout(() => fetchProducts(), 3000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
    setGenerating(false);
  };

  const handleDelete = async (productId: string) => {
    setDeletingId(productId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/stripe/products/${productId}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== productId));
      }
    } catch {}
    setDeletingId(null);
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <ShieldAlert className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Admin access required</p>
        <button
          onClick={() => navigate("/")}
          className="text-sm text-foreground/60 hover:text-foreground underline underline-offset-2"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Shop Products</h1>
            <p className="text-sm text-muted-foreground">AI-powered product sourcing for your shop</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-foreground" />
            <h2 className="font-semibold text-foreground text-sm">AI Product Sourcer</h2>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to sell... e.g. 'Premium massage oils and candles for couples under £50' or 'Luxury date night gift sets with good margins'"
            className="w-full bg-secondary/50 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20"
            rows={3}
            data-testid="input-product-prompt"
          />

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Count:</label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="bg-secondary/50 rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none"
                data-testid="select-product-count"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setUsePersonalisation(!usePersonalisation)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                usePersonalisation
                  ? "bg-foreground/10 text-foreground border-foreground/20"
                  : "bg-transparent text-muted-foreground border-border/50"
              }`}
              data-testid="toggle-personalisation"
            >
              <Users className="w-3 h-3" />
              {usePersonalisation ? "Personalised" : "Generic"}
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-50 active:scale-[0.97] transition-all"
              data-testid="button-generate-products"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sourcing...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Source Products
                </>
              )}
            </button>
          </div>

          {usePersonalisation && (
            <p className="text-[11px] text-muted-foreground/60 mt-2">
              AI will use your couple's activity, moods, liked content and conversations to find products you'd both love
            </p>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {lastCreated.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 mb-6 border border-green-200 dark:border-green-800"
            >
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3">
                Sourced {lastCreated.length} products
              </h3>
              <div className="space-y-3">
                {lastCreated.map((p) => (
                  <div key={p.productId} className="bg-white/50 dark:bg-white/5 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.brand} · {p.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-foreground">{p.retailPrice}</p>
                        <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">{p.margin} margin</p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Cost: {p.wholesalePrice}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {p.supplier}
                      </span>
                    </div>

                    {p.marginNotes && (
                      <p className="text-[11px] text-muted-foreground/70 mt-1.5 italic">{p.marginNotes}</p>
                    )}

                    {p.supplierUrl && (
                      <a
                        href={p.supplierUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mt-1.5 underline underline-offset-2"
                        data-testid={`link-supplier-${p.productId}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        View on {p.supplier}
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Products are live in your shop. Add images via the Stripe Dashboard.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Your Products ({products.length})
          </h2>
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            data-testid="button-refresh-products"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-secondary rounded w-2/3 mb-2" />
                <div className="h-3 bg-secondary rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 text-center">
            <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No products yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Use the AI sourcer above to find and add products</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {products.map((product) => {
                const meta = product.metadata || {};
                const price = product.prices[0];
                const wholesalePence = meta.wholesale_price ? Number(meta.wholesale_price) : null;
                const marginPct = meta.margin_percent;
                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-card rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" data-testid={`text-product-${product.id}`}>
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {meta.brand && `${meta.brand} · `}
                          {meta.category && `${meta.category} · `}
                          {price ? formatPrice(price.unit_amount, price.currency) : "No price"}
                        </p>
                        {(wholesalePence || marginPct) && (
                          <div className="flex items-center gap-3 mt-1">
                            {wholesalePence && (
                              <span className="text-[11px] text-muted-foreground/60">
                                Cost: £{(wholesalePence / 100).toFixed(2)}
                              </span>
                            )}
                            {marginPct && (
                              <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                                {marginPct}% margin
                              </span>
                            )}
                          </div>
                        )}
                        {meta.supplier && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[11px] text-muted-foreground/60">{meta.supplier}</span>
                            {meta.supplier_url && (
                              <a
                                href={meta.supplier_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-foreground/50 hover:text-foreground"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                        data-testid={`button-delete-${product.id}`}
                      >
                        {deletingId === product.id ? (
                          <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-400" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <p className="text-xs text-muted-foreground/40 text-center mt-8 mb-4">
          Products are managed through Stripe. Add images and edit details at dashboard.stripe.com
        </p>
      </div>
    </div>
  );
};

export default AdminProducts;
