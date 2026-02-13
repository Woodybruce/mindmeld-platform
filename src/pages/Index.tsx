import AppHeader from "@/components/AppHeader";
import StoriesBar from "@/components/StoriesBar";
import BottomNav from "@/components/BottomNav";
import FeedCard from "@/components/FeedCard";
import { sampleFeedData } from "@/components/feedData";

const Index = () => {
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <AppHeader />

      {/* Stories navigation */}
      <div className="border-b border-border/50">
        <StoriesBar />
      </div>

      {/* Feed */}
      <main className="px-4 py-4 space-y-4 pb-24">
        {sampleFeedData.map((item, index) => (
          <FeedCard key={item.id} item={item} index={index} />
        ))}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
