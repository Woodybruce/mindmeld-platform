import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Plus, X, BookOpen, Rss, Loader2, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { apiInvoke } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { useContentLikes } from "@/hooks/useContentLikes";
import LikeButton from "@/components/LikeButton";

interface SubstackArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  newsletter: string;
  imageUrl?: string | null;
}

interface SavedLink {
  id: string;
  url: string;
  title: string | null;
  note: string | null;
  created_at: string;
}

const STORAGE_KEY = "substack-newsletters";

const defaultNewsletters = ["thedatingdivas", "loveandrelationships"];

const SubstackFeedWidget = () => {
  const { user, profile } = useAuth();
  const { toggleLike, isLikedByMe, isLikedByPartner, isMutualLike } = useContentLikes("substack");
  const [newsletters, setNewsletters] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultNewsletters;
  });
  const [articles, setArticles] = useState<SubstackArticle[]>([]);
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [showSaveLink, setShowSaveLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  const partnerId = profile?.partner_id;

  const fetchArticles = useCallback(async () => {
    if (newsletters.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await apiInvoke("fetch-substack-feed", {
        body: { newsletters },
      });
      if (error) throw error;
      if (data?.success) setArticles(data.items || []);
    } catch {
      // Silently fail — articles just won't show
    }
    setLoading(false);
  }, [newsletters]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Fetch saved Substack links
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      let query = supabase
        .from("shared_links")
        .select("id, url, title, note, created_at")
        .eq("platform", "Substack")
        .order("created_at", { ascending: false })
        .limit(4);
      if (partnerId) {
        query = query.or(`user_id.eq.${user.id},user_id.eq.${partnerId}`);
      } else {
        query = query.eq("user_id", user.id);
      }
      const { data } = await query;
      setSavedLinks(data || []);
    };
    fetch();
  }, [user, partnerId]);

  const addNewsletter = () => {
    const slug = newSlug.trim().toLowerCase().replace(/^@/, "").replace(/\.substack\.com.*/, "");
    if (!slug) return;
    if (newsletters.includes(slug)) {
      toast.error("Already following this newsletter");
      return;
    }
    const updated = [...newsletters, slug];
    setNewsletters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewSlug("");
    setShowAdd(false);
    toast.success(`Following ${slug}`);
  };

  const removeNewsletter = (slug: string) => {
    const updated = newsletters.filter((n) => n !== slug);
    setNewsletters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const saveLink = async () => {
    if (!newLink.trim() || !user) return;
    const url = newLink.trim().startsWith("http") ? newLink.trim() : `https://${newLink.trim()}`;
    setSavingLink(true);
    const { error } = await supabase.from("shared_links").insert({
      user_id: user.id,
      url,
      platform: "Substack",
      title: url.includes("substack.com") ? url.split("/").pop()?.replace(/-/g, " ") || "Substack article" : "Substack article",
    });
    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Article saved!");
      setNewLink("");
      setShowSaveLink(false);
      // Refresh saved
      const { data } = await supabase
        .from("shared_links")
        .select("id, url, title, note, created_at")
        .eq("platform", "Substack")
        .or(partnerId ? `user_id.eq.${user.id},user_id.eq.${partnerId}` : `user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(4);
      setSavedLinks(data || []);
    }
    setSavingLink(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">Substack</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Newsletters & saved reads</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { setShowSaveLink(!showSaveLink); setShowAdd(false); }}
            className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Save article"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setShowAdd(!showAdd); setShowSaveLink(false); }}
            className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Follow newsletter"
          >
            {showAdd ? <X className="w-3.5 h-3.5" /> : <Rss className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Add newsletter input */}
      {showAdd && (
        <div className="px-4 py-2 flex gap-2">
          <Input
            placeholder="Newsletter name (e.g. lenny)"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNewsletter()}
            className="text-sm h-9"
          />
          <button
            onClick={addNewsletter}
            disabled={!newSlug.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500 text-white disabled:opacity-50 shrink-0"
          >
            Follow
          </button>
        </div>
      )}

      {/* Save article link input */}
      {showSaveLink && (
        <div className="px-4 py-2 flex gap-2">
          <Input
            placeholder="Paste Substack article link…"
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveLink()}
            className="text-sm h-9"
          />
          <button
            onClick={saveLink}
            disabled={savingLink || !newLink.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500 text-white disabled:opacity-50 shrink-0"
          >
            {savingLink ? "…" : "Save"}
          </button>
        </div>
      )}

      <div className="px-4 pb-4 pt-1 space-y-3">
        {/* Following badges */}
        {newsletters.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {newsletters.map((n) => (
              <span
                key={n}
                className="inline-flex items-center gap-1 bg-orange-500/10 text-foreground text-[12px] font-medium rounded-full px-2.5 py-1"
              >
                {n}
                <button onClick={() => removeNewsletter(n)} className="hover:text-destructive">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Saved articles */}
        {savedLinks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              <Bookmark className="w-3 h-3 inline mr-1" />
              Saved Articles
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {savedLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-orange-500/10 rounded-xl px-3 py-2.5 shrink-0 hover:bg-orange-500/20 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                  <p className="text-xs font-medium text-foreground truncate max-w-[130px]">
                    {link.title || "Article"}
                  </p>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Latest articles from RSS */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              <Rss className="w-3 h-3 inline mr-1" />
              Latest Posts
            </p>
            <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-hide">
              {articles.map((article, i) => (
                <a
                  key={`${article.newsletter}-${i}`}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex bg-secondary/60 rounded-xl overflow-hidden hover:bg-secondary transition-colors"
                >
                  {article.imageUrl && (
                    <div className="w-20 h-20 shrink-0 overflow-hidden">
                      <img src={article.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                   <div className="flex-1 min-w-0 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{article.title}</p>
                        <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{article.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[12px] text-orange-500 font-medium">{article.newsletter}</span>
                          {article.pubDate && (
                            <span className="text-[12px] text-muted-foreground/60">
                              {formatDistanceToNow(new Date(article.pubDate), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <LikeButton
                          liked={isLikedByMe(article.link)}
                          partnerLiked={isLikedByPartner(article.link)}
                          mutual={isMutualLike(article.link)}
                          onToggle={() => toggleLike(article.link, article.title)}
                        />
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : newsletters.length > 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No articles found — try different newsletters</p>
        ) : null}
      </div>
    </motion.div>
  );
};

export default SubstackFeedWidget;
