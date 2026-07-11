import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, MessageCircle, Gamepad2, Camera,
  Heart, FolderOpen, ChevronRight, RefreshCw, Check, Circle
} from "lucide-react";
import type { UserList } from "@/components/connect/SharedLists";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrls } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";

interface SectionPreviewProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  tab: string;
  children?: React.ReactNode;
}

const SectionPreview = ({ title, subtitle, icon, gradient, tab, children }: SectionPreviewProps) => {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => navigate(`/us?tab=${tab}`)}
        className="w-full flex items-center gap-3 px-4 pt-4 pb-3 text-left"
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-primary-foreground shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
      {children && <div className="px-4 pb-4 pt-1">{children}</div>}
    </motion.div>
  );
};

/* ── Quizzes Preview — pulls completed count from localStorage ── */
export const QuizzesPreview = () => {
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("completedQuizzes");
    if (stored) {
      try { setCompletedCount(JSON.parse(stored).length); } catch {}
    }
    const handleStorage = () => {
      const s = localStorage.getItem("completedQuizzes");
      if (s) try { setCompletedCount(JSON.parse(s).length); } catch {}
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <SectionPreview
      title="Quizzes"
      subtitle={completedCount > 0 ? `${completedCount} completed · Take another?` : "How well do you know each other?"}
      icon={<Sparkles className="w-5 h-5" />}
      gradient="from-us-gold to-amber-500"
      tab="quizzes"
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { emoji: "💭", name: "Love Styles", color: "from-us-coral/20 to-us-blush/30" },
          { emoji: "🔥", name: "Intimacy", color: "from-us-terracotta/20 to-us-coral/20" },
          { emoji: "🧭", name: "Values", color: "from-us-sage/20 to-emerald-100" },
          { emoji: "✅", name: "Checklists", color: "from-us-gold/20 to-amber-100" },
        ].map((q) => (
          <div key={q.name} className={`flex items-center gap-2 bg-gradient-to-br ${q.color} rounded-xl px-3 py-2.5 shrink-0`}>
            <span className="text-lg">{q.emoji}</span>
            <span className="text-xs font-medium text-foreground whitespace-nowrap">{q.name}</span>
          </div>
        ))}
      </div>
    </SectionPreview>
  );
};

/* ── Prompts Preview — rotates through prompts ── */
const allPrompts = [
  { category: "Deep", text: "What's one thing you've never told me that you wish I knew?", color: "text-us-coral" },
  { category: "Playful", text: "If we could teleport anywhere right now, where would you take us?", color: "text-us-gold" },
  { category: "Growth", text: "What's one way I've helped you grow as a person?", color: "text-us-sage" },
  { category: "Memory", text: "What's your favourite memory of us from the last month?", color: "text-us-terracotta" },
  { category: "Intimacy", text: "When do you feel most connected to me?", color: "text-us-coral" },
  { category: "💬 Words", text: "Leave a sticky note with a sweet message somewhere they'll find it", color: "text-us-coral" },
  { category: "⏰ Time", text: "Take a tech-free walk together — no phones, just conversation", color: "text-us-sage" },
  { category: "🫂 Touch", text: "Give a 20-second hug. Count it out. Feel the difference", color: "text-primary" },
];

export const PromptsPreview = () => {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * allPrompts.length));
  const prompt = allPrompts[idx % allPrompts.length];

  return (
    <SectionPreview
      title="Daily Prompt"
      subtitle="Spark a meaningful conversation"
      icon={<MessageCircle className="w-5 h-5" />}
      gradient="from-us-coral to-us-terracotta"
      tab="prompts"
    >
      <div className="bg-gradient-to-br from-us-blush/30 to-us-coral/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[14px] font-bold uppercase tracking-wider ${prompt.color}`}>{prompt.category}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((i) => i + 1); }}
            className="w-6 h-6 rounded-full bg-background/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <p className="text-sm text-foreground italic leading-relaxed">"{prompt.text}"</p>
      </div>
    </SectionPreview>
  );
};

/* ── Games Preview — horizontal carousel ── */
export const GamesPreview = () => (
  <SectionPreview
    title="Games"
    subtitle="Fun activities to play together"
    icon={<Gamepad2 className="w-5 h-5" />}
    gradient="from-us-sage to-emerald-500"
    tab="games"
  >
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
      {[
        { emoji: "💋", name: "Kiss Chase", desc: "GPS chase game" },
        { emoji: "🎯", name: "Truth or Dare", desc: "Couples edition" },
        { emoji: "🤔", name: "Would You Rather", desc: "Hilarious debates" },
        { emoji: "📸", name: "Photo Challenge", desc: "Fun photo tasks" },
      ].map((g) => (
        <div key={g.name} className="bg-secondary/60 rounded-xl px-3 py-2.5 shrink-0 min-w-[120px]">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{g.emoji}</span>
            <span className="text-xs font-semibold text-foreground">{g.name}</span>
          </div>
          <p className="text-[14px] text-muted-foreground mt-0.5">{g.desc}</p>
        </div>
      ))}
    </div>
  </SectionPreview>
);

