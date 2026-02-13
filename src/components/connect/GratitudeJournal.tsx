import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Plus, Send } from "lucide-react";

interface GratitudeEntry {
  id: string;
  text: string;
  date: string;
  author: string;
}

const mockEntries: GratitudeEntry[] = [
  { id: "1", text: "Thank you for making me laugh when I was stressed today ❤️", date: "Today", author: "You" },
  { id: "2", text: "I'm grateful you always remember the little things", date: "Yesterday", author: "Partner" },
  { id: "3", text: "The surprise coffee this morning made my whole day ☕", date: "2 days ago", author: "You" },
];

const GratitudeJournal = () => {
  const [entries, setEntries] = useState<GratitudeEntry[]>(mockEntries);
  const [newEntry, setNewEntry] = useState("");

  const addEntry = () => {
    if (!newEntry.trim()) return;
    setEntries([
      { id: Date.now().toString(), text: newEntry.trim(), date: "Just now", author: "You" },
      ...entries,
    ]);
    setNewEntry("");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Express appreciation for each other</p>

      {/* Add new entry */}
      <div className="flex gap-2">
        <input
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addEntry()}
          placeholder="I'm grateful for…"
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          onClick={addEntry}
          disabled={!newEntry.trim()}
          className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground disabled:opacity-40 transition-opacity"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border/50 bg-card p-3.5"
          >
            <div className="flex items-start gap-2.5">
              <Heart className="w-4 h-4 text-us-coral mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{entry.text}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-muted-foreground">{entry.author}</span>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground">{entry.date}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default GratitudeJournal;
