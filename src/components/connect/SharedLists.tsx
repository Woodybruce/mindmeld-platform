import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, ChevronRight, ChevronDown, ListChecks, Calendar, Target, Zap, Paperclip, Image, CalendarPlus, Eye, EyeOff, RefreshCw, TrendingUp, Sparkles, Loader2, Heart, Pencil, Search, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { notifyPartner } from "@/lib/notifyPartner";
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
  isObservation?: boolean;
  sectionType?: "task" | "observation";
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
  "##>> What we feel is a good sex life",
  "Not valued on frequency",
  "Intimate and connected",
  "More pleasure focused",
  "More novelty and variety",
  "Playful and fun",
  "Relaxed / easy / no pressure",
  "Built on trust and communication",
  "Equal and reciprocal",
  "Open to exploration",
  "##>> What are our motivations for sex?",
  "Pleasure and enjoyment",
  "Fun and playfulness",
  "Feeling closer together",
  "Emotional connection",
  "## Preferences — What we enjoy",
  "Oral sex",
  "Toys",
  "Flirting and teasing",
  "Massage leading to intimacy",
  "##>> Preferences — What we'd rather skip",
  "## Our Top 10 Priorities",
  "## How do we hit our priorities",
  "##>> Ideas & Resources",
];

const togetherListDefaultItems = [
  "## Our top 3 things we should do together",
  "Weekly date night",
  "A trip away together each month",
  "## Things we would like to do together",
  "Take a dance class",
  "See a live show or concert",
  "Paint or draw each other",
  "Try a pottery class",
  "Visit an art gallery",
  "Cook a new recipe together",
  "## Trips we want to take",
  "A countryside getaway",
  "A European city break",
  "A beach holiday",
  "A road trip adventure",
  "##>> Things we have done together",
  "Add your first memory here…",
];

const challengesListDefaultItems = [
  "##>> Our challenges in our relationship",
  "Communication styles",
  "Feeling judged or criticised",
  "Physical and emotional availability",
  "Feeling safe to be vulnerable",
  "Trust and reassurance",
  "Managing stress and external pressures",
  "Being present (phone use, distractions)",
  "Intimacy and connection",
  "Balancing family responsibilities",
  "## What we are doing to solve them",
  "Open up to one another without conditions",
  "Set healthy boundaries together",
  "Be supportive and express gratitude daily",
  "Respond to each other without judgment",
  "Agree it's OK to disagree respectfully",
  "Communicate honestly and kindly",
  "Repair after any conflict with a calm discussion",
  "Prioritise our relationship over everything else",
  "Be present — phones down during quality time",
  "Share the family and household workload fairly",
  "Hug for 10 seconds every time we leave or reunite",
  "Say 'I love you' and mean it",
  "Spend intentional time together without distractions",
  "Focus on our physical and emotional connection",
  "## What have we solved and how",
];

