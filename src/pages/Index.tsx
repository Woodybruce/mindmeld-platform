import { useState, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import StoriesBar from "@/components/StoriesBar";
import BottomNav from "@/components/BottomNav";
import FeedCard from "@/components/FeedCard";
import DailyListsWidget from "@/components/DailyListsWidget";
import CalendarWidget from "@/components/CalendarWidget";
import SetupPrompts from "@/components/SetupPrompts";
import Onboarding from "@/components/Onboarding";
import { useAuth } from "@/contexts/AuthContext";
import { sampleFeedData } from "@/components/feedData";
import type { FeedItem } from "@/components/FeedCard";
import GamesCarousel from "@/components/GamesCarousel";

import CuratedLinksWidget from "@/components/CuratedLinksWidget";
import SuggestedProducts from "@/components/SuggestedProducts";
import { useFeedContent } from "@/hooks/useFeedContent";
import { PhotosPreview } from "@/components/UsSectionPreviews";
import { ListsSummaryWidget } from "@/components/ListsSummaryWidget";
import RecentActivityWidget from "@/components/RecentActivityWidget";
import InstaFeedWidget from "@/components/InstaFeedWidget";
import DailyPromptCard from "@/components/DailyPromptCard";
import AnniversaryCountdown from "@/components/AnniversaryCountdown";
import StreaksWidget from "@/components/StreaksWidget";
import PartnerInviteCard from "@/components/PartnerInviteCard";
import PullToRefresh from "@/components/PullToRefresh";
// Groups feed items: consecutive "half" items pair up, others standalone
const layoutItems = (items: FeedItem[]) => {
  const rows: (FeedItem | [FeedItem, FeedItem])[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item.size === "half" && i + 1 < items.length && items[i + 1].size === "half") {
      rows.push([item, items[i + 1]]);
      i += 2;
    } else {
      rows.push(item);
      i++;
    }
  }
  return rows;
};

const Index = () => {
  const rows = layoutItems(sampleFeedData);
  const { user, profile } = useAuth();
  const { data: backendFeedItems = [] } = useFeedContent(2);
  

  const [onboardingDone, setOnboardingDone] = useState(() => {
    return localStorage.getItem("us-onboarding-done") === "true";
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem("us-onboarding-done", "true");
    setOnboardingDone(true);
  };

  if (user && !onboardingDone) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <AppHeader subtitle="Your shared world" />

      <div className="border-b border-border/50">
        <StoriesBar />
      </div>

      <PullToRefresh onRefresh={async () => { window.location.reload(); }}>
      <main className="px-3 py-4 space-y-4 pb-24">
        <SetupPrompts />

        {/* Partner invite (only shows if no partner linked) */}
        <PartnerInviteCard />


        {/* Today's tasks — inline at top */}
        <DailyListsWidget />

        {/* Streaks & milestones */}
        <StreaksWidget />

        {/* Daily prompt */}
        <DailyPromptCard />

        {/* Anniversary countdown */}
        <AnniversaryCountdown />

        {/* What's been updated */}
        <RecentActivityWidget />

        {/* Calendar */}
        <CalendarWidget />

        {/* Games carousel */}
        <GamesCarousel />

        {/* Half cards */}
        {rows[1] && (
          Array.isArray(rows[1]) ? (
            <div className="grid grid-cols-2 gap-3">
              <FeedCard item={rows[1][0]} index={2} />
              <FeedCard item={rows[1][1]} index={3} />
            </div>
          ) : (
            <FeedCard item={rows[1]} index={2} />
          )
        )}

        {/* Backend-driven content (quizzes, prompts, tips) — compact 2-up grid */}
        {backendFeedItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {backendFeedItems.map((item, idx) => (
              <FeedCard key={item.id} item={{ ...item, size: "half" }} index={idx + 10} />
            ))}
          </div>
        )}

        {/* Lists summary */}
        <ListsSummaryWidget />

        {/* Our Photos */}
        <PhotosPreview />

        {/* Instagram feed */}
        <InstaFeedWidget />


        {/* Curated links & relationship articles */}
        <CuratedLinksWidget />

        {/* Shopping suggestions with categories */}
        <SuggestedProducts />

        {/* Remaining feed cards */}
        {rows.slice(2).map((row, idx) => (
          Array.isArray(row) ? (
            <div key={`pair-${idx + 2}`} className="grid grid-cols-2 gap-3">
              <FeedCard item={row[0]} index={idx + 4} />
              <FeedCard item={row[1]} index={idx + 5} />
            </div>
          ) : (
            <FeedCard key={row.id} item={row} index={idx + 4} />
          )
        ))}



      </main>
      </PullToRefresh>

      <BottomNav />
    </div>
  );
};

export default Index;
