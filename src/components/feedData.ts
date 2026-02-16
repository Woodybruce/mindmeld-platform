import type { FeedItem } from "./FeedCard";

import feedDatenight from "@/assets/feed-datenight.jpg";
import feedTravel from "@/assets/feed-travel.jpg";
import feedMilestone from "@/assets/feed-milestone.jpg";
import feedJournal from "@/assets/feed-journal.jpg";
import feedCooking from "@/assets/feed-cooking.jpg";
import feedSurprise from "@/assets/feed-surprise.jpg";
import feedHands from "@/assets/feed-hands.jpg";

export const sampleFeedData: FeedItem[] = [
  {
    id: "0",
    type: "update",
    size: "banner",
    tag: "🏃‍♂️💋🏃‍♀️ Kiss Chase",
    tagColor: "text-us-coral",
    title: "Challenge your partner to Kiss Chase!",
    subtitle: "A real-world game of chase with rewards",
    body: "Turn on location, set a time limit, pick a reward — then go find your partner!",
    timeAgo: "New",
    link: "/kiss-chase",
  },
  {
    id: "1b",
    type: "quiz",
    size: "half",
    tag: "Quiz",
    tagColor: "text-us-gold",
    title: "Know their favourites?",
    body: "5 new questions ready. Streak: 12 days 🔥",
    image: feedCooking,
    timeAgo: "2h ago",
    liked: true,
  },
  {
    id: "4",
    type: "milestone",
    size: "full",
    tag: "Milestone",
    tagColor: "text-us-sage",
    title: "🎉 3 months of daily check-ins!",
    body: "90 consecutive prompts! Emotional check-ins improve satisfaction by 34%.",
    image: feedMilestone,
    timeAgo: "Today",
    liked: true,
    saved: true,
  },
  {
    id: "2",
    type: "blog",
    size: "banner",
    tag: "Read · Wellness",
    tagColor: "text-muted-foreground",
    title: "The 5-minute ritual that transformed our mornings",
    subtitle: "From the US Journal",
    body: "Couples who share a brief morning ritual report feeling 40% more connected.",
    image: feedJournal,
    timeAgo: "6h ago",
  },
];
