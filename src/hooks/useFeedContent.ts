import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FeedItem } from "@/components/FeedCard";

interface FeedContentRow {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  body: string;
  emoji: string | null;
  image_url: string | null;
  tag: string;
  tag_color: string;
  link: string | null;
  size: string;
  weight: number;
}

/** Weighted random pick of `count` items from `rows` */
const weightedSample = (rows: FeedContentRow[], count: number): FeedContentRow[] => {
  const pool = [...rows];
  const result: FeedContentRow[] = [];
  while (result.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, r) => sum + r.weight, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      rand -= pool[i].weight;
      if (rand <= 0) {
        result.push(pool.splice(i, 1)[0]);
        break;
      }
    }
  }
  return result;
};

export const useFeedContent = (count = 3) => {
  return useQuery({
    queryKey: ["feed-content", count],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_content")
        .select("id, type, title, subtitle, body, emoji, image_url, tag, tag_color, link, size, weight")
        .eq("active", true);

      if (error) throw error;

      const picked = weightedSample(data || [], count);

      return picked.map((row): FeedItem => ({
        id: `feed-${row.id}`,
        type: row.type === "quiz" ? "quiz" : row.type === "prompt" ? "prompt" : "update",
        size: (row.size as "full" | "half" | "banner") || "half",
        title: row.title,
        subtitle: row.subtitle || undefined,
        body: row.body,
        emoji: row.emoji || undefined,
        image: row.image_url || undefined,
        tag: row.tag,
        tagColor: row.tag_color,
        timeAgo: "New",
        link: row.link || undefined,
      }));
    },
    staleTime: 1000 * 60 * 5, // refresh every 5 min
  });
};
