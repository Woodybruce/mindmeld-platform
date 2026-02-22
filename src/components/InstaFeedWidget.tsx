import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Instagram, Plus, X, Heart, ChevronLeft, ChevronRight, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { apiInvoke } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface InstaLink {
  id: string;
  url: string;
  title: string | null;
  note: string | null;
  created_at: string;
}

interface InstaSuggestion {
  id: string;
  handle: string;
  label: string | null;
  bio: string | null;
  image_url: string | null;
}

interface OEmbedData {
  thumbnail_url: string | null;
  title: string | null;
  author: string | null;
}

const defaultSuggestions = [
  { handle: "@thedatingdivas", label: "Date Ideas", bio: "Creative date night inspiration for couples", image_url: null },
  { handle: "@gottmaninstitute", label: "Relationship Tips", bio: "Science-based love advice", image_url: null },
  { handle: "@loveandlondon", label: "Travel Couples", bio: "Romantic travel inspiration", image_url: null },
  { handle: "@couplegoals", label: "Couple Goals", bio: "Relationship inspiration & goals", image_url: null },
];

const extractInstaUsername = (url: string): string | null => {
  const match = url.match(/instagram\.com\/(?:p\/|reel\/|stories\/)?([^/?#]+)/i);
  return match ? match[1] : null;
};

const getPostGradient = (id: string) => {
  const gradients = [
    "from-purple-600 via-pink-500 to-orange-400",
    "from-indigo-500 via-purple-500 to-pink-500",
    "from-rose-500 via-pink-500 to-fuchsia-500",
    "from-amber-500 via-orange-500 to-red-500",
    "from-cyan-500 via-blue-500 to-indigo-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
  ];
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

const InstaFeedWidget = () => {
  const { user, profile } = useAuth();
  const [savedLinks, setSavedLinks] = useState<InstaLink[]>([]);
  const [suggestions, setSuggestions] = useState<InstaSuggestion[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"link" | "account">("link");
  const [newUrl, setNewUrl] = useState("");
  const [newHandle, setNewHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [embedCache, setEmbedCache] = useState<Record<string, OEmbedData>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const partnerId = profile?.partner_id;

  // Fetch saved links
  useEffect(() => {
    if (!user) return;
    const fetchLinks = async () => {
      let query = supabase
        .from("shared_links")
        .select("id, url, title, note, created_at")
        .eq("platform", "Instagram")
        .order("created_at", { ascending: false })
        .limit(20);

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

  // Fetch custom suggestions
  useEffect(() => {
    if (!user) return;
    const fetchSuggestions = async () => {
      const { data } = await supabase
        .from("insta_suggestions")
        .select("id, handle, label, bio, image_url")
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setSuggestions(data);
      } else {
        // Show defaults if no custom ones yet
        setSuggestions(defaultSuggestions.map((s, i) => ({ id: `default-${i}`, ...s })));
      }
    };
    fetchSuggestions();
  }, [user]);

  // Fetch oEmbed data for saved links
  const fetchEmbed = useCallback(async (url: string, id: string) => {
    if (embedCache[id]) return;
    try {
      const { data } = await apiInvoke("instagram-oembed", {
        body: { url },
      });
      if (data && !data.error) {
        setEmbedCache((prev) => ({
          ...prev,
          [id]: {
            thumbnail_url: data.thumbnail_url,
            title: data.title || data.author,
            author: data.author,
          },
        }));
      }
    } catch {
      // silently fail
    }
  }, [embedCache]);

  useEffect(() => {
    savedLinks.forEach((link) => fetchEmbed(link.url, link.id));
  }, [savedLinks, fetchEmbed]);

  const handleSaveLink = async () => {
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
      const { data } = await supabase
        .from("shared_links")
        .select("id, url, title, note, created_at")
        .eq("platform", "Instagram")
        .or(partnerId ? `user_id.eq.${user.id},user_id.eq.${partnerId}` : `user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(20);
      setSavedLinks(data || []);
      setCurrentIndex(0);
    }
    setSaving(false);
  };

  const handleAddSuggestion = async () => {
    if (!newHandle.trim() || !user) return;
    const handle = newHandle.trim().startsWith("@") ? newHandle.trim() : `@${newHandle.trim()}`;
    setSaving(true);
    const { error } = await supabase.from("insta_suggestions").insert({
      user_id: user.id,
      handle,
      label: handle.replace("@", ""),
    });
    if (error) {
      toast.error("Failed to add account");
    } else {
      toast.success(`${handle} added!`);
      setNewHandle("");
      setShowAdd(false);
      // Refresh suggestions
      const { data } = await supabase
        .from("insta_suggestions")
        .select("id, handle, label, bio, image_url")
        .order("created_at", { ascending: true });
      if (data && data.length > 0) setSuggestions(data);
    }
    setSaving(false);
  };

  const handleRemoveSuggestion = async (id: string) => {
    if (id.startsWith("default-")) {
      // Replace defaults with custom list (minus this one)
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    await supabase.from("insta_suggestions").delete().eq("id", id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Account removed");
  };

  const allCards = [
    ...savedLinks.map((link) => ({ type: "saved" as const, data: link })),
    ...suggestions.map((s) => ({ type: "suggestion" as const, data: s })),
  ];

  const scrollToIndex = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, allCards.length - 1));
    setCurrentIndex(clamped);
    scrollRef.current?.children[clamped]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardWidth = container.children[0]?.clientWidth || 1;
    const gap = 12;
    const idx = Math.round(container.scrollLeft / (cardWidth + gap));
    setCurrentIndex(idx);
  };

  const getSuggestionGradient = (account: InstaSuggestion) => {
    const gradients = [
      "from-rose-500 via-pink-500 to-orange-400",
      "from-violet-600 via-purple-500 to-indigo-500",
      "from-sky-500 via-blue-500 to-cyan-500",
      "from-fuchsia-500 via-pink-500 to-rose-500",
      "from-emerald-500 via-teal-500 to-cyan-500",
      "from-amber-500 via-orange-500 to-red-500",
    ];
    const hash = account.handle.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return gradients[hash % gradients.length];
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
          <p className="text-xs text-muted-foreground mt-0.5">
            {savedLinks.length > 0 ? `${savedLinks.length} saved` : "Saved links"} & inspiration
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Add panel */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Mode tabs */}
            <div className="flex gap-2 px-4 pt-1 pb-2">
              <button
                onClick={() => setAddMode("link")}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  addMode === "link"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <ExternalLink className="w-3 h-3 inline mr-1" />
                Save Post
              </button>
              <button
                onClick={() => setAddMode("account")}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  addMode === "account"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <UserPlus className="w-3 h-3 inline mr-1" />
                Follow Account
              </button>
            </div>

            <div className="px-4 pb-2 flex gap-2">
              {addMode === "link" ? (
                <>
                  <Input
                    placeholder="Paste Instagram link…"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveLink()}
                    className="text-sm h-9"
                  />
                  <button
                    onClick={handleSaveLink}
                    disabled={saving || !newUrl.trim()}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-50 shrink-0"
                  >
                    {saving ? "…" : "Save"}
                  </button>
                </>
              ) : (
                <>
                  <Input
                    placeholder="@username"
                    value={newHandle}
                    onChange={(e) => setNewHandle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSuggestion()}
                    className="text-sm h-9"
                  />
                  <button
                    onClick={handleAddSuggestion}
                    disabled={saving || !newHandle.trim()}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-50 shrink-0"
                  >
                    {saving ? "…" : "Add"}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipeable square cards */}
      <div className="px-4 pb-3 pt-1">
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {allCards.map((card) => {
              if (card.type === "saved") {
                const link = card.data as InstaLink;
                const username = extractInstaUsername(link.url);
                const gradient = getPostGradient(link.id);
                const embed = embedCache[link.id];
                const hasThumbnail = embed?.thumbnail_url;

                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="snap-center shrink-0 w-[75%] aspect-square rounded-2xl overflow-hidden relative group"
                  >
                    {hasThumbnail ? (
                      <img
                        src={embed.thumbnail_url!}
                        alt={link.title || "Instagram post"}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      {!hasThumbnail && <Instagram className="w-7 h-7 mb-2 opacity-80" />}
                      <p className="text-sm font-display font-bold leading-tight drop-shadow-lg">
                        {embed?.title || link.title || "Instagram Post"}
                      </p>
                      {username && <p className="text-xs opacity-80 mt-0.5 drop-shadow">@{username}</p>}
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] opacity-70">
                        <ExternalLink className="w-3 h-3" />
                        <span>View on Instagram</span>
                      </div>
                    </div>
                    <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1">
                      <p className="text-[10px] text-white/80 font-medium">
                        {new Date(link.created_at).toLocaleDateString("default", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </a>
                );
              } else {
                const account = card.data as InstaSuggestion;
                return (
                  <div
                    key={account.id}
                    className="snap-center shrink-0 w-[75%] aspect-square rounded-2xl overflow-hidden relative group"
                  >
                    <a
                      href={`https://instagram.com/${account.handle.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${getSuggestionGradient(account)}`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Instagram className="w-12 h-12 text-white/20" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Heart className="w-3 h-3 text-pink-400" />
                          <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">
                            {account.label || "Suggestion"}
                          </span>
                        </div>
                        <p className="text-base font-display font-bold">{account.handle}</p>
                        {account.bio && <p className="text-xs opacity-70 mt-0.5">{account.bio}</p>}
                      </div>
                    </a>
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSuggestion(account.id);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }
            })}
          </div>

          {/* Navigation arrows */}
          {allCards.length > 1 && (
            <>
              {currentIndex > 0 && (
                <button
                  onClick={() => scrollToIndex(currentIndex - 1)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground shadow-lg hover:bg-background transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {currentIndex < allCards.length - 1 && (
                <button
                  onClick={() => scrollToIndex(currentIndex + 1)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground shadow-lg hover:bg-background transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Dot indicators */}
        {allCards.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {allCards.slice(0, Math.min(allCards.length, 10)).map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollToIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentIndex
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
            {allCards.length > 10 && (
              <span className="text-[10px] text-muted-foreground self-center ml-1">+{allCards.length - 10}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InstaFeedWidget;
