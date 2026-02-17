import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft,
  Sparkles, Save, X, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

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

const AdminFeedContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [items, setItems] = useState<FeedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Omit<FeedContentItem, "id" | "created_at"> & { id?: string } | null>(null);
  const [saving, setSaving] = useState(false);

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
        const { error } = await supabase
          .from("feed_content")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Content updated ✅" });
      } else {
        const { error } = await supabase
          .from("feed_content")
          .insert(payload);
        if (error) throw error;
        toast({ title: "Content created ✅" });
      }
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
      <AppHeader subtitle="Feed Content Manager" />

      <main className="px-4 py-4 pb-24 space-y-4">
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

        {/* Editor modal */}
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

              {/* Type & Size */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Type</label>
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
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Size</label>
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

              {/* Title */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Title *</label>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                  placeholder="Card title"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Subtitle</label>
                <input
                  value={editing.subtitle || ""}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value || null })}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                  placeholder="e.g. 10 questions · 5 min"
                />
              </div>

              {/* Body */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Body *</label>
                <textarea
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground resize-none"
                  placeholder="Description shown on the card"
                />
              </div>

              {/* Emoji & Tag */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Emoji</label>
                  <input
                    value={editing.emoji || ""}
                    onChange={(e) => setEditing({ ...editing, emoji: e.target.value || null })}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                    placeholder="🧠"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Tag</label>
                  <input
                    value={editing.tag}
                    onChange={(e) => setEditing({ ...editing, tag: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                    placeholder="Quiz"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Color</label>
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

              {/* Link */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Link (route)</label>
                <input
                  value={editing.link || ""}
                  onChange={(e) => setEditing({ ...editing, link: e.target.value || null })}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                  placeholder="/quiz/know-me"
                />
              </div>

              {/* Weight & Active */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Weight (1-10)</label>
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

        {/* Items list */}
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
      </main>

      <BottomNav />
    </div>
  );
};

export default AdminFeedContent;
