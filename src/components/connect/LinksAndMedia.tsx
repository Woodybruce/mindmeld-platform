import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Plus, Link2, Trash2, MoreHorizontal, Instagram, Youtube, Globe, Newspaper, Sparkles, Heart, Loader2, X } from "lucide-react";
import { useSharedLinks } from "@/hooks/useSharedLinks";
import type { SharedLinkRow } from "@/hooks/useSharedLinks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/** Only allow http(s) links to be rendered as anchors — blocks stored javascript: XSS. */
const sanitizeHref = (url: string): string | null => {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
};

const platformIcon = (platform: string) => {
  switch (platform) {
    case "Instagram": return <Instagram className="w-4 h-4" />;
    case "YouTube": return <Youtube className="w-4 h-4" />;
    case "TikTok": return <Globe className="w-4 h-4" />;
    case "Article": return <Newspaper className="w-4 h-4" />;
    default: return <Link2 className="w-4 h-4" />;
  }
};

const platformGradient = (platform: string) => {
  switch (platform) {
    case "Instagram": return "from-pink-500 to-purple-500";
    case "YouTube": return "from-red-500 to-red-600";
    case "TikTok": return "from-gray-800 to-gray-900";
    case "Article": return "from-blue-600 to-blue-700";
    default: return "from-primary to-primary/80";
  }
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const LinksAndMedia = () => {
  const { user } = useAuth();
  const { myLinks, partnerLinks, matchedLinks, addLink, loading } = useSharedLinks();
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "partner">("all");

  const allLinks = filter === "mine" ? myLinks : filter === "partner" ? partnerLinks : [...myLinks, ...partnerLinks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const matchedUrls = new Set(matchedLinks.map(m => m.url.split("?")[0].replace(/\/$/, "")));

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    setSaving(true);
    try {
      await addLink(newUrl.trim(), newNote.trim() || undefined, newTitle.trim() || undefined);
      setNewUrl("");
      setNewTitle("");
      setNewNote("");
      setShowAdd(false);
      toast.success("Link saved");
    } catch {
      toast.error("Failed to save link");
    }
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    setOpenActionMenu(null);
    // Verify the delete actually removed a row before claiming success — RLS blocks
    // deleting a partner's link, which previously still toasted "removed".
    const { data, error } = await supabase.from("shared_links").delete().eq("id", id).select();
    if (error || !data || data.length === 0) {
      toast.error("Couldn't remove — you can only delete your own links");
      return;
    }
    toast.success("Link removed");
  };

  const isMatched = (link: SharedLinkRow) => {
    const normalized = link.url.split("?")[0].replace(/\/$/, "");
    return matchedUrls.has(normalized);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {allLinks.length > 0 ? `${allLinks.length} saved link${allLinks.length !== 1 ? "s" : ""}` : "Save & share links together"}
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          data-testid="button-add-link"
          aria-label={showAdd ? "Cancel adding link" : "Add a new link"}
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? "Cancel" : "Add Link"}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <input
              autoFocus
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Paste a link…"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="input-link-url"
            />
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="input-link-title"
            />
            <div className="flex gap-2">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Note (optional)"
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="input-link-note"
              />
              <button
                onClick={handleAdd}
                disabled={saving || !newUrl.trim()}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-opacity"
                data-testid="button-save-link"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {allLinks.length > 0 && (
        <div className="flex gap-1.5">
          {(["all", "mine", "partner"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`button-filter-${f}`}
            >
              {f === "all" ? "All" : f === "mine" ? "Mine" : "Partner's"}
            </button>
          ))}
        </div>
      )}

      {matchedLinks.length > 0 && filter === "all" && (
        <div className="space-y-2">
          {matchedLinks.map((match) => (
            <motion.div
              key={match.url}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border-2 border-us-coral/30 bg-gradient-to-br from-us-blush/30 via-card to-us-coral/10 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                <div className="flex items-center gap-1 bg-us-coral/15 text-us-coral rounded-full px-2 py-0.5">
                  <Sparkles className="w-3 h-3" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">You both saved this!</span>
                </div>
                <div className="flex -space-x-1 ml-auto">
                  <Heart className="w-3.5 h-3.5 fill-us-coral text-us-coral" />
                  <Heart className="w-3.5 h-3.5 fill-us-coral text-us-coral" />
                </div>
              </div>
              <a
                href={sanitizeHref(match.url) || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-3 py-2.5"
                data-testid={`link-matched-${match.yourLink.id}`}
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${platformGradient(match.yourLink.platform)} flex items-center justify-center text-white shrink-0`}>
                  {platformIcon(match.yourLink.platform)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                    {match.yourLink.title || match.yourLink.note || match.url}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{match.yourLink.platform}</p>
                </div>
              </a>
            </motion.div>
          ))}
        </div>
      )}

      {allLinks.length === 0 && !showAdd && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Link2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-display text-base font-semibold text-foreground">No saved links yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Save restaurants, recipes, holidays, articles & more</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            data-testid="button-add-first-link"
          >
            <Plus className="w-4 h-4" /> Add your first link
          </button>
        </div>
      )}

      {allLinks.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {allLinks.filter(link => !isMatched(link) || filter !== "all").map((link, i) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0"
              data-testid={`link-item-${link.id}`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${platformGradient(link.platform)} flex items-center justify-center text-white shrink-0`}>
                {platformIcon(link.platform)}
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={sanitizeHref(link.url) || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                >
                  {link.title || link.url}
                </a>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-medium text-primary">{link.platform}</span>
                  {link.note && (
                    <>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground italic truncate">{link.note}</span>
                    </>
                  )}
                  <span className="text-[11px] text-muted-foreground ml-auto shrink-0">{timeAgo(link.created_at)}</span>
                </div>
              </div>
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setOpenActionMenu(openActionMenu === link.id ? null : link.id)}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  aria-label="Link actions"
                  data-testid={`button-actions-${link.id}`}
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
                {openActionMenu === link.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenu(null)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                      <a
                        href={sanitizeHref(link.url) || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpenActionMenu(null)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                        data-testid={`button-open-link-${link.id}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /> Open link
                      </a>
                      {link.user_id === user?.id && (
                        <>
                          <div className="border-t border-border my-1" />
                          <button
                            onClick={() => handleRemove(link.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            data-testid={`button-delete-link-${link.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LinksAndMedia;