/* ── Photos Preview — shows count from localStorage/supabase ── */
export const PhotosPreview = () => {
  const { user, profile } = useAuth();
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const partnerId = profile?.partner_id;

  useEffect(() => {
    if (!user) return;
    const fetchPhotos = async () => {
      const urls: string[] = [];

      // Chat images
      if (partnerId) {
        const { data: chatData } = await supabase
          .from("messages")
          .select("image_url")
          .eq("message_type", "image")
          .not("image_url", "is", null)
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
          .order("created_at", { ascending: false })
          .limit(10);
        (chatData || []).forEach((m) => { if (m.image_url) urls.push(m.image_url); });
      }

      // Uploaded photos
      const { data: uploadData } = await supabase
        .from("couple_photos")
        .select("storage_path")
        .or(partnerId ? `user_id.eq.${user.id},user_id.eq.${partnerId}` : `user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(10);

      const signedMap = await getSignedUrls("couple-photos", (uploadData || []).map((p) => p.storage_path));
      (uploadData || []).forEach((p) => {
        const signed = signedMap[p.storage_path];
        if (signed) urls.push(signed);
      });

      // Shuffle for variety
      for (let i = urls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [urls[i], urls[j]] = [urls[j], urls[i]];
      }
      setPhotoUrls(urls.slice(0, 12));
    };
    fetchPhotos();
  }, [user, partnerId]);

  // Auto-rotate every 5 minutes
  useEffect(() => {
    if (photoUrls.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((i) => (i + 1) % photoUrls.length);
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [photoUrls.length]);

  const visiblePhotos = photoUrls.length > 0
    ? [0, 1].map((offset) => photoUrls[(currentIdx + offset) % photoUrls.length])
    : [];

  return (
    <SectionPreview
      title="Our Photos"
      subtitle={photoUrls.length > 0 ? `${photoUrls.length} shared memories` : "Shared memories together"}
      icon={<Camera className="w-5 h-5" />}
      gradient="from-us-blush to-pink-400"
      tab="photos"
    >
      {visiblePhotos.length > 0 ? (
        <div className="flex gap-3 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {visiblePhotos.map((url, i) => (
              <motion.div
                key={`${currentIdx}-${i}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.4 }}
                className="flex-1 aspect-[4/3] rounded-xl overflow-hidden bg-secondary"
              >
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex gap-2">
          {["📸 Upload photos", "👀 View together", "💬 Add captions"].map((item) => (
            <div key={item} className="bg-secondary/60 rounded-lg px-2.5 py-2 shrink-0">
              <span className="text-[13px] font-medium text-foreground">{item}</span>
            </div>
          ))}
        </div>
      )}
    </SectionPreview>
  );
};

/* ── Gratitude Preview — pulls latest from localStorage ── */
export const GratitudePreview = () => {
  const [latestEntry, setLatestEntry] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("gratitude-entries");
    if (stored) {
      try {
        const entries = JSON.parse(stored);
        if (entries.length > 0) setLatestEntry(entries[0].text || entries[0].entry);
      } catch {}
    }
  }, []);

  return (
    <SectionPreview
      title="Gratitude Journal"
      subtitle={latestEntry ? "Your latest entry" : "What are you grateful for today?"}
      icon={<Heart className="w-5 h-5" />}
      gradient="from-us-coral to-us-blush"
      tab="gratitude"
    >
      <div className="bg-gradient-to-br from-us-coral/10 to-us-blush/20 rounded-xl p-3.5">
        {latestEntry ? (
          <p className="text-sm text-foreground italic line-clamp-2">"{latestEntry}"</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Write what you're thankful for — it strengthens your bond 💕
          </p>
        )}
      </div>
    </SectionPreview>
  );
};

/* ── Files Preview — shows saved folder count ── */
export const FilesPreview = () => {
  const [folderCount, setFolderCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("shared-folder-embeds");
    if (stored) {
      try { setFolderCount(JSON.parse(stored).length); } catch {}
    }
  }, []);

  return (
    <SectionPreview
      title="Shared Files"
      subtitle={folderCount > 0 ? `${folderCount} folder${folderCount > 1 ? "s" : ""} linked` : "Connect your shared drives"}
      icon={<FolderOpen className="w-5 h-5" />}
      gradient="from-us-navy to-blue-600"
      tab="files"
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {["📁 OneDrive", "📁 Google Drive", "📁 Dropbox", "📓 Notion"].map((f) => (
          <div key={f} className="bg-secondary/60 rounded-lg px-2.5 py-2 shrink-0">
            <span className="text-[13px] font-medium text-foreground">{f}</span>
          </div>
        ))}
      </div>
    </SectionPreview>
  );
};
