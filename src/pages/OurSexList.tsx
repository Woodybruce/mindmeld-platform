import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, X, Check, Lock, ExternalLink, CheckCircle2 } from "lucide-react";

interface CheckItem {
  id: string;
  text: string;
  done: boolean;
}

interface TextItem {
  id: string;
  text: string;
}

interface LinkItem {
  id: string;
  url: string;
  label: string;
}

interface SexListData {
  goodSexLife: CheckItem[];
  motivations: CheckItem[];
  dontLike: CheckItem[];
  likeOrHaveLiked: TextItem[];
  likeToTry: TextItem[];
  ideas: LinkItem[];
}

const STORAGE_KEY = "our-sex-list-data";

const defaultData: SexListData = {
  goodSexLife: [
    { id: "g1", text: "Not valued on frequency", done: false },
    { id: "g2", text: "Intimate", done: false },
    { id: "g3", text: "More pleasure", done: false },
    { id: "g4", text: "More novel", done: false },
    { id: "g5", text: "More variety", done: false },
    { id: "g6", text: "More playful", done: false },
    { id: "g7", text: "Relaxed / easy / no pressure", done: false },
    { id: "g8", text: "Connected", done: false },
    { id: "g9", text: "Equality", done: false },
    { id: "g10", text: "Exploration", done: false },
    { id: "g11", text: "Trust", done: false },
    { id: "g12", text: "Communication", done: false },
    { id: "g13", text: "Responsive — communal giving and strength. Give without receiving", done: false },
    { id: "g14", text: "Organised, attentive, like to plan", done: false },
  ],
  motivations: [
    { id: "m1", text: "Pleasure", done: false },
    { id: "m2", text: "Fun", done: false },
    { id: "m3", text: "Enjoyment", done: false },
    { id: "m4", text: "Become closer together", done: false },
  ],
  dontLike: [
    { id: "dl1", text: "Hygiene", done: false },
  ],
  likeOrHaveLiked: [
    { id: "l1", text: "Toys" },
    { id: "l2", text: "Flirting" },
    { id: "l3", text: "Massage" },
  ],
  likeToTry: [
    { id: "lt1", text: "Shower together" },
    { id: "lt2", text: "Planned and pre organised" },
    { id: "lt3", text: "Tie up / Bondage" },
    { id: "lt4", text: "Role play" },
  ],
  ideas: [
    { id: "i1", url: "https://susanbratton.com/", label: "Susan Bratton" },
    { id: "i2", url: "https://openmityromance.com/", label: "Open Mity Romance" },
    { id: "i3", url: "https://beautifulspace.org/packages", label: "Beautiful Space" },
  ],
};

const uid = () => crypto.randomUUID().slice(0, 8);

