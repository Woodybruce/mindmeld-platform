import AppHeader from "@/components/AppHeader";
import StoriesBar from "@/components/StoriesBar";
import BottomNav from "@/components/BottomNav";
import FeedCard from "@/components/FeedCard";
import SharedLinksWidget from "@/components/SharedLinksWidget";
import DailyListsWidget from "@/components/DailyListsWidget";
import CalendarWidget from "@/components/CalendarWidget";
import { sampleFeedData } from "@/components/feedData";
import type { FeedItem } from "@/components/FeedCard";

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

  // Insert shared links widget after 3rd row
  const insertAt = 3;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <AppHeader />

      <div className="border-b border-border/50">
        <StoriesBar />
      </div>

      <main className="px-3 py-3 space-y-3 pb-24">
        {rows.map((row, idx) => {
          const content = Array.isArray(row) ? (
            <div key={`pair-${idx}`} className="grid grid-cols-2 gap-3">
              <FeedCard item={row[0]} index={idx} />
              <FeedCard item={row[1]} index={idx + 1} />
            </div>
          ) : (
            <FeedCard key={row.id} item={row} index={idx} />
          );

          // Insert SharedLinksWidget after the designated row
          if (idx === 1) {
            return (
              <div key={`group-${idx}`} className="space-y-3">
                {content}
                <DailyListsWidget />
              </div>
            );
          }

          if (idx === insertAt) {
            return (
              <div key={`group-${idx}`} className="space-y-3">
                {content}
                <CalendarWidget />
                <SharedLinksWidget />
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
