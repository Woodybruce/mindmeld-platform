import { useState } from "react";
import { X, CalendarPlus } from "lucide-react";
import { motion } from "framer-motion";
import LocationAutocomplete from "@/components/ui/LocationAutocomplete";

interface EventComposerProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: { title: string; date: string; time: string; location?: string }) => void;
}

const EventComposer = ({ open, onClose, onSend }: EventComposerProps) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  const canSend = title.trim() && date;

  const handleSend = () => {
    if (!canSend) return;
    onSend({
      title: title.trim(),
      date,
      time,
      location: location.trim() || undefined,
    });
    setTitle("");
    setDate("");
    setTime("");
    setLocation("");
    onClose();
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-card rounded-t-3xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-foreground font-body">Create Event</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event name…"
          className="w-full bg-secondary/60 border border-border/30 rounded-2xl px-4 py-3 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-secondary/60 border border-border/30 rounded-xl px-3 py-2.5 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-secondary/60 border border-border/30 rounded-xl px-3 py-2.5 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <LocationAutocomplete
          value={location}
          onChange={setLocation}
          placeholder="Search location (optional)"
          className="bg-secondary/60 border border-border/30 rounded-2xl pr-4 py-3 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20"
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full py-3.5 rounded-2xl bg-[hsl(var(--us-navy))] text-white font-semibold text-[14px] disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <CalendarPlus className="w-4 h-4" />
          Send Event
        </button>
      </motion.div>
    </motion.div>
  );
};

export default EventComposer;
