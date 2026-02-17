import type { FeedItem } from "./FeedCard";

import feedJournal from "@/assets/feed-journal.jpg";

export const sampleFeedData: FeedItem[] = [
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
  {
    id: "0",
    type: "update",
    size: "full",
    tag: "Kiss Chase",
    tagColor: "text-us-coral",
    emoji: "🏃‍♂️💋🏃‍♀️",
    title: "Kiss Chase",
    subtitle: "A real-world game of chase with rewards",
    body: "Turn on location, set a time limit, pick a reward — then go find your partner!",
    timeAgo: "New",
    link: "/kiss-chase",
  },
];
