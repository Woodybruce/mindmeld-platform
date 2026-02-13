import AppHeader from "@/components/AppHeader";
import StoriesBar from "@/components/StoriesBar";
import BottomNav from "@/components/BottomNav";
import FeedCard from "@/components/FeedCard";
import SharedLinksWidget from "@/components/SharedLinksWidget";
import DailyListsWidget from "@/components/DailyListsWidget";
import CalendarWidget from "@/components/CalendarWidget";
import MatchedLinkCard from "@/components/MatchedLinkCard";
import SetupPrompts from "@/components/SetupPrompts";
import { useSharedLinks } from "@/hooks/useSharedLinks";
import { sampleFeedData } from "@/components/feedData";
import type { FeedItem } from "@/components/FeedCard";
import {
  QuizzesPreview,
  PromptsPreview,
  GamesPreview,
  PhotosPreview,
  GratitudePreview,
  FilesPreview,
} from "@/components/UsSectionPreviews";

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
  const { myLinks, partnerLinks, matchedLinks, addLink } = useSharedLinks();

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <AppHeader />

      <div className="border-b border-border/50">
        <StoriesBar />
      </div>

      <main className="px-3 py-4 space-y-4 pb-24">
        {/* Setup prompts for new users */}
        <SetupPrompts />

        {/* Matched links from both partners */}
        {matchedLinks.length > 0 && (
          <div className="space-y-3">
            {matchedLinks.map((match) => (
              <MatchedLinkCard key={match.url} match={match} />
            ))}
          </div>
        )}

        {rows.map((row, idx) => {
          const content = Array.isArray(row) ? (
            <div key={`pair-${idx}`} className="grid grid-cols-2 gap-3">
              <FeedCard item={row[0]} index={idx} />
              <FeedCard item={row[1]} index={idx + 1} />
            </div>
          ) : (
            <FeedCard key={row.id} item={row} index={idx} />
          );

          // After row 0: Prompts preview
          if (idx === 0) {
            return (
              <div key={`group-${idx}`} className="space-y-3">
                {content}
                <PromptsPreview />
              </div>
            );
          }

          // After row 1: Daily Lists + Quizzes
          if (idx === 1) {
            return (
              <div key={`group-${idx}`} className="space-y-3">
                {content}
                <DailyListsWidget />
                <QuizzesPreview />
              </div>
            );
          }

          // After row 2: Games + Photos
          if (idx === 2) {
            return (
              <div key={`group-${idx}`} className="space-y-3">
                {content}
                <GamesPreview />
                <PhotosPreview />
              </div>
            );
          }

          // After row 3: Calendar + Shared Links + Gratitude
          if (idx === 3) {
            return (
              <div key={`group-${idx}`} className="space-y-3">
                {content}
                <CalendarWidget />
                <SharedLinksWidget dbLinks={[...myLinks, ...partnerLinks]} onSendLink={addLink} />
                <GratitudePreview />
              </div>
            );
          }

          // After row 4: Files
          if (idx === 4) {
            return (
              <div key={`group-${idx}`} className="space-y-3">
                {content}
                <FilesPreview />
              </div>
            );
          }

          return content;
        })}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
