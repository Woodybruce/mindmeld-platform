import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const vibes = [
  { emoji: "🤗", label: "Hug" },
  { emoji: "💋", label: "Kiss" },
  { emoji: "❤️", label: "Love" },
  { emoji: "🖕", label: "Finger" },
  { emoji: "👅", label: "Oral" },
  { emoji: "👉", label: "Poke" },
];

const SendVibeButton = () => {
  const [open, setOpen] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const send = (emoji: string, label: string) => {
    setLastSent(emoji);
    setOpen(false);
    toast({ title: `${emoji} ${label} sent to your partner!` });
    setTimeout(() => setLastSent(null), 2000);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary/15 to-accent/20 border border-border/50 px-4 py-2.5 text-sm font-semibold text-foreground hover:scale-[1.02] active:scale-[0.98] transition-transform w-full"
      >
        <Heart className="w-4 h-4 text-primary" />
        <span className="flex-1 text-left">Send a vibe</span>
        {lastSent && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1.3 }}
            exit={{ scale: 0 }}
            className="text-lg"
          >
            {lastSent}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 bottom-full mb-2 z-50 rounded-2xl border border-border bg-card shadow-lg p-2"
          >
            <div className="grid grid-cols-3 gap-1">
              {vibes.map((v) => (
                <button
                  key={v.label}
                  onClick={() => send(v.emoji, v.label)}
                  className="flex flex-col items-center gap-1 rounded-xl py-2.5 px-2 hover:bg-accent/50 active:scale-95 transition-all"
                >
                  <span className="text-2xl">{v.emoji}</span>
                  <span className="text-[10px] font-medium text-muted-foreground">{v.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SendVibeButton;
