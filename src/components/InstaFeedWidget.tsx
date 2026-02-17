import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Instagram, Plus, X, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface InstaLink {
  id: string;
  url: string;
  title: string | null;
  note: string | null;
  created_at: string;
}

const curatedAccounts = [
  { handle: "@thedatingdivas", label: "Date Ideas", bio: "Creative date night inspiration for couples", color: "from-pink-500/20 to-rose-400/20", image: "https://images.unsplash.com/photo-1529543544282-ea57407bc2f3?w=80&h=80&fit=crop" },
  { handle: "@gottmaninstitute", label: "Relationship Tips", bio: "Science-based love advice", color: "from-blue-500/20 to-indigo-400/20", image: "https://images.unsplash.com/photo-1516585427167-9f4af9627e6c?w=80&h=80&fit=crop" },
  { handle: "@loveandlondon", label: "Travel Couples", bio: "Romantic travel inspiration", color: "from-amber-500/20 to-orange-400/20", image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=80&h=80&fit=crop" },
  { handle: "@couplegoals", label: "Couple Goals", bio: "Relationship inspiration & goals", color: "from-purple-500/20 to-violet-400/20", image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=80&h=80&fit=crop" },
  { handle: "@5lovelanguages", label: "Love Languages", bio: "Connect deeper with your partner", color: "from-[hsl(var(--us-coral))]/20 to-[hsl(var(--us-blush))]/20", image: "https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=80&h=80&fit=crop" },
  { handle: "@datenight", label: "Date Nights", bio: "Fun at-home & out date ideas", color: "from-[hsl(var(--us-sage))]/20 to-emerald-400/20", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=80&h=80&fit=crop" },
];

const extractInstaUsername = (url: string): string | null => {
  const match = url.match(/instagram\.com\/(?:p\/|reel\/|stories\/)?([^/?#]+)/i);
  return match ? match[1] : null;
};

const InstaFeedWidget = () => {
  const { user, profile } = useAuth();
  const [savedLinks, setSavedLinks] = useState<InstaLink[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const partnerId = profile?.partner_id;

  useEffect(() => {
    if (!user) return;
    const fetchLinks = async () => {
      let query = supabase
        .from("shared_links")
        .select("id, url, title, note, created_at")
        .eq("platform", "Instagram")
        .order("created_at", { ascending: false })
        .limit(6);

      if (partnerId) {
        query = query.or(`user_id.eq.${user.id},user_id.eq.${partnerId}`);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data } = await query;
      setSavedLinks(data || []);
    };
    fetchLinks();
  }, [user, partnerId]);

  const handleSave = async () => {
    if (!newUrl.trim() || !user) return;
    const url = newUrl.trim().startsWith("http") ? newUrl.trim() : `https://${newUrl.trim()}`;
    if (!url.includes("instagram.com")) {
      toast.error("Please enter an Instagram link");
      return;
    }
    setSaving(true);
    const username = extractInstaUsername(url);
    const { error } = await supabase.from("shared_links").insert({
      user_id: user.id,
      url,
      platform: "Instagram",
      title: username ? `@${username}` : "Instagram post",
    });
    if (error) {
      toast.error("Failed to save link");
    } else {
      toast.success("Instagram link saved!");
      setNewUrl("");
      setShowAdd(false);
      // Refresh
      const { data } = await supabase
        .from("shared_links")
        .select("id, url, title, note, created_at")
        .eq("platform", "Instagram")
        .or(partnerId ? `user_id.eq.${user.id},user_id.eq.${partnerId}` : `user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(6);
      setSavedLinks(data || []);
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white shrink-0">
          <Instagram className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">Instagram</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Saved links & inspiration</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Add link input */}
      {showAdd && (
        <div className="px-4 py-2 flex gap-2">
          <Input
            placeholder="Paste Instagram link…"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="text-sm h-9"
          />
          <button
            onClick={handleSave}
            disabled={saving || !newUrl.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-50 shrink-0"
          >
            {saving ? "…" : "Save"}
          </button>
        </div>
      )}

      <div className="px-4 pb-4 pt-1 space-y-3">
        {/* Saved Instagram links */}
        {savedLinks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Saved</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {savedLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl px-3 py-2.5 shrink-0 hover:from-purple-500/20 hover:to-pink-500/20 transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-500" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate max-w-[120px]">
                      {link.title || "Instagram"}
                    </p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Curated accounts */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Heart className="w-3 h-3 inline mr-1 text-[hsl(var(--us-coral))]" />
            Couple Inspo
          </p>
          <div className="grid grid-cols-2 gap-2">
            {curatedAccounts.map((account) => (
              <a
                key={account.handle}
                href={`https://instagram.com/${account.handle.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`bg-gradient-to-br ${account.color} rounded-xl overflow-hidden hover:opacity-80 transition-opacity`}
              >
                <div className="h-16 overflow-hidden">
                  <img src={account.image} alt={account.label} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">{account.handle}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{account.bio}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InstaFeedWidget;
