import AppHeader from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ListChecks, FolderOpen,
  FileText, Image, File,
  Camera, Calendar,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";

import GameCard from "@/components/connect/GameCard";
import SharedLists from "@/components/connect/SharedLists";
import type { UserList } from "@/components/connect/SharedLists";
import WeeklyList from "@/components/connect/WeeklyList";
import OurPhotos from "@/components/connect/OurPhotos";
import OurEvents from "@/components/connect/OurEvents";

import SharedFileManager from "@/components/connect/SharedFileManager";
import { usePartnerQuizActivity } from "@/hooks/usePartnerQuizActivity";
import PartnerQuizBanner from "@/components/connect/PartnerQuizBanner";

const mockFiles = [
  { name: "Holiday Itinerary.pdf", type: "pdf", updated: "2 days ago" },
  { name: "Wedding Mood Board", type: "folder", updated: "5 days ago" },
  { name: "Apartment Shortlist.docx", type: "doc", updated: "1 week ago" },
  { name: "Us — Summer 2025", type: "image", updated: "2 weeks ago" },
  { name: "Budget Tracker.xlsx", type: "doc", updated: "3 weeks ago" },
];

const fileIcon = (type: string) => {
  switch (type) {
    case "pdf": return <FileText className="w-5 h-5 text-destructive" />;
    case "image": return <Image className="w-5 h-5 text-us-gold" />;
    case "folder": return <FolderOpen className="w-5 h-5 text-us-sage" />;
    default: return <File className="w-5 h-5 text-primary" />;
  }
};

const defaultLists: UserList[] = [
  {
    id: "default-long-term-goals",
    name: "Our Long-Term Goals",
    icon: "⭐",
    template: "long-term-goals",
    createdAt: new Date().toISOString(),
    maxItems: 5,
    items: [
      { id: "ltg-h1", text: "Our 5 Long-Term Goals", done: false, isHeading: true },
      { id: "ltg-h2", text: "How we'll achieve them", done: false, isHeading: true },
    ],
  },
];

const Us = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "lists";
  const listId = searchParams.get("listId") || null;
  
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const { partnerActivity, dismiss: dismissActivity } = usePartnerQuizActivity();

  useEffect(() => {
    const stored = localStorage.getItem("userLists");
    let parsed: UserList[] = stored ? JSON.parse(stored) : [];

    // One-time fix: reset falsely completed items from template creation bug
    const fixKey = "lists-done-fix-v1";
    if (!localStorage.getItem(fixKey) && parsed.length > 0) {
      parsed = parsed.map(list => ({
        ...list,
        items: list.items.map(item => ({ ...item, done: false })),
      }));
      localStorage.setItem(fixKey, "1");
      localStorage.setItem("userLists", JSON.stringify(parsed));
    }

    // Ensure Long-Term Goals always exists
    const hasLTG = parsed.some((l) => l.template === "long-term-goals");
    if (!hasLTG) {
      parsed = [...parsed, ...defaultLists.filter((d) => d.template === "long-term-goals")];
      localStorage.setItem("userLists", JSON.stringify(parsed));
    }
    setUserLists(parsed);
  }, []);

  const handleListsUpdate = (updated: UserList[]) => {
    setUserLists(updated);
    localStorage.setItem("userLists", JSON.stringify(updated));
  };


  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <AppHeader subtitle="Your shared world" />

      {partnerActivity && (
        <PartnerQuizBanner
          quizTitle={partnerActivity.quizTitle}
          quizEmoji={partnerActivity.quizEmoji}
          onDismiss={dismissActivity}
        />
      )}

      <Tabs defaultValue={defaultTab} className="px-4 pt-3 pb-24">
        <TabsList className="flex flex-wrap h-auto bg-secondary gap-1 p-1.5 rounded-2xl">
            <TabsTrigger value="lists" className="gap-1.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">
              <ListChecks className="w-4 h-4 text-blue-500" /> Lists
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-1.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">
              <span className="text-base">💋</span> Games
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-1.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">
              <Camera className="w-4 h-4 text-pink-500" /> Photos
            </TabsTrigger>
          </TabsList>

        {/* Lists — default tab, imported from OneNote */}
        <TabsContent value="lists" className="mt-4 space-y-5">
          <WeeklyList />
          {/* Long-Term Goals pinned above other lists */}
          {userLists.filter((l) => l.template === "long-term-goals").length > 0 && (
            <SharedLists
              lists={userLists.filter((l) => l.template === "long-term-goals")}
              allExistingTemplates={userLists.map(l => l.template).filter(Boolean) as string[]}
              hideNewButton
              initialExpandedId={listId}
              onUpdate={(updated) => {
                const others = userLists.filter((l) => l.template !== "long-term-goals");
                handleListsUpdate([...updated, ...others]);
              }}
            />
          )}
          <div className="border-t border-border/50 pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Our Lists</p>
            <SharedLists
              lists={userLists.filter((l) => l.template !== "long-term-goals")}
              allExistingTemplates={userLists.map(l => l.template).filter(Boolean) as string[]}
              initialExpandedId={listId}
              onUpdate={(updated) => {
                const pinned = userLists.filter((l) => l.template === "long-term-goals");
                handleListsUpdate([...pinned, ...updated]);
              }}
            />
          </div>
        </TabsContent>

        {/* Games */}
        <TabsContent value="games" className="mt-4 space-y-3">
          <p className="text-sm font-bold text-foreground">Fun activities to play together</p>
          <GameCard title="Kiss Chase" description="Chase each other in real life using GPS!" emoji="💋" players="2 players · Outdoors" gradient="bg-gradient-to-br from-us-coral/15 to-us-blush/25" onClick={() => navigate("/kiss-chase")} delay={0} />
          <GameCard title="Design My Night" description="Draw cards to plan your perfect date night together." emoji="🌙" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-blush/25 to-us-coral/15" onClick={() => navigate("/design-my-night")} delay={0.08} />
          <GameCard title="Truth or Dare" description="Couples edition with spicy and sweet options." emoji="🎯" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-gold/15 to-us-cream/30" onClick={() => navigate("/truth-or-dare")} delay={0.16} />
          <GameCard title="Dare Duel" description="Draw dares and challenge your partner to beat you." emoji="⚔️" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-coral/20 to-us-gold/15" onClick={() => navigate("/dare-duel")} delay={0.24} />
          <GameCard title="Spicy Would You Rather" description="Hot choices and spicy dilemmas for two." emoji="🔥" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-coral/20 to-us-gold/15" onClick={() => navigate("/would-you-rather")} delay={0.32} />
          <GameCard title="Photo Challenge" description="Complete fun photo tasks together as a team." emoji="📸" players="2 players · Outdoors" gradient="bg-gradient-to-br from-us-blush/20 to-us-coral/10" onClick={() => navigate("/photo-challenge")} delay={0.4} />
        </TabsContent>

        {/* Photos */}
        <TabsContent value="photos" className="mt-4">
          <OurPhotos />
        </TabsContent>

        {/* Admin — Events, Photos & Files */}
        <TabsContent value="admin" className="mt-4 space-y-6">

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-us-gold" />
              <p className="text-sm font-bold text-foreground uppercase tracking-wider">Events & Calendar</p>
            </div>
            <OurEvents />
          </div>

          <div className="border-t border-border/50 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-us-navy" />
              <p className="text-sm font-bold text-foreground uppercase tracking-wider">Shared Files</p>
            </div>
            <SharedFileManager />
          </div>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Us;
