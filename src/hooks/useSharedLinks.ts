import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SharedLinkRow {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  note: string | null;
  platform: string;
  created_at: string;
}

export interface MatchedLink {
  url: string;
  yourLink: SharedLinkRow;
  partnerLink: SharedLinkRow;
}

const detectPlatform = (url: string): string => {
  if (url.includes("instagram.com") || url.includes("instagr.am")) return "Instagram";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  if (url.includes("tiktok.com")) return "TikTok";
  if (url.includes("bbc.") || url.includes("news") || url.includes("guardian")) return "Article";
  return "Link";
};

export const useSharedLinks = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<SharedLinkRow[]>([]);
  const [matchedLinks, setMatchedLinks] = useState<MatchedLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("shared_links")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setLinks(data);
      // Detect matches: same URL shared by different users
      const byUrl = new Map<string, SharedLinkRow[]>();
      data.forEach((l) => {
        const normalized = l.url.split("?")[0].replace(/\/$/, "");
        const existing = byUrl.get(normalized) || [];
        existing.push(l);
        byUrl.set(normalized, existing);
      });

      const matches: MatchedLink[] = [];
      byUrl.forEach((group) => {
        const yours = group.find((l) => l.user_id === user.id);
        const theirs = group.find((l) => l.user_id !== user.id);
        if (yours && theirs) {
          matches.push({ url: yours.url, yourLink: yours, partnerLink: theirs });
        }
      });
      setMatchedLinks(matches);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("shared-links-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_links" }, () => {
        fetchLinks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchLinks]);

  const addLink = async (url: string, note?: string, title?: string) => {
    if (!user) return;

    const raw = url.trim();
    if (!raw) throw new Error("Please enter a link");

    // Parse as-is; if it has no scheme (bare domain), retry with https://.
    let parsed: URL | null = null;
    try {
      parsed = new URL(raw);
    } catch {
      try {
        parsed = new URL(`https://${raw}`);
      } catch {
        parsed = null;
      }
    }
    if (!parsed) throw new Error("That doesn't look like a valid link");

    // Reject anything that isn't a real web link (blocks stored javascript: XSS etc.)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Only http and https links are allowed");
    }

    const finalUrl = parsed.toString();
    const platform = detectPlatform(finalUrl);
    await supabase.from("shared_links").insert({
      user_id: user.id,
      url: finalUrl,
      title: title || null,
      note: note || null,
      platform,
    });
  };

  const removeLink = async (id: string) => {
    await supabase.from("shared_links").delete().eq("id", id);
  };

  const myLinks = links.filter((l) => l.user_id === user?.id);
  const partnerLinks = links.filter((l) => l.user_id !== user?.id);

  return { links, myLinks, partnerLinks, matchedLinks, addLink, removeLink, loading };
};