const templates = [
  // Pinned
  {
    id: "long-term-dreams",
    name: "Our Long-Term Dreams",
    icon: "⭐",
    description: "Dream big together — your shared vision for the future",
    gradient: "bg-gradient-to-br from-us-gold/20 to-us-cream/25",
    lucideIcon: Target,
    category: "core" as const,
    defaultItems: [
      "## Our Dreams",
      "Buy our dream home together",
      "Travel the world — visit 10 countries",
      "Start a business or passion project together",
      "Get married or renew our vows",
      "Build financial freedom and retire early",
      "Have or grow our family",
      "Write a book or create something lasting",
      "Live abroad for a year",
      "Complete a big physical challenge together",
      "Give back — volunteer or start a charity",
      "##>> How we'll achieve them",
    ],
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
      "##>> What intimacy means to us",
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
      "##>> Barriers to intimacy we want to address",
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
      "##>> Our communication ground rules",
      "Listen to understand, not to respond",
      "No raising voices — pause if it escalates",
      "Use 'I feel…' instead of 'You always…'",
      "No bringing up past arguments in new ones",
      "Put phones down during important conversations",
      "It's okay to say 'I need a moment' before responding",
      "Never go to bed on an argument without acknowledgement",
      "##>> How we prefer to communicate",
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
    name: "Sex Bucket Challenge Ideas",
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
  /** Template IDs of ALL existing lists (including those in other SharedLists instances) */
  allExistingTemplates?: string[];
  /** Hide the "New List" button (used when another instance provides it) */
  hideNewButton?: boolean;
  /** Auto-expand a specific list by ID */
  initialExpandedId?: string | null;
}

const SharedLists = ({ lists, onUpdate, allExistingTemplates, hideNewButton, initialExpandedId }: SharedListsProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const addToWeeklyList = async (text: string) => {
    if (!user) {
      toast({ title: "Sign in to add to your weekly list" });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("weekly_tasks").insert({
      user_id: user.id,
      text,
      scheduled_date: today,
      sort_order: 999,
      source: "list",
    } as any);
    if (error) {
      toast({ title: "Failed to add", description: error.message });
    } else {
      toast({ title: "📋 Added to today's weekly list", duration: 2000 });
    }
  };
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId || null);
  const [newItemText, setNewItemText] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingBlank, setCreatingBlank] = useState(false);
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null);
  const [addingSubheading, setAddingSubheading] = useState<string | null>(null);
  const [subheadingText, setSubheadingText] = useState("");
  const [subheadingType, setSubheadingType] = useState<"task" | "observation">("task");

  const [showCompleted, setShowCompleted] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<{ listId: string; itemId: string } | null>(null);
  const [editText, setEditText] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});

  // Template preview state
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<ListItem[]>([]);
  const [previewNewItem, setPreviewNewItem] = useState("");
  const [previewAddingAfter, setPreviewAddingAfter] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachingItemId, setAttachingItemId] = useState<{ listId: string; itemId: string } | null>(null);
  const [eventPickerItem, setEventPickerItem] = useState<{ listId: string; itemId: string } | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [sectionNewItem, setSectionNewItem] = useState<Record<string, string>>({});

  const existingTemplateIds = new Set([
    ...lists.filter(l => l.template).map(l => l.template!),
    ...(allExistingTemplates || []),
  ]);

  const createFromTemplate = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId)!;
    if ((t as any).navigateTo) {
      setShowTemplates(false);
      navigate((t as any).navigateTo);
      return;
    }
    if (existingTemplateIds.has(templateId)) {
      toast({ title: `"${t.name}" already exists`, description: "Delete the current list to re-use this template.", duration: 3000 });
      return;
    }
    // Open preview step so user can add items before creating
    let currentSectionType: "task" | "observation" = "task";
    const items = t.defaultItems.map((text, i) => {
      const isObsHeading = text.startsWith("##>> ");
      const isHeading = isObsHeading || text.startsWith("## ");
      const itemText = isObsHeading ? text.slice(5).trim() : isHeading ? text.slice(3).trim() : text;
      if (isHeading) currentSectionType = isObsHeading ? "observation" : "task";
      const isObservation = !isHeading && currentSectionType === "observation";
      return { id: `${Date.now()}-${i}`, text: itemText, done: isHeading ? false : true, isHeading: isHeading || undefined, isObservation: isObservation || undefined, sectionType: isHeading ? currentSectionType : undefined };
    });
    setShowTemplates(true);
    setPreviewTemplate(templateId);
    setPreviewItems(items);
    setPreviewNewItem("");
  };

  const confirmTemplate = () => {
    if (!previewTemplate) return;
    const t = templates.find((t) => t.id === previewTemplate)!;
    const newList: UserList = {
      id: Date.now().toString(),
      name: t.name,
      icon: t.icon,
      template: t.id,
      createdAt: new Date().toISOString(),
      maxItems: (t as any).maxItems || undefined,
      // Keep items that are ticked (done=true means "selected") + headings; reset done to false for the actual list
      items: previewItems.filter(item => item.done || item.isHeading).map(item => ({ ...item, done: false })),
    };
    const updated = [newList, ...lists];
    onUpdate(updated);

    // Notify partner about the new list
    if (user && profile?.partner_id) {
      notifyPartner({
        partnerId: profile.partner_id,
        title: `${t.icon} New list created`,
        body: `${profile.username || "Your partner"} started "${t.name}" — go add yours!`,
        route: "/us?tab=lists",
        chatMessage: `${t.icon} I just created our "${t.name}" list — come check it out and add yours!`,
        senderId: user.id,
      });
    }

    setShowTemplates(false);
    setPreviewTemplate(null);
    setPreviewItems([]);
    setExpandedId(newList.id);
  };

  const addPreviewItem = () => {
    if (!previewNewItem.trim()) return;
    const t = templates.find((t) => t.id === previewTemplate);
    if (t && (t as any).maxItems && previewItems.filter(i => !i.isHeading).length >= (t as any).maxItems) {
      toast({ title: `Max ${(t as any).maxItems} items` });
      return;
    }
    const text = previewNewItem.trim();
    setPreviewItems(prev => [...prev, { id: `preview-${Date.now()}`, text, done: true, isHeading: undefined }]);
    setPreviewNewItem("");
  };

  const addPreviewHeading = () => {
    if (!previewNewItem.trim()) return;
    const text = previewNewItem.trim();
    setPreviewItems(prev => [...prev, { id: `preview-${Date.now()}`, text, done: false, isHeading: true }]);
    setPreviewNewItem("");
  };

  const removePreviewItem = (itemId: string) => {
    setPreviewItems(prev => prev.filter(i => i.id !== itemId));
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

  const [showCelebration, setShowCelebration] = useState(false);

  const toggleItem = (listId: string, itemId: string) => {
    const list = lists.find((l) => l.id === listId);
    const item = list?.items.find((i) => i.id === itemId);
    const isCompleting = item && !item.done;

    const updated = lists.map((l) =>
      l.id === listId ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) } : l
    );
    onUpdate(updated);

    if (isCompleting) {
      const updatedList = updated.find((l) => l.id === listId);
      const countable = updatedList?.items.filter((i) => !i.isHeading && !i.isObservation) || [];
      const doneCount = countable.filter((i) => i.done).length;
      const totalCount = countable.length;

      // Celebrate completing a long-term dream
      if (list?.template === "long-term-dreams") {
        toast({
          title: doneCount === totalCount ? "🎉 All dreams achieved!" : "🌟 Dream achieved!",
          description: doneCount === totalCount
            ? "You've completed all your long-term dreams together! Time to dream bigger!"
            : `${doneCount}/${totalCount} dreams completed — keep going!`,
        });
      }

      // Dramatic celebration when ALL Sex To Do items are completed
      if ((list?.template === "sex-todo" || list?.name?.toLowerCase().includes("sex to do")) && doneCount === totalCount && totalCount > 0) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 5000);
      }
    }
  };

  const addItem = (listId: string, afterHeadingId?: string) => {
    const inputText = afterHeadingId ? (sectionNewItem[`${listId}-${afterHeadingId}`] || "") : newItemText;
    if (!inputText.trim()) return;
    const list = lists.find((l) => l.id === listId);
    if (list?.maxItems && list.items.filter(i => !i.isHeading).length >= list.maxItems) {
      toast({ title: `Max ${list.maxItems} items`, description: "Remove an item first to add a new one." });
      return;
    }
    const text = inputText.trim();
    // Inherit observation from the heading's sectionType
    const heading = afterHeadingId ? list?.items.find(i => i.id === afterHeadingId) : null;
    const isObservation = heading?.sectionType === "observation" || undefined;
    const newItem = { id: Date.now().toString(), text, done: false, isHeading: undefined, isObservation };

    const updated = lists.map((l) => {
      if (l.id !== listId) return l;
      if (afterHeadingId) {
        // Insert at end of this heading's section
        const headingIdx = l.items.findIndex(i => i.id === afterHeadingId);
        if (headingIdx === -1) return { ...l, items: [...l.items, newItem] };
        const nextHeadingIdx = l.items.findIndex((it, idx) => idx > headingIdx && it.isHeading);
        const insertIdx = nextHeadingIdx === -1 ? l.items.length : nextHeadingIdx;
        const newItems = [...l.items];
        newItems.splice(insertIdx, 0, newItem);
        return { ...l, items: newItems };
      }
      return { ...l, items: [...l.items, newItem] };
    });
    onUpdate(updated);
    if (afterHeadingId) {
      setSectionNewItem(prev => ({ ...prev, [`${listId}-${afterHeadingId}`]: "" }));
    } else {
      setNewItemText("");
    }
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
    const countable = list.items.filter((i) => !i.isHeading && !i.isObservation);
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
    <div className="space-y-3 relative">
      {/* Sex To Do completion celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-center space-y-4 p-8"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="text-8xl"
              >
                👏
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="font-display text-3xl font-bold text-foreground">You did it all! 🔥</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Every single bucket list challenge — complete!<br />
                  Time to start a new round? 😏
                </p>
              </motion.div>
              <motion.div
                className="flex justify-center gap-2 text-4xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {["🎉", "🔥", "👏", "💥", "🎊"].map((emoji, i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -20, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                  >
                    {emoji}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Template picker (preview mode only, or always-visible below) */}
      <AnimatePresence>
        {showTemplates && previewTemplate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >

            {/* Template preview — add/remove items before creating */}
            {previewTemplate && (() => {
              const t = templates.find((tp) => tp.id === previewTemplate)!;
              const nonHeadingCount = previewItems.filter(i => !i.isHeading).length;
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{t.icon}</span>
                      <p className="text-sm font-bold text-foreground">{t.name}</p>
                    </div>
                    <button onClick={() => { setPreviewTemplate(null); setPreviewItems([]); setShowTemplates(false); }} className="text-xs text-muted-foreground hover:text-foreground">
                      ← Back
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground">Tick items to include them. Untick to exclude.</p>

                  <div className="rounded-xl border border-border/50 bg-card overflow-hidden max-h-80 overflow-y-auto">
                    <div className="px-4 py-3 space-y-1">
                      {previewItems.map((item, idx) => {
                        // Check if this is the last non-heading item before the next heading (or end of list)
                        const isLastBeforeNextHeading = !item.isHeading && (
                          idx === previewItems.length - 1 ||
                          previewItems[idx + 1]?.isHeading
                        );
                        // Also show add button after a heading if the section is empty (next item is heading or end of list)
                        const isEmptySectionHeading = item.isHeading && (
                          idx === previewItems.length - 1 ||
                          previewItems[idx + 1]?.isHeading
                        );
                        const showAddButton = isLastBeforeNextHeading || isEmptySectionHeading;
                        // Find the heading this item belongs to for the inline add
                        const findSectionHeadingIndex = () => {
                          for (let j = idx; j >= 0; j--) {
                            if (previewItems[j]?.isHeading) return j;
                          }
                          return -1;
                        };

                        return (
                          <div key={item.id}>
                            <div className="flex items-center gap-2.5 py-1 group">
                              {item.isHeading ? (
                                <span className="flex-1 text-xs font-bold text-primary uppercase tracking-wider pt-2">
                                  {item.text.replace(/^##\s*/, '')}
                                  {item.sectionType === "observation" && (
                                    <span className="ml-1.5 text-[10px] font-normal normal-case text-muted-foreground">💭</span>
                                  )}
                                </span>
                              ) : item.isObservation ? (
                                <div className="flex items-center gap-2.5 flex-1 text-left">
                                  <span className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center text-muted-foreground">💭</span>
                                  <span className="text-sm text-foreground">{item.text}</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setPreviewItems(prev => prev.map(i =>
                                      i.id === item.id ? { ...i, done: !i.done } : i
                                    ));
                                  }}
                                  className="flex items-center gap-2.5 flex-1 text-left"
                                >
                                  <div className={`w-7 h-7 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                    item.done ? "bg-primary border-primary" : "border-muted-foreground/30"
                                  }`}>
                                    {item.done && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                                  </div>
                                  <span className={`text-sm ${!item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.text}</span>
                                </button>
                              )}
                              <button
                                onClick={() => removePreviewItem(item.id)}
                                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                            {/* Inline add button after last item in each section */}
                            {showAddButton && (
                              <div className="py-1">
                                {previewAddingAfter === idx ? (
                                  <div className="flex gap-1.5">
                                    <input
                                      autoFocus
                                      value={previewNewItem}
                                      onChange={(e) => setPreviewNewItem(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          if (!previewNewItem.trim()) return;
                                          const tpl = templates.find((tp) => tp.id === previewTemplate);
                                          if (tpl && (tpl as any).maxItems && previewItems.filter(i => !i.isHeading).length >= (tpl as any).maxItems) {
                                            toast({ title: `Max ${(tpl as any).maxItems} items` });
                                            return;
                                          }
                                          const newItem = { id: `preview-${Date.now()}`, text: previewNewItem.trim(), done: false };
                                          setPreviewItems(prev => {
                                            const copy = [...prev];
                                            copy.splice(idx + 1, 0, newItem);
                                            return copy;
                                          });
                                          setPreviewNewItem("");
                                          setPreviewAddingAfter(null);
                                        }
                                        if (e.key === "Escape") { setPreviewAddingAfter(null); setPreviewNewItem(""); }
                                      }}
                                      placeholder="Add item…"
                                      className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <button
                                      onClick={() => {
                                        if (!previewNewItem.trim()) return;
                                        const newItem = { id: `preview-${Date.now()}`, text: previewNewItem.trim(), done: false };
                                        setPreviewItems(prev => {
                                          const copy = [...prev];
                                          copy.splice(idx + 1, 0, newItem);
                                          return copy;
                                        });
                                        setPreviewNewItem("");
                                        setPreviewAddingAfter(null);
                                      }}
                                      className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setPreviewAddingAfter(idx); setPreviewNewItem(""); }}
                                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Plus className="w-3 h-3" /> Add item
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add item / heading to end */}
                  <div className="flex gap-2">
                    <input
                      value={previewNewItem}
                      onChange={(e) => setPreviewNewItem(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addPreviewItem()}
                      placeholder={(t as any).maxItems ? `Add item… (${nonHeadingCount}/${(t as any).maxItems})` : 'Add item…'}
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={addPreviewItem}
                      className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {!(t as any).maxItems && (
                    <button
                      onClick={addPreviewHeading}
                      disabled={!previewNewItem.trim()}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors px-1 disabled:opacity-30"
                    >
                      <Plus className="w-3 h-3" /> Add as subheading
                    </button>
                  )}

                  <button
                    onClick={confirmTemplate}
                    className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Create List
                  </button>
                </div>
              );
            })()}
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

      {/* Sex Bucket Challenge pending proposal (shown outside template picker when not browsing templates) */}
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
        const doneCount = list.items.filter((i) => i.done && !i.isHeading && !i.isObservation).length;
        const activeItems = list.items.filter((i) => !i.done || i.isHeading || i.isObservation);
        const completedItems = list.items.filter((i) => i.done && !i.isHeading && !i.isObservation);
        const isShowingCompleted = showCompleted[list.id] ?? false;
        const completionPct = getCompletionPercent(list);
        const nextMilestone = list.scoreData ? getNextMilestone(list) : null;

        const countable = list.items.filter((i) => !i.isHeading && !i.isObservation);
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
                    // Build sections: group items by heading
                    type Section = { heading: ListItem | null; items: ListItem[] };
                    const sections: Section[] = [];
                    let curSec: Section = { heading: null, items: [] };

                    activeItems.forEach((item) => {
                      if (item.isHeading) {
                        sections.push(curSec);
                        curSec = { heading: item, items: [] };
                      } else {
                        curSec.items.push(item);
                      }
                    });
                    sections.push(curSec);

                    let nonHeadingIndex = 0;

                    return sections.map((section, si) => {
                      const headingId = section.heading?.id || null;
                      const isSectionCollapsed = headingId ? collapsedSections.has(headingId) : false;

                      if (section.heading && query && !section.heading.text.toLowerCase().includes(query)) {
                        if (!section.items.some((c) => c.text.toLowerCase().includes(query))) return null;
                      }

                      const sectionInputKey = `${list.id}-${headingId || "root"}`;

                      return (
                        <div key={headingId || `section-root-${si}`}>
                          {section.heading && (
                            <div className="group">
                              <button
                                onClick={() => toggleSection(section.heading!.id)}
                                className="w-full flex items-center gap-2 pt-3 pb-1 text-left"
                              >
                                {isSectionCollapsed ? (
                                  <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-primary flex-shrink-0" />
                                )}
                                <span className="flex-1 text-xs font-bold text-primary uppercase tracking-wider">
                                  {section.heading.text.replace(/^##\s*/, '')}
                                  {section.heading.sectionType === "observation" && (
                                    <span className="ml-1.5 text-[10px] font-normal normal-case text-muted-foreground">💭</span>
                                  )}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeItem(list.id, section.heading!.id); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                </button>
                              </button>
                            </div>
                          )}

                          {!isSectionCollapsed && section.items.map((item) => {
                            if (query && !item.text.toLowerCase().includes(query)) return null;

                            const isEditing = editingItem?.listId === list.id && editingItem?.itemId === item.id;
                            nonHeadingIndex++;
                            const itemNumber = list.template === "long-term-dreams" ? nonHeadingIndex : null;

                            return (
                              <div key={item.id} className="group">
                                <div className="flex items-center gap-2.5">
                                  {(item.isObservation || section.heading?.sectionType === "observation") ? (
                                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-muted-foreground">
                                      💭
                                    </span>
                                  ) : itemNumber ? (
                                    <button
                                      onClick={() => toggleItem(list.id, item.id)}
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${
                                        item.done ? "bg-primary text-primary-foreground" : "border-2 border-border hover:border-primary/50 text-muted-foreground"
                                      }`}
                                    >
                                      {item.done ? <Check className="w-4 h-4" /> : itemNumber}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => toggleItem(list.id, item.id)}
                                      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                        item.done ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary/50"
                                      }`}
                                    >
                                      {item.done && <Check className="w-4 h-4" />}
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
                                        onClick={() => addToWeeklyList(item.text)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="Add to weekly list"
                                      >
                                        <ClipboardList className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
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
                          })}

                          {/* Per-section add item input */}
                          {headingId && !isSectionCollapsed && (!list.maxItems || list.items.filter(i => !i.isHeading).length < list.maxItems) && (
                            <div className="flex gap-1.5 pt-1 pb-1">
                              <input
                                value={sectionNewItem[sectionInputKey] || ""}
                                onChange={(e) => setSectionNewItem(prev => ({ ...prev, [sectionInputKey]: e.target.value }))}
                                onKeyDown={(e) => e.key === "Enter" && addItem(list.id, headingId!)}
                                placeholder={section.heading?.sectionType === "observation" ? "Add observation…" : "Add item…"}
                                className="flex-1 rounded-lg border border-border/60 bg-background px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <button
                                onClick={() => addItem(list.id, headingId!)}
                                className="rounded-lg bg-primary/10 px-2 py-1 text-primary hover:bg-primary/20 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}

                  {activeItems.length === 0 && completedItems.length > 0 && (
                    <p className="text-xs text-center text-muted-foreground py-2">All items completed! 🎉</p>
                  )}

                  {/* Add item / observation */}
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
                          title="Add as task"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-3 px-1">
                        <button
                          onClick={() => {
                            if (!newItemText.trim()) return;
                            const newItem = { id: Date.now().toString(), text: newItemText.trim(), done: false, isObservation: true };
                            const updated = lists.map((l) =>
                              l.id === list.id ? { ...l, items: [...l.items, newItem] } : l
                            );
                            onUpdate(updated);
                            setNewItemText("");
                          }}
                          disabled={!newItemText.trim()}
                          className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-30"
                        >
                          💭 Add as observation
                         </button>
                        {!list.maxItems && (
                          addingSubheading !== list.id && (
                            <button
                              onClick={() => { setAddingSubheading(list.id); setSubheadingType("task"); }}
                              className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Add subheading
                            </button>
                          )
                        )}
                      </div>
                      {!list.maxItems && addingSubheading === list.id && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              autoFocus
                              value={subheadingText}
                              onChange={(e) => setSubheadingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && subheadingText.trim()) {
                                  const updated = lists.map((l) =>
                                    l.id === list.id
                                      ? { ...l, items: [...l.items, { id: Date.now().toString(), text: subheadingText.trim(), done: false, isHeading: true, sectionType: subheadingType }] }
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
                                      ? { ...l, items: [...l.items, { id: Date.now().toString(), text: subheadingText.trim(), done: false, isHeading: true, sectionType: subheadingType }] }
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
                          <div className="flex gap-2 px-1">
                            <button
                              onClick={() => setSubheadingType("task")}
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${subheadingType === "task" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                            >
                              ☑️ Task section
                            </button>
                            <button
                              onClick={() => setSubheadingType("observation")}
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${subheadingType === "observation" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                            >
                              💭 Observation section
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {list.maxItems && list.items.length >= list.maxItems && (
                    <p className="text-[11px] text-muted-foreground text-center pt-2">Max {list.maxItems} dreams — remove one to add another</p>
                  )}

                  {/* AI Suggest button — available on all lists */}
                  <button
                    onClick={() => suggestTasks(list.id)}
                    disabled={suggestingFor === list.id}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent/50 py-2 mt-2 text-xs font-medium text-accent-foreground hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {suggestingFor === list.id ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /> Ask AI for suggestions</>
                    )}
                  </button>
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
                                  className="w-7 h-7 rounded-md border flex items-center justify-center flex-shrink-0 bg-primary border-primary hover:bg-primary/70 transition-colors"
                                  title="Mark as incomplete"
                                >
                                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                                </button>
                                <span className="flex-1 text-sm text-muted-foreground">{item.text}</span>
                                <button
                                  onClick={() => removeItem(list.id, item.id)}
                                  className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
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

      {/* Always-visible templates section */}
      {!hideNewButton && !showTemplates && !creatingBlank && (
        <div className="space-y-3 pt-2">
          <div className="border-t border-border/50 pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Templates</p>
          </div>

          {/* Core templates */}
          {templates.filter(t => t.category !== "suggested").map((t, i) => {
            const isUsed = existingTemplateIds.has(t.id);
            return (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => !isUsed && createFromTemplate(t.id)}
                disabled={isUsed}
                className={`w-full flex items-center gap-3 rounded-xl p-3.5 text-left ${t.gradient} border border-border/30 transition-all ${
                  isUsed ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.01] cursor-pointer"
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isUsed ? "text-muted-foreground" : "text-foreground"}`}>{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isUsed ? "Delete current list to re-use this template" : t.description}
                  </p>
                </div>
                {!isUsed && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </motion.button>
            );
          })}


          <SexBucketList lists={lists} onUpdate={onUpdate} />

          {templates.filter(t => t.category === "suggested").map((t, i) => {
            const isUsed = existingTemplateIds.has(t.id);
            return (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => !isUsed && createFromTemplate(t.id)}
                disabled={isUsed}
                className={`w-full flex items-center gap-3 rounded-xl p-3.5 text-left ${t.gradient} border border-border/30 transition-all ${
                  isUsed ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.01] cursor-pointer"
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isUsed ? "text-muted-foreground" : "text-foreground"}`}>{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isUsed ? "Delete current list to re-use this template" : t.description}
                  </p>
                </div>
                {!isUsed && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </motion.button>
            );
          })}

          {/* Blank list option */}
          <button
            onClick={() => setCreatingBlank(true)}
            className="w-full flex items-center gap-3 rounded-xl p-3.5 text-left bg-secondary/50 border border-border/30 hover:bg-secondary transition-colors"
          >
            <span className="text-xl">📝</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Blank List</p>
              <p className="text-xs text-muted-foreground">Start from scratch</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SharedLists;
