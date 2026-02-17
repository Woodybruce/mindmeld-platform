import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const moods = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😍", label: "Loved" },
  { emoji: "😌", label: "Calm" },
  { emoji: "😤", label: "Stressed" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🤩", label: "Excited" },
  { emoji: "😐", label: "Meh" },
];

const MoodCheckinWidget = () => {
  const { user, profile } = useAuth();
  const [myMood, setMyMood] = useState<string | null>(null);
  const [partnerMood, setPartnerMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    // Fetch my mood today
    supabase
      .from("mood_checkins")
      .select("mood")
      .eq("user_id", user.id)
      .eq("check_date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMyMood((data as any).mood);
      });

    // Fetch partner mood
    if (profile?.partner_id) {
      supabase
        .from("mood_checkins")
        .select("mood")
        .eq("user_id", profile.partner_id)
        .eq("check_date", today)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setPartnerMood((data as any).mood);
        });
    }
  }, [user, profile, today]);

  // Realtime partner mood updates
  useEffect(() => {
    if (!profile?.partner_id) return;
    const channel = supabase
      .channel("mood-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mood_checkins", filter: `user_id=eq.${profile.partner_id}` },
        (payload) => {
          const row = payload.new as any;
          if (row?.check_date === today) setPartnerMood(row.mood);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.partner_id, today]);

  const selectMood = async (emoji: string) => {
    if (!user || saving) return;
    setSaving(true);
    setMyMood(emoji);

    const { error } = await supabase
      .from("mood_checkins")
      .upsert(
        { user_id: user.id, mood: emoji, check_date: today } as any,
        { onConflict: "user_id,check_date" }
      );

    if (error) console.error("Mood save error:", error);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How are you feeling?</span>
        {partnerMood && (
          <div className="flex items-center gap-1.5 bg-secondary rounded-full px-2.5 py-1">
            <span className="text-xs text-muted-foreground">Partner:</span>
            <span className="text-lg">{partnerMood}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-8 gap-1">
        {moods.map(({ emoji, label }) => (
          <button
            key={emoji}
            onClick={() => selectMood(emoji)}
            className={`flex flex-col items-center gap-0.5 rounded-xl p-1.5 transition-all ${
              myMood === emoji
                ? "bg-primary/15 scale-110 ring-2 ring-primary/30"
                : "hover:bg-secondary active:scale-95"
            }`}
            title={label}
          >
            <span className="text-xl">{emoji}</span>
            <span className="text-[8px] text-muted-foreground leading-none">{label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default MoodCheckinWidget;
