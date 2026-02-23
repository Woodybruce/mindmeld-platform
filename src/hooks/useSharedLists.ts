import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserList } from "@/components/connect/SharedLists";


function dbRowToList(row: any): UserList {
  const sd = row.score_data || {};
  const meta = sd._listMeta as { status?: string; createdBy?: string } | undefined;
  const { _listMeta, ...pureScoreData } = sd;
  const hasScoreData = pureScoreData.sections || pureScoreData.snapshots;
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    template: row.template || undefined,
    createdAt: row.created_at,
    maxItems: row.max_items || undefined,
    aiSuggestable: row.ai_suggestable || undefined,
    scoreData: hasScoreData ? pureScoreData : undefined,
    items: Array.isArray(row.items) ? row.items : [],
    status: (meta?.status as any) || "active",
    createdBy: meta?.createdBy || row.user_id || undefined,
  };
}

function buildScoreDataPayload(list: UserList): any {
  const meta: any = {};
  if (list.status && list.status !== "active") meta.status = list.status;
  if (list.createdBy) meta.createdBy = list.createdBy;
  const base = list.scoreData ? JSON.parse(JSON.stringify(list.scoreData)) : {};
  if (Object.keys(meta).length > 0) base._listMeta = meta;
  return Object.keys(base).length > 0 ? base : null;
}

export function useSharedLists() {
  const { user, profile } = useAuth();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLists = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from("shared_lists")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const result = data.map(dbRowToList);
      setLists(result);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  // Realtime sync
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("shared-lists-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_lists" }, () => fetchLists())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchLists]);

  const addList = useCallback(async (list: UserList) => {
    if (!user) return;
    const { data } = await supabase.from("shared_lists").insert({
      user_id: user.id,
      name: list.name,
      icon: list.icon,
      template: list.template || null,
      max_items: list.maxItems || null,
      items: JSON.parse(JSON.stringify(list.items)),
      ai_suggestable: list.aiSuggestable || false,
      score_data: buildScoreDataPayload(list),
    } as any).select().single();
    if (data) {
      setLists((prev) => [dbRowToList(data), ...prev]);
      return data.id as string;
    }
  }, [user, profile]);

  const updateList = useCallback(async (id: string, updates: Partial<UserList>) => {
    const existing = lists.find((l) => l.id === id);
    const merged = existing ? { ...existing, ...updates } : updates as UserList;
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.icon !== undefined) payload.icon = updates.icon;
    if (updates.items !== undefined) payload.items = JSON.parse(JSON.stringify(updates.items));
    if (updates.scoreData !== undefined || updates.status !== undefined || updates.createdBy !== undefined) {
      payload.score_data = buildScoreDataPayload(merged);
    }
    payload.updated_at = new Date().toISOString();

    await supabase.from("shared_lists").update(payload).eq("id", id);
    setLists((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
  }, [lists]);

  const deleteList = useCallback(async (id: string) => {
    await supabase.from("shared_lists").delete().eq("id", id);
    setLists((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // Convenience: update handler compatible with SharedLists onUpdate prop
  const handleBulkUpdate = useCallback(async (updatedLists: UserList[]) => {
    for (const ul of updatedLists) {
      const existing = lists.find((l) => l.id === ul.id);
      if (!existing) {
        await addList(ul);
      } else if (JSON.stringify(existing.items) !== JSON.stringify(ul.items) ||
                 existing.name !== ul.name || existing.icon !== ul.icon ||
                 existing.status !== ul.status || existing.createdBy !== ul.createdBy) {
        await updateList(ul.id, { items: ul.items, name: ul.name, icon: ul.icon, scoreData: ul.scoreData, status: ul.status, createdBy: ul.createdBy });
      }
    }
    for (const existing of lists) {
      if (!updatedLists.find((u) => u.id === existing.id)) {
        await deleteList(existing.id);
      }
    }
  }, [lists, addList, updateList, deleteList]);

  return { lists, loading, addList, updateList, deleteList, handleBulkUpdate, fetchLists };
}
