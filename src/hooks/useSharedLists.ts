import { useState, useEffect, useCallback, useRef } from "react";
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

const getListsCache = (userId: string): UserList[] | null => {
  try {
    const raw = localStorage.getItem(`us-lists-${userId}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > 1000 * 60 * 15) return null;
    return data;
  } catch { return null; }
};
const setListsCache = (userId: string, lists: UserList[]) => {
  try { localStorage.setItem(`us-lists-${userId}`, JSON.stringify({ data: lists, ts: Date.now() })); } catch {}
};

const getListOrder = (userId: string): string[] | null => {
  try {
    const raw = localStorage.getItem(`us-list-order-${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const setListOrder = (userId: string, order: string[]) => {
  try { localStorage.setItem(`us-list-order-${userId}`, JSON.stringify(order)); } catch {}
};

function applyOrder(lists: UserList[], order: string[] | null): UserList[] {
  if (!order || order.length === 0) return lists;
  const map = new Map(lists.map(l => [l.id, l]));
  const ordered: UserList[] = [];
  for (const id of order) {
    const l = map.get(id);
    if (l) { ordered.push(l); map.delete(id); }
  }
  map.forEach(l => ordered.push(l));
  return ordered;
}

export function useSharedLists() {
  const { user, profile } = useAuth();
  const cached = user ? getListsCache(user.id) : null;
  const savedOrder = user ? getListOrder(user.id) : null;
  const [lists, setLists] = useState<UserList[]>(applyOrder(cached || [], savedOrder));
  const [loading, setLoading] = useState(!cached);
  // Dedupes concurrent inserts of the same logical list (double-click "create").
  const addInFlight = useRef<Map<string, Promise<string | undefined>>>(new Map());

  const fetchLists = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    if (!lists.length) setLoading(true);

    const { data, error } = await supabase
      .from("shared_lists")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const INTERNAL_PREFIXES = ["__"];
      // Exact-match internal storage markers that don't use the "__" prefix.
      const INTERNAL_NAMES = new Set(["Shared Folders"]);
      const result = data
        .filter((row: any) =>
          !INTERNAL_PREFIXES.some(p => row.name?.startsWith(p)) &&
          !INTERNAL_NAMES.has(row.name)
        )
        .map(dbRowToList);
      const order = getListOrder(user.id);
      const ordered = applyOrder(result, order);
      setLists(ordered);
      if (user) setListsCache(user.id, ordered);
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
    // Guard against two rapid saves inserting duplicate rows for the same list.
    const key = list.id || `${list.name}:${list.template || ""}`;
    const pending = addInFlight.current.get(key);
    if (pending) return pending;

    const promise = (async () => {
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
      return undefined;
    })();

    addInFlight.current.set(key, promise);
    try {
      return await promise;
    } finally {
      addInFlight.current.delete(key);
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

    // Apply optimistically first so a slow/failed network write can't drop the
    // local edit; realtime refetch reconciles afterwards.
    setLists((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
    await supabase.from("shared_lists").update(payload).eq("id", id);
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

  const reorderLists = useCallback((fromIndex: number, toIndex: number) => {
    if (!user) return;
    setLists(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      const order = updated.map(l => l.id);
      setListOrder(user.id, order);
      setListsCache(user.id, updated);
      return updated;
    });
  }, [user]);

  return { lists, loading, addList, updateList, deleteList, handleBulkUpdate, fetchLists, reorderLists };
}
