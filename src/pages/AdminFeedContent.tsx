import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft,
  Sparkles, Save, X, Loader2, ShoppingBag, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { apiInvoke } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useShopProducts, type ShopProduct } from "@/hooks/useShopProducts";

interface FeedContentItem {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  body: string;
  emoji: string | null;
  image_url: string | null;
  tag: string;
  tag_color: string;
  link: string | null;
  size: string;
  active: boolean;
  weight: number;
  created_at: string;
}

const EMPTY_ITEM: Omit<FeedContentItem, "id" | "created_at"> = {
  type: "quiz",
  title: "",
  subtitle: null,
  body: "",
  emoji: null,
  image_url: null,
  tag: "Quiz",
  tag_color: "text-us-gold",
  link: null,
  size: "half",
  active: true,
  weight: 1,
};

const TYPE_OPTIONS = ["quiz", "prompt", "tip", "article", "challenge"];
const SIZE_OPTIONS = ["half", "full", "banner"];
const TAG_COLOR_OPTIONS = [
  { label: "Gold", value: "text-us-gold" },
  { label: "Coral", value: "text-us-coral" },
  { label: "Sage", value: "text-us-sage" },
  { label: "Muted", value: "text-muted-foreground" },
];

const SHOP_CATEGORIES = [
  "Date Night", "Wellness", "Games", "Gifts", "Intimacy",
  "Travel", "Home", "Books", "Experiences"
];

const EMPTY_SHOP_PRODUCT: Omit<ShopProduct, "id"> = {
  name: "",
  brand: "",
  price: "",
  description: "",
  category: "Gifts",
  imageUrl: "",
  amazonUrl: "",
  active: true,
};

type AdminTab = "feed" | "shop";

const AdminFeedContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [adminTab, setAdminTab] = useState<AdminTab>("feed");

  const [items, setItems] = useState<FeedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Omit<FeedContentItem, "id" | "created_at"> & { id?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const { products: shopProducts, loading: shopLoading, addProduct, updateProduct, deleteProduct } = useShopProducts();
  const [editingShop, setEditingShop] = useState<(Omit<ShopProduct, "id"> & { id?: string }) | null>(null);
  const [shopSaving, setShopSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feed_content")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast({ title: "Failed to load content", variant: "destructive" });
    } else {
      setItems((data as FeedContentItem[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchItems();
  }, [isAdmin]);

  const handleAiGenerate = async () => {
    if (!editing) return;
    setAiGenerating(true);
    try {
      const { data, error } = await apiInvoke("generate-feed-content", {
        body: { type: editing.type, description: aiPrompt.trim() || undefined },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setEditing({
        ...editing,
        title: data.title || editing.title,
        subtitle: data.subtitle || editing.subtitle,
        body: data.body || editing.body,
        emoji: data.emoji || editing.emoji,
        tag: data.tag || editing.tag,
        tag_color: data.tag_color || editing.tag_color,
      });
      setAiPrompt("");
      toast({ title: "AI content generated ✨" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "AI generation failed", description: e.message, variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!editing || !editing.title.trim() || !editing.body.trim()) {
      toast({ title: "Title and body are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: editing.type,
        title: editing.title.trim(),
        subtitle: editing.subtitle?.trim() || null,
        body: editing.body.trim(),
        emoji: editing.emoji?.trim() || null,
        image_url: editing.image_url?.trim() || null,
        tag: editing.tag.trim(),
        tag_color: editing.tag_color,
        link: editing.link?.trim() || null,
        size: editing.size,
        active: editing.active,
        weight: editing.weight,
      };

      if (editing.id) {
        const { error } = await supabase.from("feed_content").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("feed_content").insert(payload);
        if (error) throw error;
      }
      toast({ title: "Saved ✓" });
      setEditing(null);
      fetchItems();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("feed_content").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      fetchItems();
    }
  };

  const toggleActive = async (item: FeedContentItem) => {
    const { error } = await supabase
      .from("feed_content")
      .update({ active: !item.active })
      .eq("id", item.id);
    if (error) {
      toast({ title: "Update failed", variant: "destructive" });
    } else {
      fetchItems();
    }
  };

  const handleShopSave = async () => {
    if (!editingShop || !editingShop.name.trim() || !editingShop.amazonUrl.trim()) {
      toast({ title: "Name and Amazon URL are required", variant: "destructive" });
      return;
    }
    setShopSaving(true);
    try {
      if (editingShop.id) {
        await updateProduct(editingShop.id, editingShop);
      } else {
        await addProduct(editingShop);
      }
      toast({ title: "Product saved ✓" });
      setEditingShop(null);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setShopSaving(false);
    }
  };

  const handleShopDelete = async (id: string) => {
    await deleteProduct(id);
    toast({ title: "Product deleted" });
  };

  const handleShopToggle = async (product: ShopProduct) => {
    await updateProduct(product.id, { active: !product.active });
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
      <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-semibold text-foreground">Admin access required</p>
        <p className="text-sm text-muted-foreground mt-2">You don't have permission to view this page.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-sm text-primary font-medium">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <AppHeader subtitle="Admin" />

      <main className="px-4 py-4 pb-24 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setAdminTab("feed")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              adminTab === "feed" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
            data-testid="admin-tab-feed"
          >
            <FileText className="w-3.5 h-3.5" /> Feed Content
          </button>
          <button
            onClick={() => setAdminTab("shop")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              adminTab === "shop" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
            data-testid="admin-tab-shop"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Our Shopping List
          </button>
        </div>

        {adminTab === "feed" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Feed Content</h2>
              <button
                onClick={() => setEditing({ ...EMPTY_ITEM })}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              {items.length} items · {items.filter((i) => i.active).length} active
            </p>

            <AnimatePresence>
              {editing && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="rounded-2xl border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">
                      {editing.id ? "Edit Item" : "New Item"}
                    </p>
                    <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground uppercase">Type</label>
                      <select
                        value={editing.type}
                        onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                      >
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground uppercase">Size</label>
                      <select
                        value={editing.size}
                        onChange={(e) => setEditing({ ...editing, size: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                      >
                        {SIZE_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                    <p className="text-[12px] font-semibold text-primary uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Assist
                    </p>
                    <input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      placeholder={`Describe the ${editing.type} you want, or leave blank for a surprise…`}
                    />
                    <button
                      onClick={handleAiGenerate}
                      disabled={aiGenerating}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 py-2 text-xs font-semibold text-primary disabled:opacity-50"
                    >
                      {aiGenerating ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> Generate with AI</>
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase">Title *</label>
                    <input
                      value={editing.title}
                      onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      placeholder="Card title"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase">Subtitle</label>
                    <input
                      value={editing.subtitle || ""}
                      onChange={(e) => setEditing({ ...editing, subtitle: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      placeholder="e.g. 10 questions · 5 min"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase">Body *</label>
                    <textarea
                      value={editing.body}
                      onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground resize-none"
                      placeholder="Description shown on the card"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground uppercase">Emoji</label>
                      <input
                        value={editing.emoji || ""}
                        onChange={(e) => setEditing({ ...editing, emoji: e.target.value || null })}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        placeholder="🧠"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground uppercase">Tag</label>
                      <input
                        value={editing.tag}
                        onChange={(e) => setEditing({ ...editing, tag: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        placeholder="Quiz"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground uppercase">Color</label>
                      <select
                        value={editing.tag_color}
                        onChange={(e) => setEditing({ ...editing, tag_color: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                      >
                        {TAG_COLOR_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase">Link (route)</label>
                    <input
                      value={editing.link || ""}
                      onChange={(e) => setEditing({ ...editing, link: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      placeholder="/quiz/know-me"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground uppercase">Weight (1-10)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={editing.weight}
                        onChange={(e) => setEditing({ ...editing, weight: parseInt(e.target.value) || 1 })}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editing.active}
                          onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                          className="rounded"
                        />
                        Active
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    ) : (
                      <><Save className="w-4 h-4" /> Save</>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border bg-card p-3 flex items-center gap-3 ${
                      item.active ? "border-border" : "border-border/30 opacity-60"
                    }`}
                  >
                    <span className="text-xl">{item.emoji || "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.type} · {item.size} · weight {item.weight}
                        {!item.active && " · hidden"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(item)}
                        className="p-1.5 text-muted-foreground hover:text-foreground"
                        title={item.active ? "Hide" : "Show"}
                      >
                        {item.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setEditing({ ...item })}
                        className="p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {adminTab === "shop" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Our Shopping List</h2>
              <button
                onClick={() => setEditingShop({ ...EMPTY_SHOP_PRODUCT })}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                data-testid="add-shop-product"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              {shopProducts.length} products · {shopProducts.filter(p => p.active).length} active
            </p>
            <p className="text-[12px] text-muted-foreground/70">
              Products appear in the Discover Together shop on the home page. Paste Amazon URLs and your affiliate tag is added automatically.
            </p>

            <AnimatePresence>
              {editingShop && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="rounded-2xl border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">
                      {editingShop.id ? "Edit Product" : "New Product"}
                    </p>
                    <button onClick={() => setEditingShop(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase">Product Name *</label>
                    <input
                      value={editingShop.name}
                      onChange={(e) => setEditingShop({ ...editingShop, name: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      placeholder="e.g. Couples Card Game"
                      data-testid="shop-product-name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground uppercase">Brand</label>
                      <input
                        value={editingShop.brand}
                        onChange={(e) => setEditingShop({ ...editingShop, brand: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        placeholder="Brand name"
                        data-testid="shop-product-brand"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-muted-foreground uppercase">Price</label>
                      <input
                        value={editingShop.price}
                        onChange={(e) => setEditingShop({ ...editingShop, price: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                        placeholder="£19.99"
                        data-testid="shop-product-price"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase">Category</label>
                    <select
                      value={editingShop.category}
                      onChange={(e) => setEditingShop({ ...editingShop, category: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                      data-testid="shop-product-category"
                    >
                      {SHOP_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase">Description</label>
                    <textarea
                      value={editingShop.description}
                      onChange={(e) => setEditingShop({ ...editingShop, description: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground resize-none"
                      placeholder="Short description of the product"
                      data-testid="shop-product-description"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase">Amazon URL *</label>
                    <input
                      value={editingShop.amazonUrl}
                      onChange={(e) => setEditingShop({ ...editingShop, amazonUrl: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      placeholder="https://www.amazon.co.uk/dp/..."
                      data-testid="shop-product-url"
                    />
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">Your affiliate tag is added automatically</p>
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase">Image URL</label>
                    <input
                      value={editingShop.imageUrl}
                      onChange={(e) => setEditingShop({ ...editingShop, imageUrl: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      placeholder="https://... (product image URL, or leave blank)"
                      data-testid="shop-product-image"
                    />
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">Tip: right-click an Amazon product image → Copy image address</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingShop.active}
                        onChange={(e) => setEditingShop({ ...editingShop, active: e.target.checked })}
                        className="rounded"
                      />
                      Active
                    </label>
                  </div>

                  <button
                    onClick={handleShopSave}
                    disabled={shopSaving}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    data-testid="save-shop-product"
                  >
                    {shopSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    ) : (
                      <><Save className="w-4 h-4" /> Save Product</>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {shopLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {shopProducts.length === 0 && !editingShop && (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No products yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Add Amazon product links to show in the shop</p>
                  </div>
                )}
                {shopProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`rounded-xl border bg-card p-3 flex items-center gap-3 ${
                      product.active ? "border-border" : "border-border/30 opacity-60"
                    }`}
                  >
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {product.category} · {product.price || "No price"}
                        {!product.active && " · hidden"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleShopToggle(product)}
                        className="p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        {product.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setEditingShop({ ...product })}
                        className="p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleShopDelete(product.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default AdminFeedContent;
