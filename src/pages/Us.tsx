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
import { useSharedLists } from "@/hooks/useSharedLists";
import SpotifyWidget from "@/components/SpotifyWidget";

const Us = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "lists";
  const listId = searchParams.get("listId") || null;

  const { lists: userLists, loading: listsLoading, handleBulkUpdate } = useSharedLists();
  const { partnerActivity, dismiss: dismissActivity } = usePartnerQuizActivity();

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

        {/* Lists — default tab */}
        <TabsContent value="lists" className="mt-4 space-y-5">
          <SpotifyWidget />
          <WeeklyList />
          <div className="border-t border-border/50 pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Our Lists</p>
            <SharedLists
              lists={userLists}
              allExistingTemplates={userLists.map(l => l.template).filter(Boolean) as string[]}
              initialExpandedId={listId}
              onUpdate={handleBulkUpdate}
            />
          </div>
        </TabsContent>

        {/* Games */}
        <TabsContent value="games" className="mt-4 space-y-3">
          <p className="text-sm font-bold text-foreground">Sexy games for two 🔥</p>
          <GameCard title="Kiss Chase" description="Chase your lover by GPS — winner gets a kiss." emoji="💋" players="2 players · Outdoors" gradient="bg-gradient-to-br from-us-coral/15 to-us-blush/25" onClick={() => navigate("/kiss-chase")} delay={0} />
          <GameCard title="Design My Night" description="Draw cards to plan the ultimate sexy date night." emoji="🌙" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-blush/25 to-us-coral/15" onClick={() => navigate("/design-my-night")} delay={0.08} />
          <GameCard title="Truth or Dare" description="Naughty truths and steamy dares for couples." emoji="😈" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-gold/15 to-us-cream/30" onClick={() => navigate("/truth-or-dare")} delay={0.16} />
          <GameCard title="Dare Duel" description="Take turns setting daring challenges — loser strips." emoji="⚔️" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-coral/20 to-us-gold/15" onClick={() => navigate("/dare-duel")} delay={0.24} />
          <GameCard title="Spicy Would You Rather" description="Steamy dilemmas — pick your fantasy, reveal together." emoji="🔥" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-coral/20 to-us-blush/20" onClick={() => navigate("/would-you-rather")} delay={0.32} />
          <GameCard title="Photo Challenge" description="Saucy couple photo tasks — share to your private album." emoji="📸" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-blush/20 to-us-coral/10" onClick={() => navigate("/photo-challenge")} delay={0.4} />
          <GameCard title="Sex Bucket Challenge" description="5 random picks from your bucket list — schedule & do them!" emoji="🪣" players="2 players · Anywhere" gradient="bg-gradient-to-br from-destructive/15 to-us-coral/20" onClick={() => navigate("/sex-bucket-game")} delay={0.48} />
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
