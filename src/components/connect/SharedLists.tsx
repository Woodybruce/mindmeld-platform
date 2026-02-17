import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, ChevronRight, ChevronDown, ListChecks, Calendar, Target, Zap, Paperclip, Image, CalendarPlus, Eye, EyeOff, RefreshCw, TrendingUp, Sparkles, Loader2, Heart, Pencil, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SexBucketList from "./SexBucketList";

export interface ListItemAttachment {
  type: "photo" | "file" | "event";
  url?: string;
  name?: string;
  date?: string;
}

export interface ListItem {
  id: string;
  text: string;
  done: boolean;
  isHeading?: boolean;
  attachments?: ListItemAttachment[];
}

export interface ScoreSnapshot {
  takenAt: string;
  answers: Record<string, number | string>;
  milestone: number; // 0, 25, 50, 75, 100
}

export interface UserList {
  id: string;
  name: string;
  icon: string;
  items: ListItem[];
  createdAt: string;
  template?: string;
  /** Maximum number of items allowed */
  maxItems?: number;
  /** Whether AI suggestions are available */
  aiSuggestable?: boolean;
  /** For checklist quizzes: score sections stored separately */
  scoreData?: {
    sections: { title: string; items: { id: string; text: string; type: string; choices?: string[] }[] }[];
    snapshots: ScoreSnapshot[];
  };
}

const sexListDefaultItems = [
  "## What we feel is a good sex life",
  "Not valued on frequency",
  "Intimate",
  "More pleasure",
  "More novel",
  "More variety",
  "More playful",
  "Relaxed / easy / no pressure",
  "Connected",
  "Equality",
  "Exploration",
  "Trust",
  "Communication",
  "Responsive — communal giving and strength. Give without receiving",
  "Organised, attentive, like to plan",
  "## What are our motivations for sex?",
  "Pleasure",
  "Fun",
  "Enjoyment",
  "Become closer together",
  "## Preferences Don't Like",
  "Pubic hair",
  "## Preferences Like or have liked",
  "Pretty much everything - prefer you to orgasm",
  "Oral sex",
  "Toys",
  "Flirting",
  "You masturbating with toy",
  "Massage leading to sex",
  "## Our Top 10 Priorities",
  "## How do we hit our priorities",
  "## Ideas & Resources",
];

const togetherListDefaultItems = [
  "## Our top 3 things we should do together",
  "Date night every week",
  "Go away once every month together",
  "## Things we would like to do together",
  "Dancing",
  "Go see an act",
  "Paint / draw each other",
  "Pottery class together",
  "Go to 2 art Galleries",
  "## Trips we want to do",
  "Scottish Lakes",
  "Amalfi coast",
  "Colondor hotel",
  "Amsterdam",
  "Scotland lake house",
  "Comporta Portugal",
  "## Things we have done together",
];

const challengesListDefaultItems = [
  "## Our challenges in our relationship",
  "Communication Both",
  "Judgment of woody",
  "Rejection physical and time together woody",
  "Doesn't feel safe due to reaction Helen",
  "Thinks woody going to leave Helen",
  "ADHD Family Helen",
  "Dismissive of problems Helen",
  "Judgmental of problems Woody",
  "Not Prioritising Woody",
  "Intimacy",
  "Phone use - Being present",
  "## What we are doing to solve them",
  "Open ourselves to one another unconditionally",
  "Boundaries for the girls. Say NO",
  "Be supportive and grateful for each other",
  "Able to ask and respond without judgment",
  "Agree to be able to disagree",
  "Talk with truth - Woody makes stuff up",
  "Repair after any conflict with discussion",
  "Prioritise our relationship over everything else",
  "Phone down and be present",
  "Try to maintain family support",
  "Learn how to comfort Helen about her dad",
  "Manage family workload / tasks",
  "Embrace and kiss for 10 seconds everyday you leave or reunite",
  "Say I love you",
  "Spend time together doing things without the girls",
  "Focus on our physical and sexual connection",
  "## What have we solved and how",
  "Made a One note app to use",
  "Go to Hotel for night away",
];

