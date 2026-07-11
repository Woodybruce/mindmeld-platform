import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Flame, Shuffle, Check, CalendarPlus, Loader2, Sparkles, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedLists } from "@/hooks/useSharedLists";
import { notifyPartner } from "@/lib/notifyPartner";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { localDateKeyFromTimestamp } from "@/lib/dateKey";

type GamePhase = "loading" | "no-list" | "draw" | "reveal" | "confirm" | "schedule" | "done";

interface DrawnItem {
  text: string;
  locked: boolean;
}

const SexBucketGame = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { lists, loading: listsLoading } = useSharedLists();
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [allItems, setAllItems] = useState<string[]>([]);
  const [drawn, setDrawn] = useState<DrawnItem[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [scheduleDates, setScheduleDates] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    // Wait for the lists to actually load before deciding "no list yet",
    // otherwise an empty-but-still-loading list array spins forever.
    if (listsLoading) return;

    const ideasList = lists.find((l) => l.template === "sex-bucket-ideas" || l.name?.toLowerCase().includes("sex bucket challenge ideas"));

    if (!ideasList || ideasList.items.filter((i) => !i.isHeading && !i.done).length < 5) {
      setPhase("no-list");
      return;
    }

    const available = ideasList.items
      .filter((i) => !i.isHeading && !i.done)
      .map((i) => i.text);
    setAllItems(available);
    setPhase("draw");
  }, [lists, listsLoading]);

  const drawItems = useCallback(() => {
    // Notify the partner on the explicit "start" action (first draw) rather than
    // on mount — this avoids spamming, and works even if the profile loads late.
    if (!notified && profile?.partner_id) {
      setNotified(true);
      notifyPartner({
        partnerId: profile.partner_id,
        title: "🔥 Sex Bucket Challenge!",
        body: `${profile?.username || "Your partner"} started the Sex Bucket Challenge`,
        route: "/sex-bucket-game",
      });
    }

    const shuffled = [...allItems].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 5).map((text) => ({ text, locked: false }));
    setDrawn(picked);
    setRevealedCount(0);
    setPhase("reveal");

    // Reveal one by one
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setRevealedCount(count);
      if (count >= 5) {
        clearInterval(interval);
        setTimeout(() => setPhase("confirm"), 600);
      }
    }, 800);
  }, [allItems, notified, profile]);

  const swapItem = (index: number) => {
    if (drawn[index].locked) return;
    const usedTexts = new Set(drawn.map((d) => d.text));
    const available = allItems.filter((t) => !usedTexts.has(t));
    if (available.length === 0) {
      toast({ title: "No more items to swap!" });
      return;
    }
    const replacement = available[Math.floor(Math.random() * available.length)];
    setDrawn((prev) =>
      prev.map((item, i) => (i === index ? { text: replacement, locked: false } : item))
    );
  };

  const toggleLock = (index: number) => {
    setDrawn((prev) =>
      prev.map((item, i) => (i === index ? { ...item, locked: !item.locked } : item))
    );
  };

  const confirmSelection = () => {
    setPhase("schedule");
  };

  const scheduleAll = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Add each item as a calendar event
      const events = drawn.map((item, i) => {
        const dateStr = scheduleDates[i];
        if (!dateStr) return null;
        const startTime = new Date(dateStr);
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 2);

        return {
          user_id: user.id,
          subject: `🔥 ${item.text}`,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          source: "sex-bucket",
          is_all_day: false,
        };
      }).filter(Boolean);

      if (events.length === 0) {
        toast({ title: "Set at least one date!", variant: "destructive" });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("calendar_events").insert(events as any);
      if (error) throw error;

      // Add ALL scheduled items as weekly tasks on their scheduled date
      // (rollover_weekly_tasks will move undone ones to the next day automatically)
      for (const item of drawn) {
        const idx = drawn.indexOf(item);
        const dateStr = scheduleDates[idx];
        if (!dateStr) continue;
        const taskDate = localDateKeyFromTimestamp(dateStr);
        await supabase.from("weekly_tasks").insert({
          user_id: user.id,
          text: `🔥 ${item.text}`,
          scheduled_date: taskDate,
          sort_order: 999,
          source: "sex-bucket",
        } as any);
      }

      toast({ title: "🔥 Challenge scheduled!", description: `${events.length} items added to your calendar` });
      setPhase("done");
    } catch (e) {
      console.error(e);
      toast({ title: "Error scheduling", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/us?tab=games")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <Flame className="w-5 h-5 text-destructive" /> Sex Bucket Challenge
            </h1>
            <p className="text-[13px] text-muted-foreground">5 random ideas from your bucket list</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 pb-28">
        {/* Loading */}
        {phase === "loading" && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No list */}
        {phase === "no-list" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 space-y-4"
          >
            <Flame className="w-16 h-16 mx-auto text-muted-foreground/30" />
            <h2 className="font-display text-xl font-bold text-foreground">No Sex Bucket Challenge Ideas list yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Create a Sex Bucket Challenge Ideas list first with at least 5 items — the game will randomly draw from it.
            </p>
            <button
              onClick={() => navigate("/us?tab=lists")}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Go to Lists
            </button>
          </motion.div>
        )}

        {/* Draw phase */}
        {phase === "draw" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 space-y-6"
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Flame className="w-24 h-24 mx-auto text-destructive" />
            </motion.div>
            <h2 className="font-display text-2xl font-bold text-foreground">Ready to play?</h2>
            <p className="text-sm text-muted-foreground">
              We'll draw 5 random ideas from your Sex To Do list
            </p>
            <p className="text-xs text-muted-foreground">
              {allItems.length} items available
            </p>
            <button
              onClick={drawItems}
              className="rounded-2xl bg-gradient-to-r from-destructive to-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-lg hover:shadow-xl transition-shadow"
            >
              <span className="flex items-center gap-2">
                <Shuffle className="w-5 h-5" /> Draw 5 Ideas
              </span>
            </button>
          </motion.div>
        )}

        {/* Reveal phase */}
        {(phase === "reveal" || phase === "confirm") && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="font-display text-xl font-bold text-foreground">
                {phase === "reveal" ? "Drawing..." : "Your 5 Challenges 🔥"}
              </h2>
              {phase === "confirm" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Tap to lock, or swap items you don't want
                </p>
              )}
            </div>

            <div className="space-y-3">
              {drawn.map((item, i) => {
                const isRevealed = i < revealedCount;
                return (
                  <AnimatePresence key={i}>
                    {isRevealed ? (
                      <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.8, rotateX: -30 }}
                        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className={`rounded-2xl border-2 p-4 transition-colors ${
                          item.locked
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                            item.locked ? "bg-primary text-primary-foreground" : "bg-destructive/10 text-destructive"
                          }`}>
                            {i + 1}
                          </div>
                          <p className="flex-1 text-sm font-medium text-foreground">{item.text}</p>
                          {phase === "confirm" && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleLock(i)}
                                className={`p-2 rounded-lg transition-colors ${
                                  item.locked ? "bg-primary/20 text-primary" : "hover:bg-secondary text-muted-foreground"
                                }`}
                                title={item.locked ? "Unlock" : "Lock"}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => swapItem(i)}
                                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                                title="Swap for another"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-border/50 bg-secondary/30 p-4 h-[72px] flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-muted-foreground/40 animate-pulse" />
                      </div>
                    )}
                  </AnimatePresence>
                );
              })}
            </div>

            {phase === "confirm" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3 pt-4"
              >
                <button
                  onClick={drawItems}
                  className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Shuffle className="w-4 h-4" /> Redraw All
                  </span>
                </button>
                <button
                  onClick={confirmSelection}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    <CalendarPlus className="w-4 h-4" /> Schedule These
                  </span>
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* Schedule phase */}
        {phase === "schedule" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <h2 className="font-display text-xl font-bold text-foreground">Schedule Your Challenges</h2>
              <p className="text-xs text-muted-foreground mt-1">Pick a date & time for each one</p>
            </div>

            <div className="space-y-3">
              {drawn.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-border bg-card p-4 space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </div>
                    <p className="flex-1 text-sm font-medium text-foreground">{item.text}</p>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduleDates[i] || ""}
                    onChange={(e) => setScheduleDates((prev) => ({ ...prev, [i]: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </motion.div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setPhase("confirm")}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={scheduleAll}
                disabled={saving || Object.keys(scheduleDates).length === 0}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Confirm & Schedule
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Done */}
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 space-y-6"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: 3, duration: 0.6 }}
            >
              <span className="text-6xl">🔥</span>
            </motion.div>
            <h2 className="font-display text-2xl font-bold text-foreground">Challenge Accepted!</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Your 5 challenges are scheduled. Check your calendar and weekly list to stay on track.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setPhase("draw"); setScheduleDates({}); }}
                className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={() => navigate("/us?tab=lists")}
                className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
              >
                View Lists
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SexBucketGame;
