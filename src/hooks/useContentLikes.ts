import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Like {
  content_id: string;
  user_id: string;
  content_title?: string;
}

export const useContentLikes = (contentType: string) => {
  const { user, profile } = useAuth();
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [partnerLikes, setPartnerLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchLikes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("content_likes")
      .select("content_id, user_id")
      .eq("content_type", contentType);

    if (data) {
      const mine = new Set<string>();
      const partner = new Set<string>();
      (data as any[]).forEach((row: any) => {
        if (row.user_id === user.id) mine.add(row.content_id);
        else partner.add(row.content_id);
      });
      setMyLikes(mine);
      setPartnerLikes(partner);
    }
  }, [user, contentType]);

  useEffect(() => { fetchLikes(); }, [fetchLikes]);

  // Realtime partner likes
  useEffect(() => {
    if (!profile?.partner_id) return;
    const channel = supabase
      .channel(`likes-${contentType}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "content_likes",
        filter: `user_id=eq.${profile.partner_id}`,
      }, () => { fetchLikes(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.partner_id, contentType, fetchLikes]);

  const toggleLike = async (contentId: string, title?: string) => {
    if (!user || loading) return;
    setLoading(true);

    if (myLikes.has(contentId)) {
      setMyLikes((prev) => { const next = new Set(prev); next.delete(contentId); return next; });
      await supabase
        .from("content_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("content_type", contentType)
        .eq("content_id", contentId);
    } else {
      setMyLikes((prev) => new Set(prev).add(contentId));
      await supabase
        .from("content_likes")
        .insert({
          user_id: user.id,
          content_type: contentType,
          content_id: contentId,
          content_title: title || null,
        } as any);
    }
    setLoading(false);
  };

  const isLikedByMe = (contentId: string) => myLikes.has(contentId);
  const isLikedByPartner = (contentId: string) => partnerLikes.has(contentId);
  const isMutualLike = (contentId: string) => myLikes.has(contentId) && partnerLikes.has(contentId);

  return { toggleLike, isLikedByMe, isLikedByPartner, isMutualLike };
};