const templates = [
  // Pinned
  {
    id: "long-term-goals",
    name: "Our Long-Term Goals",
    icon: "⭐",
    description: "5 major life goals to celebrate together",
    gradient: "bg-gradient-to-br from-us-gold/20 to-us-cream/25",
    lucideIcon: Target,
    category: "pinned" as const,
    defaultItems: [
      "## Our 5 Long-Term Goals",
      "## How we'll achieve them",
    ],
    maxItems: 5,
  },
  // Core templates
  {
    id: "sex-list",
    name: "Our Sex List",
    icon: "🔥",
    description: "Private & honest intimacy list",
    gradient: "bg-gradient-to-br from-us-coral/15 to-us-blush/20",
    lucideIcon: Heart,
    category: "core" as const,
    defaultItems: sexListDefaultItems,
  },
  {
    id: "challenges-list",
    name: "Our Challenges",
    icon: "💪",
    description: "Track & solve relationship challenges",
    gradient: "bg-gradient-to-br from-us-blush/15 to-us-coral/20",
    lucideIcon: Target,
    category: "core" as const,
    defaultItems: challengesListDefaultItems,
  },
  {
    id: "intimacy",
    name: "Our Intimacy",
    icon: "🌹",
    description: "Deepen physical & emotional closeness",
    gradient: "bg-gradient-to-br from-us-coral/20 to-us-blush/15",
    lucideIcon: Heart,
    category: "core" as const,
    defaultItems: [
      "## What intimacy means to us",
      "Feeling emotionally safe with each other",
      "Physical affection beyond just sex",
      "Being vulnerable without fear of judgment",
      "Prioritising quality time alone together",
      "Feeling desired and wanted",
      "## Daily intimacy habits",
      "10-second kiss when we leave or reunite",
      "Hold hands or touch when sitting together",
      "Say 'I love you' and mean it every day",
      "Compliment each other genuinely",
      "Ask about each other's day and truly listen",
      "Cuddle without it needing to lead anywhere",
      "## Things we want to explore together",
      "Massage nights with no expectations",
      "Write each other love letters or notes",
      "Try a new date experience monthly",
      "Read or listen to a relationship book together",
      "Share fantasies without judgment",
      "## Barriers to intimacy we want to address",
      "Stress and tiredness from daily life",
      "Screen time eating into couple time",
      "Feeling disconnected after conflict",
      "Not making time for just us",
    ],
  },
  {
    id: "communication",
    name: "Our Communication",
    icon: "💬",
    description: "How we talk, listen & repair",
    gradient: "bg-gradient-to-br from-us-sage/20 to-us-blush/15",
    lucideIcon: Heart,
    category: "core" as const,
    defaultItems: [
      "## Our communication ground rules",
      "Listen to understand, not to respond",
      "No raising voices — pause if it escalates",
      "Use 'I feel…' instead of 'You always…'",
      "No bringing up past arguments in new ones",
      "Put phones down during important conversations",
      "It's okay to say 'I need a moment' before responding",
      "Never go to bed on an argument without acknowledgement",
      "## How we prefer to communicate",
      "Face-to-face for important topics",
      "Quick texts for daily check-ins and 'thinking of you'",
      "Weekly relationship check-in (even 10 minutes)",
      "Share appreciations and gratitude regularly",
      "Ask 'Is now a good time?' before heavy topics",
      "## How we repair after conflict",
      "Acknowledge each other's feelings first",
      "Apologise with specifics, not just 'sorry'",
      "Hug or touch to physically reconnect",
      "Discuss what triggered the conflict calmly",
      "Agree on one thing to try differently next time",
      "## Things we want to improve",
    ],
  },
  {
    id: "together-list",
    name: "Our Together List",
    icon: "💑",
    description: "Activities & trips to do together",
    gradient: "bg-gradient-to-br from-us-sage/15 to-us-gold/20",
    lucideIcon: Heart,
    category: "core" as const,
    defaultItems: togetherListDefaultItems,
  },
  // Add-on
  {
    id: "family",
    name: "Family List",
    icon: "👨‍👩‍👧‍👦",
    description: "AI-powered family to-do list",
    gradient: "bg-gradient-to-br from-us-sage/20 to-us-gold/15",
    lucideIcon: Target,
    category: "addon" as const,
    defaultItems: [],
    navigateTo: "/family-quiz",
  },
  // Suggested
  {
    id: "sex-bucket-ideas",
    name: "Sex Bucket List Ideas",
    icon: "🔥",
    description: "Explore what you'd like to try together",
    gradient: "bg-gradient-to-br from-us-coral/20 to-us-blush/20",
    lucideIcon: Heart,
    category: "suggested" as const,
    defaultItems: [
      "## Mind / Fantasy / Play",
      "Erotic hypnosis",
      "Fantasy / roleplay",
      "Sensation play",
      "Spanking",
      "Feathers",
      "Dominance",
      "Submission",
      "Rougher play",
      "Restraint",
      "Blindfolding",
      "Orgasm control",
      "## Toys & Tools",
      "Vibrators",
      "Bullet",
      "Wand",
      "Air stimulator",
      "Licker toy",
      "Thruster / pulsator",
      "Anal beads",
      "Anal plug",
      "## Intimacy & Connection Practices",
      "Regular solo pleasure practice",
      "Sensual massage (incl breast massage)",
      "Petting / stroking / hair play",
      "More erotic kissing / making out",
      "Neck/ear play (breath, licking, sucking)",
      "Longer sensual holding moments",
      "## Skills & Techniques",
      "Manual genital massage skills",
      "Improve oral techniques",
      "Learn to orgasm while receiving oral",
      "Explore mutual oral for energetic blending",
      "Explore positions stimulating multiple zones",
      "## Novelty, Talk & Confidence",
      "Sex in new/unusual locations",
      "More sensual talk / appreciation / dirty talk",
      "Share fantasies (even if not acted on)",
      "More moans / feedback / vocal response",
      "Feel confident asking for what I want",
      "Encourage partner to ask too",
      "Share 'favourite frames' (best moments)",
      "## Dressing Up / Media",
      "Sexy clothes / lingerie / costumes / heels / latex / gear",
      "Take sexy photos or video (self/partner)",
      "## Clubs / Dance / Water Play",
      "Erotic dance / lap dance / pole dance with partner",
      "Go to an exotic dance club",
      "Water play (hot tub / shower / spring / waterfall)",
      "## Kink / BDSM Exploration",
      "Spanking / flogging / restraints / blindfolds",
      "Rope bondage (Shibari)",
      "Sex furniture restraint play",
      "Domination",
      "Being dominated",
      "Harness / strap-on play",
      "Remote control toy play",
      "## Anal / Pumps / Enhancement",
      "Explore anal pleasure",
      "Anal plug",
      "Anal bead",
      "Anal vibrator",
      "Suction devices (clit/nipple/penis/vulva pump)",
      "Penis pump / enlargement techniques",
      "## Tantra / Spiritual / Expanded Orgasm",
      "Tantra / spiritual sex techniques",
      "Expanded orgasm / orgasmic meditation practice",
      "Multi-orgasmic stamina training",
      "Female ejaculation healing / exploration",
      "Taoist thrusting techniques",
      "360° tantric positions",
      "Piercings / clamps / jewellery",
    ],
  },
];

