import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Calendar, Edit2, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format, addYears, isPast, parseISO } from "date-fns";

const AnniversaryCountdown = () => {
  const { user } = useAuth();
  const [anniversaryDate, setAnniversaryDate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("anniversary_date")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const d = data?.anniversary_date;
        if (d) {
          setAnniversaryDate(d);
          setDateInput(d);
        }
      });
  }, [user]);

  const saveDate = async () => {
    if (!user || !dateInput) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ anniversary_date: dateInput })
      .eq("id", user.id);
    setAnniversaryDate(dateInput);
    setEditing(false);
    setSaving(false);
  };

  if (!anniversaryDate && !editing) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setEditing(true)}
        className="w-full rounded-2xl border border-dashed border-border bg-card/50 p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Heart className="w-5 h-5 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">Set your anniversary date</p>
          <p className="text-[11px] text-muted-foreground">Track milestones together</p>
        </div>
      </motion.button>
    );
  }

  if (editing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-4 space-y-3"
      >
        <p className="text-sm font-semibold text-foreground">When did you get together?</p>
        <input
          type="date"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <div className="flex gap-2">
          <button
            onClick={saveDate}
            disabled={saving || !dateInput}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    );
  }

  // Calculate countdown
  const anniversary = parseISO(anniversaryDate!);
  const now = new Date();
  let nextAnniversary = new Date(now.getFullYear(), anniversary.getMonth(), anniversary.getDate());
  if (isPast(nextAnniversary) && differenceInDays(now, nextAnniversary) > 0) {
    nextAnniversary = addYears(nextAnniversary, 1);
  }
  const daysUntil = differenceInDays(nextAnniversary, now);
  const yearsTotal = nextAnniversary.getFullYear() - anniversary.getFullYear();
  const totalDaysTogether = differenceInDays(now, anniversary);
  const isToday = daysUntil === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/10 p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary fill-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anniversary</span>
        </div>
        <button onClick={() => setEditing(true)} className="p-1 rounded-full hover:bg-secondary transition-colors">
          <Edit2 className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      {isToday ? (
        <div className="text-center py-2">
          <span className="text-3xl">🎉</span>
          <p className="text-lg font-bold text-foreground mt-1">Happy {yearsTotal} Year Anniversary!</p>
          <p className="text-xs text-muted-foreground">{totalDaysTogether.toLocaleString()} days together</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-3xl font-bold text-primary">{daysUntil}</span>
            <p className="text-[12px] text-muted-foreground">days until</p>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {yearsTotal} Year Anniversary
            </p>
            <p className="text-xs text-muted-foreground">
              {format(nextAnniversary, "d MMMM yyyy")}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {totalDaysTogether.toLocaleString()} days together ❤️
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AnniversaryCountdown;
