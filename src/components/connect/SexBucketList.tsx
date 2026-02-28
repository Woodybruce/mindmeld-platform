import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, X, Send, Flame, Heart, Loader2, Sparkles, Pencil, MoreHorizontal, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { notifyPartner } from "@/lib/notifyPartner";
import type { UserList, ListItem } from "./SharedLists";

const SEX_BUCKET_IDEAS = [
  "Erotic hypnosis", "Fantasy / roleplay", "Sensation play", "Spanking", "Feathers",
  "Dominance", "Submission", "Rougher play", "Restraint", "Blindfolding", "Orgasm control",
  "Vibrators", "Bullet", "Wand", "Air stimulator", "Licker toy", "Thruster / pulsator",
  "Anal beads", "Anal plug",
  "Regular solo pleasure practice", "Sensual massage (incl breast massage)",
  "Petting / stroking / hair play", "More erotic kissing / making out",
  "Neck/ear play (breath, licking, sucking)", "Longer sensual holding moments",
  "Manual genital massage skills", "Improve oral techniques",
  "Learn to orgasm while receiving oral", "Explore mutual oral for energetic blending",
  "Explore positions stimulating multiple zones",
  "Sex in new/unusual locations", "More sensual talk / appreciation / dirty talk",
  "Share fantasies (even if not acted on)", "More moans / feedback / vocal response",
  "Feel confident asking for what I want", "Encourage partner to ask too",
  "Share 'favourite frames' (best moments)",
  "Sexy clothes / lingerie / costumes / heels / latex / gear",
  "Take sexy photos or video (self/partner)",
  "Erotic dance / lap dance / pole dance with partner", "Go to an exotic dance club",
  "Water play (hot tub / shower / spring / waterfall)",
  "Spanking / flogging / restraints / blindfolds", "Rope bondage (Shibari)",
  "Sex furniture restraint play", "Domination", "Being dominated",
  "Harness / strap-on play", "Remote control toy play",
  "Explore anal pleasure", "Anal vibrator",
  "Suction devices (clit/nipple/penis/vulva pump)", "Penis pump / enlargement techniques",
  "Tantra / spiritual sex techniques", "Expanded orgasm / orgasmic meditation practice",
  "Multi-orgasmic stamina training", "Female ejaculation healing / exploration",
  "Taoist thrusting techniques", "360° tantric positions", "Piercings / clamps / jewellery",
];

interface Proposal {
  id: string;
  user_id: string;
  proposal_type: string;
  items: string[];
  selected_items: string[] | null;
  status: string;
  created_at: string;
}

interface SexBucketListProps {
  lists: UserList[];
  onUpdate: (lists: UserList[]) => void;
  pendingOnly?: boolean;
}