interface SharedListsProps {
  lists: UserList[];
  onUpdate: (lists: UserList[]) => void;
}

const SharedLists = ({ lists, onUpdate }: SharedListsProps) => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingBlank, setCreatingBlank] = useState(false);
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null);
  const [addingSubheading, setAddingSubheading] = useState<string | null>(null);
  const [subheadingText, setSubheadingText] = useState("");

  const [showCompleted, setShowCompleted] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<{ listId: string; itemId: string } | null>(null);
  const [editText, setEditText] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachingItemId, setAttachingItemId] = useState<{ listId: string; itemId: string } | null>(null);
  const [eventPickerItem, setEventPickerItem] = useState<{ listId: string; itemId: string } | null>(null);
  const [eventDate, setEventDate] = useState("");

  const createFromTemplate = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId)!;
    // If template has a navigation target (e.g. Family Quiz), go there instead
    if ((t as any).navigateTo) {
      setShowTemplates(false);
      navigate((t as any).navigateTo);
      return;
    }
    const newList: UserList = {
      id: Date.now().toString(),
      name: t.name,
      icon: t.icon,
      template: t.id,
      createdAt: new Date().toISOString(),
      maxItems: (t as any).maxItems || undefined,
      items: t.defaultItems.map((text, i) => {
        const isHeading = text.startsWith("## ");
        const itemText = isHeading ? text.slice(3).trim() : text;
        return { id: `${Date.now()}-${i}`, text: itemText, done: false, isHeading: isHeading || undefined };
      }),
    };
    const updated = [newList, ...lists];
    onUpdate(updated);
    setShowTemplates(false);
    setExpandedId(newList.id);
  };

  const createBlankList = () => {
    if (!newListName.trim()) return;
    const newList: UserList = {
      id: Date.now().toString(),
      name: newListName.trim(),
      icon: "📝",
      createdAt: new Date().toISOString(),
      items: [],
    };
    const updated = [newList, ...lists];
    onUpdate(updated);
    setCreatingBlank(false);
    setNewListName("");
    setExpandedId(newList.id);
  };

  const toggleItem = (listId: string, itemId: string) => {
    const list = lists.find((l) => l.id === listId);
    const item = list?.items.find((i) => i.id === itemId);
    const isCompleting = item && !item.done;

    const updated = lists.map((l) =>
      l.id === listId ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) } : l
    );
    onUpdate(updated);

    // Celebrate completing a long-term goal
    if (isCompleting && list?.template === "long-term-goals") {
      const updatedList = updated.find((l) => l.id === listId);
      const doneCount = updatedList?.items.filter((i) => i.done && !i.isHeading).length || 0;
      const totalGoals = updatedList?.items.filter((i) => !i.isHeading).length || 0;
      toast({
        title: doneCount === totalGoals ? "🎉 All goals achieved!" : "🌟 Goal achieved!",
        description: doneCount === totalGoals
          ? "You've completed all your long-term goals together! Time to dream bigger!"
          : `${doneCount}/${totalGoals} goals completed — keep going!`,
      });
    }
  };

  const addItem = (listId: string) => {
    if (!newItemText.trim()) return;
    const list = lists.find((l) => l.id === listId);
    if (list?.maxItems && list.items.length >= list.maxItems) {
      toast({ title: `Max ${list.maxItems} items`, description: "Remove an item first to add a new one." });
      return;
    }
    const text = newItemText.trim();
    const isHeading = text.startsWith("## ");
    const itemText = isHeading ? text.slice(3).trim() : text;
    const updated = lists.map((l) =>
      l.id === listId ? { ...l, items: [...l.items, { id: Date.now().toString(), text: itemText, done: false, isHeading: isHeading || undefined }] } : l
    );
    onUpdate(updated);
    setNewItemText("");
  };

  const suggestDreams = async (listId: string) => {
    setSuggestingFor(listId);
    try {
      const list = lists.find((l) => l.id === listId);
      const existingDreams = list?.items.map((i) => i.text) || [];
      const existingLists = lists.filter((l) => l.id !== listId).map((l) => l.name);

      const { data, error } = await supabase.functions.invoke("suggest-dreams", {
        body: { existingDreams, existingLists },
      });

      if (error) throw error;
      if (data?.dreams) {
        const maxSlots = (list?.maxItems || 5) - (list?.items.length || 0);
        const newItems = data.dreams.slice(0, maxSlots).map((d: { text: string }, i: number) => ({
          id: `dream-${Date.now()}-${i}`,
          text: d.text,
          done: false,
        }));
        const updated = lists.map((l) =>
          l.id === listId ? { ...l, items: [...l.items, ...newItems] } : l
        );
        onUpdate(updated);
        toast({ title: "Dreams suggested ✨", description: `${newItems.length} dreams added` });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Couldn't generate suggestions", description: "Please try again shortly.", variant: "destructive" });
    } finally {
      setSuggestingFor(null);
    }
  };

  const suggestTasks = async (listId: string) => {
    setSuggestingFor(listId);
    try {
      const list = lists.find((l) => l.id === listId);
      const existingItems = list?.items.map((i) => i.text) || [];

      const { data, error } = await supabase.functions.invoke("suggest-tasks", {
        body: { existingItems, listName: list?.name || "Daily To-Do" },
      });

      if (error) throw error;
      if (data?.tasks) {
        const newItems = data.tasks.map((t: { text: string }, i: number) => ({
          id: `task-${Date.now()}-${i}`,
          text: t.text,
          done: false,
        }));
        const updated = lists.map((l) =>
          l.id === listId ? { ...l, items: [...l.items, ...newItems] } : l
        );
        onUpdate(updated);
        toast({ title: "Tasks suggested ✨", description: `${newItems.length} items added` });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Couldn't generate suggestions", description: "Please try again shortly.", variant: "destructive" });
    } finally {
      setSuggestingFor(null);
    }
  };

  const removeItem = (listId: string, itemId: string) => {
    const updated = lists.map((l) =>
      l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l
    );
    onUpdate(updated);
  };

  const deleteList = (listId: string) => {
    onUpdate(lists.filter((l) => l.id !== listId));
    if (expandedId === listId) setExpandedId(null);
  };

  const addAttachment = (listId: string, itemId: string, attachment: ListItemAttachment) => {
    const updated = lists.map((l) =>
      l.id === listId
        ? {
            ...l,
            items: l.items.map((i) =>
              i.id === itemId
                ? { ...i, attachments: [...(i.attachments || []), attachment] }
                : i
            ),
          }
        : l
    );
    onUpdate(updated);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!attachingItemId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const isImage = file.type.startsWith("image/");
    const url = URL.createObjectURL(file);
    addAttachment(attachingItemId.listId, attachingItemId.itemId, {
      type: isImage ? "photo" : "file",
      url,
      name: file.name,
    });
    setAttachingItemId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveEdit = (listId: string, itemId: string) => {
    if (!editText.trim()) return;
    const updated = lists.map((l) =>
      l.id === listId ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, text: editText.trim() } : i)) } : l
    );
    onUpdate(updated);
    setEditingItem(null);
    setEditText("");
  };

  const toggleSection = (headingId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(headingId)) next.delete(headingId);
      else next.add(headingId);
      return next;
    });
  };

  const getCompletionPercent = (list: UserList) => {
    const countable = list.items.filter((i) => !i.isHeading);
    if (countable.length === 0) return 0;
    return Math.round((countable.filter((i) => i.done).length / countable.length) * 100);
  };

  const getNextMilestone = (list: UserList) => {
    const pct = getCompletionPercent(list);
    const milestones = [25, 50, 75, 100];
    const completedMilestones = (list.scoreData?.snapshots || []).map((s) => s.milestone);
    return milestones.find((m) => pct >= m && !completedMilestones.includes(m)) ?? null;
  };

  return (
    <div className="space-y-3">
      {/* Create new */}
      {!showTemplates && !creatingBlank && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowTemplates(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-4 text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
        >
          <Plus className="w-4 h-4" /> New List
        </motion.button>
      )}

      {/* Template picker */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Choose a template</p>
              <button onClick={() => setShowTemplates(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>

            {/* Core templates */}
            {templates.filter(t => t.category !== "suggested").map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => createFromTemplate(t.id)}
                className={`w-full flex items-center gap-3 rounded-xl p-3.5 text-left ${t.gradient} border border-border/30 hover:scale-[1.01] transition-transform`}
              >
                <span className="text-xl">{t.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            ))}

            {/* Suggested section */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Suggested</p>

            {/* Sex Bucket List proposal flow */}
            <SexBucketList lists={lists} onUpdate={(updated) => { onUpdate(updated); setShowTemplates(false); }} />

            {templates.filter(t => t.category === "suggested").map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => createFromTemplate(t.id)}
                className={`w-full flex items-center gap-3 rounded-xl p-3.5 text-left ${t.gradient} border border-border/30 hover:scale-[1.01] transition-transform`}
              >
                <span className="text-xl">{t.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            ))}

            <button
              onClick={() => { setShowTemplates(false); setCreatingBlank(true); }}
              className="w-full flex items-center gap-3 rounded-xl p-3.5 text-left bg-secondary/50 border border-border/30 hover:bg-secondary transition-colors"
            >
              <span className="text-xl">📝</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Blank List</p>
                <p className="text-xs text-muted-foreground">Start from scratch</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blank list name input */}
      <AnimatePresence>
        {creatingBlank && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 overflow-hidden"
          >
            <input
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createBlankList()}
              placeholder="List name…"
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={createBlankList} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
              Create
            </button>
            <button onClick={() => { setCreatingBlank(false); setNewListName(""); }} className="rounded-xl bg-secondary px-3 py-2.5 text-sm text-muted-foreground">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sex Bucket List pending proposal (shown outside template picker when not browsing templates) */}
      {!showTemplates && <SexBucketList lists={lists} onUpdate={onUpdate} pendingOnly />}

      {/* Existing lists */}
      {lists.length === 0 && !showTemplates && !creatingBlank && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <ListChecks className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-display text-base font-semibold text-foreground">No lists yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create a list to get started.</p>
        </div>
      )}

      {/* Hidden file input for attachments */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileAttach}
      />

      {lists.map((list, i) => {
        const isExpanded = expandedId === list.id;
        const doneCount = list.items.filter((i) => i.done && !i.isHeading).length;
        const activeItems = list.items.filter((i) => !i.done || i.isHeading);
        const completedItems = list.items.filter((i) => i.done && !i.isHeading);
        const isShowingCompleted = showCompleted[list.id] ?? false;
        const completionPct = getCompletionPercent(list);
        const nextMilestone = list.scoreData ? getNextMilestone(list) : null;

        const countable = list.items.filter((i) => !i.isHeading);
        const totalCountable = countable.length;
        const query = searchQuery[list.id]?.toLowerCase() || "";

        return (
          <motion.div
            key={list.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border/50 bg-card overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : list.id)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <span className="text-xl">{list.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{list.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground">
                    {doneCount}/{totalCountable} done
                    {list.scoreData && ` · ${completionPct}%`}
                  </p>
                  {totalCountable > 0 && (
                    <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${completionPct}%` }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>

            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="border-t border-border/30"
              >
                {/* Score summary card for checklist quiz lists */}
                {list.scoreData && (
                  <div className="px-4 py-3 border-b border-border/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Score Summary
                      </p>
                      {nextMilestone && (
                        <button
                          onClick={() => {
                            // Navigate to retest - store current list context
                            const quizId = list.id.replace(/^checklist-/, "").replace(/-\d+$/, "");
                            localStorage.setItem("retestListId", list.id);
                            localStorage.setItem("retestMilestone", String(nextMilestone));
                            window.location.href = `/checklist-quiz/${quizId}?retest=true`;
                          }}
                          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Retest ({nextMilestone}% milestone)
                        </button>
                      )}
                    </div>

                    {/* Latest snapshot */}
                    {list.scoreData.snapshots.length > 0 && (
                      <div className="space-y-1.5">
                        {list.scoreData.snapshots.map((snap, si) => (
                          <div key={si} className="rounded-lg bg-secondary/50 p-2.5 space-y-1">
                            <p className="text-[11px] font-medium text-muted-foreground">
                              {snap.milestone === 0 ? "Initial" : `${snap.milestone}% milestone`} · {new Date(snap.takenAt).toLocaleDateString()}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                              {Object.entries(snap.answers).map(([key, val]) => {
                                const item = list.scoreData!.sections.flatMap(s => s.items).find(i => i.id === key);
                                return (
                                  <div key={key} className="flex items-center gap-1.5 text-xs">
                                    <span className="text-muted-foreground truncate max-w-[120px]">{item?.text?.replace(/ \(1–10\)/, "") || key}</span>
                                    <span className="font-bold text-primary">{typeof val === "number" ? `${val}/10` : val}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Search bar for lists with many items */}
                {list.items.length > 8 && (
                  <div className="px-4 pt-3 pb-1">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
                      <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <input
                        value={searchQuery[list.id] || ""}
                        onChange={(e) => setSearchQuery((prev) => ({ ...prev, [list.id]: e.target.value }))}
                        placeholder="Search items…"
                        className="flex-1 text-xs text-foreground placeholder:text-muted-foreground bg-transparent focus:outline-none"
                      />
                      {query && (
                        <button onClick={() => setSearchQuery((prev) => ({ ...prev, [list.id]: "" }))} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                      )}
                    </div>
                  </div>
                )}

                {/* Active items */}
                <div className="px-4 py-3 space-y-1.5">
                  {(() => {
                    // Group items by sections (heading + its children)
                    let currentHeadingId: string | null = null;
                    let nonHeadingIndex = 0;
                    return activeItems.map((item) => {
                      if (item.isHeading) {
                        currentHeadingId = item.id;
                        const isSectionCollapsed = collapsedSections.has(item.id);
                        // If searching, skip section collapse
                        if (query && !item.text.toLowerCase().includes(query)) {
                          // Check if any child matches
                          const headingIdx = list.items.indexOf(item);
                          const nextHeadingIdx = list.items.findIndex((it, idx) => idx > headingIdx && it.isHeading);
                          const children = list.items.slice(headingIdx + 1, nextHeadingIdx === -1 ? undefined : nextHeadingIdx);
                          if (!children.some((c) => c.text.toLowerCase().includes(query))) return null;
                        }
                        return (
                          <div key={item.id} className="group">
                            <button
                              onClick={() => toggleSection(item.id)}
                              className="w-full flex items-center gap-2 pt-3 pb-1 text-left"
                            >
                              {isSectionCollapsed ? (
                                <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-primary flex-shrink-0" />
                              )}
                              <span className="flex-1 text-xs font-bold text-primary uppercase tracking-wider">{item.text}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeItem(list.id, item.id); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                              </button>
                            </button>
                          </div>
                        );
                      }

                      // If this item's section is collapsed, hide it
                      if (currentHeadingId && collapsedSections.has(currentHeadingId)) return null;

                      // Search filter
                      if (query && !item.text.toLowerCase().includes(query)) return null;

                      const isEditing = editingItem?.listId === list.id && editingItem?.itemId === item.id;
                      nonHeadingIndex++;
                      const itemNumber = list.template === "long-term-goals" ? nonHeadingIndex : null;

                      return (
                        <div key={item.id} className="group">
                          <div className="flex items-center gap-2.5">
                            {itemNumber ? (
                              <button
                                onClick={() => toggleItem(list.id, item.id)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-colors ${
                                  item.done ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/50 text-muted-foreground"
                                }`}
                              >
                                {item.done ? <Check className="w-3 h-3" /> : itemNumber}
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleItem(list.id, item.id)}
                                className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors border-border hover:border-primary/50"
                              >
                              </button>
                            )}
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(list.id, item.id);
                                  if (e.key === "Escape") { setEditingItem(null); setEditText(""); }
                                }}
                                onBlur={() => saveEdit(list.id, item.id)}
                                className="flex-1 rounded-lg border border-primary bg-background px-2 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : (
                              <span
                                onClick={() => { setEditingItem({ listId: list.id, itemId: item.id }); setEditText(item.text); }}
                                className="flex-1 text-sm text-foreground cursor-text hover:text-primary/80 transition-colors"
                              >
                                {item.text}
                              </span>
                            )}
                            {!isEditing && (
                              <>
                                <button
                                  onClick={() => { setEditingItem({ listId: list.id, itemId: item.id }); setEditText(item.text); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                </button>
                                <button
                                  onClick={() => {
                                    setAttachingItemId({ listId: list.id, itemId: item.id });
                                    fileInputRef.current?.click();
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                  title="Attach photo/file"
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                </button>
                                <button
                                  onClick={() => setEventPickerItem(
                                    eventPickerItem?.listId === list.id && eventPickerItem?.itemId === item.id
                                      ? null
                                      : { listId: list.id, itemId: item.id }
                                  )}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                  title="Create event"
                                >
                                  <CalendarPlus className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                </button>
                                <button
                                  onClick={() => removeItem(list.id, item.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                </button>
                              </>
                            )}
                          </div>

                          {/* Inline event date picker */}
                          {eventPickerItem?.listId === list.id && eventPickerItem?.itemId === item.id && (
                            <div className="flex items-center gap-2 pl-7 mt-1.5">
                              <input
                                type="datetime-local"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                                className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <button
                                onClick={() => {
                                  if (!eventDate) return;
                                  addAttachment(list.id, item.id, {
                                    type: "event",
                                    name: item.text,
                                    date: eventDate,
                                  });
                                  setEventPickerItem(null);
                                  setEventDate("");
                                }}
                                className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => { setEventPickerItem(null); setEventDate(""); }}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          {/* Attachments */}
                          {item.attachments && item.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pl-7 mt-1">
                              {item.attachments.map((att, ai) => (
                                <a
                                  key={ai}
                                  href={att.type === "event" ? undefined : att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {att.type === "photo" ? <Image className="w-2.5 h-2.5" /> : att.type === "event" ? <CalendarPlus className="w-2.5 h-2.5" /> : <Paperclip className="w-2.5 h-2.5" />}
                                  {att.type === "event" && att.date ? new Date(att.date).toLocaleDateString() : att.name || "Attachment"}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}

                  {activeItems.length === 0 && completedItems.length > 0 && (
                    <p className="text-xs text-center text-muted-foreground py-2">All items completed! 🎉</p>
                  )}

                  {/* Add item */}
                  {(!list.maxItems || list.items.length < list.maxItems) && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex gap-2">
                        <input
                          value={expandedId === list.id ? newItemText : ""}
                          onChange={(e) => setNewItemText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addItem(list.id)}
                          placeholder={list.maxItems ? `Add item… (${list.items.length}/${list.maxItems})` : "Add item…"}
                          className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          onClick={() => addItem(list.id)}
                          className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {!list.maxItems && (
                        addingSubheading === list.id ? (
                          <div className="flex gap-2">
                            <input
                              autoFocus
                              value={subheadingText}
                              onChange={(e) => setSubheadingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && subheadingText.trim()) {
                                  const updated = lists.map((l) =>
                                    l.id === list.id
                                      ? { ...l, items: [...l.items, { id: Date.now().toString(), text: subheadingText.trim(), done: false, isHeading: true }] }
                                      : l
                                  );
                                  onUpdate(updated);
                                  setSubheadingText("");
                                  setAddingSubheading(null);
                                } else if (e.key === "Escape") {
                                  setSubheadingText("");
                                  setAddingSubheading(null);
                                }
                              }}
                              placeholder="Subheading name…"
                              className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              onClick={() => {
                                if (subheadingText.trim()) {
                                  const updated = lists.map((l) =>
                                    l.id === list.id
                                      ? { ...l, items: [...l.items, { id: Date.now().toString(), text: subheadingText.trim(), done: false, isHeading: true }] }
                                      : l
                                  );
                                  onUpdate(updated);
                                  setSubheadingText("");
                                  setAddingSubheading(null);
                                }
                              }}
                              className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingSubheading(list.id)}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors px-1"
                          >
                            <Plus className="w-3 h-3" /> Add subheading
                          </button>
                        )
                      )}
                    </div>
                  )}
                  {list.maxItems && list.items.length >= list.maxItems && (
                    <p className="text-[11px] text-muted-foreground text-center pt-2">Max {list.maxItems} dreams — remove one to add another</p>
                  )}

                  {/* AI Suggest button for dream lists */}
                  {list.maxItems && list.items.length < list.maxItems && (
                    <button
                      onClick={() => suggestDreams(list.id)}
                      disabled={suggestingFor === list.id}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent/50 py-2 mt-2 text-xs font-medium text-accent-foreground hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {suggestingFor === list.id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> Suggest dreams with AI</>
                      )}
                    </button>
                  )}

                  {/* AI Suggest button for suggestable lists (e.g. daily to-do) */}
                  {list.aiSuggestable && !list.maxItems && (
                    <button
                      onClick={() => suggestTasks(list.id)}
                      disabled={suggestingFor === list.id}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent/50 py-2 mt-2 text-xs font-medium text-accent-foreground hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {suggestingFor === list.id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> Suggest tasks with AI</>
                      )}
                    </button>
                  )}
                </div>

                {/* Completed items toggle */}
                {completedItems.length > 0 && (
                  <div className="border-t border-border/30">
                    <button
                      onClick={() => setShowCompleted((prev) => ({ ...prev, [list.id]: !prev[list.id] }))}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isShowingCompleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {isShowingCompleted ? "Hide" : "Show"} {completedItems.length} completed
                    </button>
                    <AnimatePresence>
                      {isShowingCompleted && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 space-y-1.5">
                            {completedItems.map((item) => (
                              <div key={item.id} className="flex items-center gap-2.5 group">
                                <button
                                  onClick={() => toggleItem(list.id, item.id)}
                                  className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 bg-primary border-primary"
                                >
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                </button>
                                <span className="flex-1 text-sm text-muted-foreground line-through">{item.text}</span>
                                <button
                                  onClick={() => removeItem(list.id, item.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Delete list */}
                <div className="px-4 py-2 border-t border-border/30">
                  <button
                    onClick={() => deleteList(list.id)}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Delete list
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default SharedLists;