const OurSexList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<SexListData>(defaultData);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setData(JSON.parse(stored));
  }, []);

  const save = (next: SexListData) => {
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggleCheck = (section: "goodSexLife" | "motivations" | "dontLike", id: string) => {
    save({ ...data, [section]: data[section].map((i) => (i.id === id ? { ...i, done: !i.done } : i)) });
  };

  const addCheckItem = (section: "goodSexLife" | "motivations" | "dontLike") => {
    if (!newText.trim()) return;
    save({ ...data, [section]: [...data[section], { id: uid(), text: newText.trim(), done: false }] });
    setNewText("");
    setAddingTo(null);
  };

  const removeCheckItem = (section: "goodSexLife" | "motivations" | "dontLike", id: string) => {
    save({ ...data, [section]: data[section].filter((i) => i.id !== id) });
  };

  const addTextItem = (section: "likeOrHaveLiked" | "likeToTry") => {
    if (!newText.trim()) return;
    save({ ...data, [section]: [...data[section], { id: uid(), text: newText.trim() }] });
    setNewText("");
    setAddingTo(null);
  };

  const removeTextItem = (section: "likeOrHaveLiked" | "likeToTry", id: string) => {
    save({ ...data, [section]: data[section].filter((i) => i.id !== id) });
  };

  const addLink = () => {
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http")) url = `https://${url}`;
    const label = new URL(url).hostname.replace("www.", "");
    save({ ...data, ideas: [...data.ideas, { id: uid(), url, label }] });
    setNewUrl("");
    setAddingTo(null);
  };

  const removeLink = (id: string) => {
    save({ ...data, ideas: data.ideas.filter((i) => i.id !== id) });
  };

  const SectionHeader = ({ emoji, title }: { emoji: string; title: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-lg">{emoji}</span>
      <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">{title}</h2>
    </div>
  );

  const AddButton = ({ label, sectionKey }: { label: string; sectionKey: string }) => (
    <button onClick={() => { setAddingTo(sectionKey); setNewText(""); setNewUrl(""); }} className="flex items-center gap-2 text-xs text-primary font-medium hover:text-primary/80 transition-colors mt-1">
      <Plus className="w-3.5 h-3.5" /> {label}
    </button>
  );

  const InlineInput = ({ placeholder, onSubmit, value, onChange }: { placeholder: string; onSubmit: () => void; value: string; onChange: (v: string) => void }) => (
    <div className="flex gap-2">
      <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSubmit()} placeholder={placeholder}
        className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      <button onClick={onSubmit} className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground"><Check className="w-4 h-4" /></button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-8">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/us")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">Our Sex List</h1>
            <p className="text-[11px] text-muted-foreground">Private & honest</p>
          </div>
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
      </header>

      <div className="px-4 py-5 space-y-6">
        {/* Good Sex Life */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <SectionHeader emoji="💫" title="What we feel is a good sex life" />
          <div className="space-y-2">
            {data.goodSexLife.map((item, i) => (
              <motion.button key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => toggleCheck("goodSexLife", item.id)}
                className="w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 text-left group">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.done ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                  {item.done && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <p className={`text-sm flex-1 ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.text}</p>
                <button onClick={(e) => { e.stopPropagation(); removeCheckItem("goodSexLife", item.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.button>
            ))}
            {addingTo === "goodSexLife" ? <InlineInput placeholder="Add a value…" onSubmit={() => addCheckItem("goodSexLife")} value={newText} onChange={setNewText} /> : <AddButton label="Add value" sectionKey="goodSexLife" />}
          </div>
        </motion.section>

        {/* Motivations */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SectionHeader emoji="🔥" title="What are our motivations for sex?" />
          <div className="space-y-2">
            {data.motivations.map((item, i) => (
              <motion.button key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => toggleCheck("motivations", item.id)}
                className="w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 text-left group">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.done ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                  {item.done && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <p className={`text-sm flex-1 ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.text}</p>
                <button onClick={(e) => { e.stopPropagation(); removeCheckItem("motivations", item.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.button>
            ))}
            {addingTo === "motivations" ? <InlineInput placeholder="Add motivation…" onSubmit={() => addCheckItem("motivations")} value={newText} onChange={setNewText} /> : <AddButton label="Add motivation" sectionKey="motivations" />}
          </div>
        </motion.section>

        {/* Don't Like */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <SectionHeader emoji="🚫" title="Preferences Don't Like" />
          <div className="space-y-2">
            {data.dontLike.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 group">
                <p className="text-sm text-foreground flex-1">{item.text}</p>
                <button onClick={() => removeCheckItem("dontLike", item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
            {addingTo === "dontLike" ? <InlineInput placeholder="Add boundary…" onSubmit={() => addCheckItem("dontLike")} value={newText} onChange={setNewText} /> : <AddButton label="Add boundary" sectionKey="dontLike" />}
          </div>
        </motion.section>

        {/* Like or have liked */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <SectionHeader emoji="💕" title="Preferences Like or have liked" />
          <div className="space-y-2">
            {data.likeOrHaveLiked.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 group">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-sm text-foreground flex-1">{item.text}</p>
                <button onClick={() => removeTextItem("likeOrHaveLiked", item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
            {addingTo === "likeOrHaveLiked" ? <InlineInput placeholder="Add preference…" onSubmit={() => addTextItem("likeOrHaveLiked")} value={newText} onChange={setNewText} /> : <AddButton label="Add preference" sectionKey="likeOrHaveLiked" />}
          </div>
        </motion.section>

        {/* Like to try */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <SectionHeader emoji="✨" title="Like to try" />
          <div className="space-y-2">
            {data.likeToTry.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 rounded-xl border border-us-gold/20 bg-us-gold/5 px-4 py-3 group">
                <span className="text-sm">🌟</span>
                <p className="text-sm text-foreground flex-1">{item.text}</p>
                <button onClick={() => removeTextItem("likeToTry", item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
            {addingTo === "likeToTry" ? <InlineInput placeholder="Something to try…" onSubmit={() => addTextItem("likeToTry")} value={newText} onChange={setNewText} /> : <AddButton label="Add idea" sectionKey="likeToTry" />}
          </div>
        </motion.section>

        {/* Ideas / Links */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <SectionHeader emoji="💡" title="Ideas & Resources" />
          <div className="space-y-2">
            {data.ideas.map((link, i) => (
              <motion.div key={link.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 group">
                <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex-1 truncate">{link.label}</a>
                <button onClick={() => removeLink(link.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
            {addingTo === "ideas" ? (
              <div className="flex gap-2">
                <input autoFocus value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLink()} placeholder="https://…"
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <button onClick={addLink} className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground"><Check className="w-4 h-4" /></button>
              </div>
            ) : <AddButton label="Add link" sectionKey="ideas" />}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default OurSexList;