const SexBucketList = ({ lists, onUpdate, pendingOnly }: SexBucketListProps) => {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<"idle" | "creating" | "reviewing">("idle");
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [pendingProposal, setPendingProposal] = useState<Proposal | null>(null);
  const [myProposal, setMyProposal] = useState<Proposal | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = newItem.trim().length >= 1
    ? SEX_BUCKET_IDEAS.filter(
        (idea) =>
          idea.toLowerCase().includes(newItem.toLowerCase()) &&
          !items.includes(idea)
      )
    : [];

  // Fetch proposals on mount
  useEffect(() => {
    if (!user) return;
    fetchProposals();

    // Realtime subscription
    const channel = supabase
      .channel("bucket-proposals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bucket_list_proposals" },
        () => fetchProposals()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchProposals = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("bucket_list_proposals" as any)
      .select("*")
      .eq("proposal_type", "sex-bucket")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data) {
      const proposals = data as any as Proposal[];
      const fromPartner = proposals.find((p) => p.user_id !== user.id);
      const fromMe = proposals.find((p) => p.user_id === user.id);
      setPendingProposal(fromPartner || null);
      setMyProposal(fromMe || null);
    }
    setLoading(false);
  };

  const addItem = () => {
    const text = newItem.trim();
    if (!text || items.length >= 10) return;
    setItems([...items, text]);
    setNewItem("");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const sendProposal = async () => {
    if (!user || items.length === 0) return;
    setSending(true);
    const { error } = await supabase
      .from("bucket_list_proposals" as any)
      .insert({
        user_id: user.id,
        proposal_type: "sex-bucket",
        items: items,
        status: "pending",
      } as any);

    if (error) {
      toast({ title: "Error", description: "Could not send proposal", variant: "destructive" });
    } else {
      toast({ title: "🔥 Proposal sent!", description: "Your partner will pick their favourites" });
      // Notify partner
      if (profile?.partner_id) {
        notifyPartner({
          partnerId: profile.partner_id,
          title: "🔥 Sex Bucket Challenge",
          body: `${profile.username || "Your partner"} sent you a spicy proposal!`,
          route: "/us?tab=lists",
          chatMessage: "🔥 I just sent you a Sex Bucket Challenge — go pick your favourites!",
          senderId: user.id,
        });
      }
      setItems([]);
      setMode("idle");
    }
    setSending(false);
    fetchProposals();
  };

  const toggleSelect = (item: string) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter((i) => i !== item));
    } else if (selectedItems.length < 5) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const acceptProposal = async () => {
    if (!pendingProposal || selectedItems.length === 0) return;
    setSending(true);

    // Update proposal status
    await supabase
      .from("bucket_list_proposals" as any)
      .update({ selected_items: selectedItems, status: "completed", responded_at: new Date().toISOString() } as any)
      .eq("id", pendingProposal.id);

    // Create the "Sex To Do" list with selected items
    const newList: UserList = {
      id: `sex-todo-${Date.now()}`,
      name: "Sex To Do 🔥",
      icon: "🔥",
      template: "sex-todo",
      createdAt: new Date().toISOString(),
      items: selectedItems.map((text, i) => ({
        id: `${Date.now()}-${i}`,
        text,
        done: false,
      })),
    };
    onUpdate([newList, ...lists]);

    toast({ title: "🎉 Sex To Do list created!", description: `${selectedItems.length} things to try together` });
    setSelectedItems([]);
    setPendingProposal(null);
    setMode("idle");
    setSending(false);
    fetchProposals();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Partner sent a proposal — review mode
  if (pendingProposal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-us-coral/30 bg-gradient-to-br from-us-coral/10 to-us-blush/10 p-4 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-us-coral" />
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Your partner proposed!</h3>
            <p className="text-[13px] text-muted-foreground">Pick up to 5 things you'd like to try</p>
          </div>
        </div>

        <div className="space-y-2">
          {pendingProposal.items.map((item, i) => {
            const isSelected = selectedItems.includes(item);
            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => toggleSelect(item)}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/50 bg-card hover:border-primary/30"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                }`}>
                  {isSelected && <Heart className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className="text-sm text-foreground flex-1">{item}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{selectedItems.length}/5 selected</p>
          <button
            onClick={acceptProposal}
            disabled={selectedItems.length === 0 || sending}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create To Do List
          </button>
        </div>
      </motion.div>
    );
  }

  // I already sent a proposal — waiting
  if (myProposal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-us-gold/30 bg-gradient-to-br from-us-gold/10 to-us-cream/10 p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-us-gold animate-pulse" />
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Proposal sent!</h3>
            <p className="text-[13px] text-muted-foreground">Waiting for your partner to pick their favourites…</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {myProposal.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-card/60 px-3 py-2 text-sm text-muted-foreground">
              <Flame className="w-3.5 h-3.5 text-us-coral/50" />
              {item}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Creating mode — add up to 10 items
  if (mode === "creating") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-us-coral/30 bg-gradient-to-br from-us-coral/10 to-us-blush/10 p-4 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-us-coral" />
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">Sex Bucket Challenge</h3>
              <p className="text-[13px] text-muted-foreground">Add up to 10 things to try — your partner picks 5</p>
            </div>
          </div>
          <button onClick={() => { setMode("idle"); setItems([]); }} className="p-1">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 group"
            >
              <span className="text-xs font-bold text-us-coral w-5 text-center">{i + 1}</span>
              {editingIdx === i ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editText.trim()) {
                      setItems(items.map((it, idx) => idx === i ? editText.trim() : it));
                      setEditingIdx(null);
                    }
                    if (e.key === "Escape") setEditingIdx(null);
                  }}
                  onBlur={() => {
                    if (editText.trim()) setItems(items.map((it, idx) => idx === i ? editText.trim() : it));
                    setEditingIdx(null);
                  }}
                  className="flex-1 rounded-lg border border-primary/50 bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <span className="text-sm text-foreground flex-1">{item}</span>
              )}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setOpenActionMenu(openActionMenu === `item-${i}` ? null : `item-${i}`)}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
                {openActionMenu === `item-${i}` && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenu(null)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                      <button
                        onClick={() => { setEditingIdx(i); setEditText(item); setOpenActionMenu(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Edit
                      </button>
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={() => { removeItem(i); setOpenActionMenu(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}

          {items.length < 10 && (
            <div className="relative">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  autoFocus
                  value={newItem}
                  onChange={(e) => { setNewItem(e.target.value); setShowSuggestions(true); setHighlightIdx(-1); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (highlightIdx >= 0 && suggestions[highlightIdx]) {
                        setNewItem(suggestions[highlightIdx]);
                        setShowSuggestions(false);
                        setHighlightIdx(-1);
                      } else {
                        addItem();
                      }
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightIdx((prev) => Math.max(prev - 1, -1));
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                    }
                  }}
                  placeholder={`Thing #${items.length + 1} to try…`}
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button onClick={addItem} className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div ref={suggestionsRef} className="absolute left-0 right-10 top-full mt-1 z-20 rounded-xl border border-border bg-card shadow-lg overflow-y-auto max-h-48">
                  {suggestions.map((s, i) => (
                    <button
                      key={s}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNewItem(s);
                        setShowSuggestions(false);
                        inputRef.current?.focus();
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        i === highlightIdx ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{items.length}/10 items</p>
          <button
            onClick={sendProposal}
            disabled={items.length === 0 || sending}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send to Partner
          </button>
        </div>
      </motion.div>
    );
  }

  // Idle — show start button (hide when pendingOnly mode)
  if (pendingOnly) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setMode("creating")}
      className="w-full rounded-2xl border border-us-coral/20 bg-gradient-to-br from-us-coral/5 to-us-blush/10 p-4 flex items-center gap-3 hover:border-us-coral/40 transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-us-coral/10 flex items-center justify-center group-hover:bg-us-coral/20 transition-colors">
        <Flame className="w-5 h-5 text-us-coral" />
      </div>
      <div className="text-left flex-1">
        <h3 className="font-display text-sm font-bold text-foreground">Sex Bucket Challenge</h3>
        <p className="text-[13px] text-muted-foreground">Propose 10 things to try — your partner picks 5</p>
      </div>
      <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </motion.button>
  );
};

export default SexBucketList;
