import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Package, Trash2, Loader2, Plus, RefreshCw, AlertCircle } from "lucide-react";

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
  price: string;
  description: string;
  category: string;
  features: string[];
}

const AdminProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [lastCreated, setLastCreated] = useState<CreatedProduct[]>([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      const res = await fetch("/api/stripe/ai-create-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), count }),
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
      const res = await fetch(`/api/stripe/products/${productId}`, { method: "DELETE" });
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
            <p className="text-sm text-muted-foreground">Create and manage your Stripe products</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-foreground" />
            <h2 className="font-semibold text-foreground text-sm">AI Product Creator</h2>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the products you want to create... e.g. '5 luxury massage oils and candles for couples under £60' or '3 premium date night gift sets'"
            className="w-full bg-secondary/50 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20"
            rows={3}
            data-testid="input-product-prompt"
          />

          <div className="flex items-center gap-3 mt-3">
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
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-50 active:scale-[0.97] transition-all"
              data-testid="button-generate-products"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Create Products
                </>
              )}
            </button>
          </div>

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
                Created {lastCreated.length} products
              </h3>
              <div className="space-y-2">
                {lastCreated.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between bg-white/50 dark:bg-white/5 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.brand} · {p.category} · {p.price}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Products will appear in the shop once Stripe syncs them (usually a few seconds).
                You can add images via the Stripe Dashboard.
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
            <p className="text-xs text-muted-foreground/60 mt-1">Use the AI creator above to add products to your shop</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {products.map((product) => {
                const meta = product.metadata || {};
                const price = product.prices[0];
                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-card rounded-xl p-4 flex items-start gap-3"
                  >
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
                      {product.description && (
                        <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-1">{product.description}</p>
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
