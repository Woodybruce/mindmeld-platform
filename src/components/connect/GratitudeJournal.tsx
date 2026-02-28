import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Send, Sparkles, Quote } from "lucide-react";

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

// Love language insights & stories as gratitude inspiration
const inspirations = [
  { emoji: "💬", text: "Be specific. 'You're amazing' is nice, but 'You handled that meeting like a pro' feels more personal." },
  { emoji: "⏰", text: "Schedule intentional time together — presence matters more than spontaneity." },
  { emoji: "🎁", text: "It's not about cost — it's about thoughtfulness and meaning. What small gift would show you really see them?" },
  { emoji: "🤲", text: "Helping is loving. Actions speak louder than words. What can you take off their plate today?" },
  { emoji: "🫂", text: "Physical closeness is an emotional safe zone. A long, silent hug says 'I've got you' more than words." },
];

const stories = [
  { emoji: "💬", story: "I complimented my partner on how thoughtfully she packed our kids' lunch boxes. Her face lit up — that moment helped me realize affirming her efforts really filled her love tank." },
  { emoji: "⏰", story: "We started Sunday morning walks during the pandemic. No phones, no agenda, just coffee in hand and conversation. It became our favourite ritual." },
  { emoji: "⏰", story: "One night we turned off the TV and just sat on the balcony talking about childhood memories. It started casual but turned into two hours full of laughter and even a few tears." },
  { emoji: "🎁", story: "Instead of buying something fancy, I made a '52 Reasons Why I Love You' deck. He teared up flipping through it — and still pulls it out when we're apart." },
  { emoji: "🤲", story: "When we had a newborn, he cleaned the entire apartment and prepared lunch while I napped. I cried — not because of the food, but because I felt deeply understood." },
  { emoji: "🫂", story: "Sometimes after a hard day, he'll just pull me into a long, silent hug. No words. Just arms. That kind of touch doesn't fix the problem, but it makes me feel I don't face it alone." },
];

const GratitudeJournal = () => {
  const [entries, setEntries] = useState<GratitudeEntry[]>(mockEntries);
  const [newEntry, setNewEntry] = useState("");
  const [showInspiration, setShowInspiration] = useState(false);

  const addEntry = () => {
    if (!newEntry.trim()) return;
    setEntries([
      { id: Date.now().toString(), text: newEntry.trim(), date: "Just now", author: "You" },
      ...entries,
    ]);
    setNewEntry("");
  };

  // Pick a random inspiration and story
  const randomInspiration = inspirations[Math.floor(Date.now() / 86400000) % inspirations.length];
  const randomStory = stories[Math.floor(Date.now() / 86400000 + 3) % stories.length];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Express appreciation for each other</p>

      {/* Daily inspiration from love languages */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-4"
      >
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-primary uppercase tracking-wider mb-1">Daily Love Tip</p>
            <p className="text-sm text-foreground leading-relaxed">
              {randomInspiration.emoji} {randomInspiration.text}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Real story */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onClick={() => setShowInspiration(!showInspiration)}
        className="w-full rounded-xl border border-border/50 bg-card p-4 text-left"
      >
        <div className="flex items-start gap-2.5">
          <Quote className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Real Story</p>
            <p className="text-sm text-foreground/80 leading-relaxed italic">
              "{randomStory.story}"
            </p>
          </div>
        </div>
      </motion.button>

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
                  <span className="text-[13px] text-muted-foreground">{entry.author}</span>
                  <span className="text-[13px] text-muted-foreground">·</span>
                  <span className="text-[13px] text-muted-foreground">{entry.date}</span>
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
