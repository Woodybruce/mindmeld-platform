import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserList } from "@/components/connect/SharedLists";

const defaultLongTermGoals: UserList = {
  id: "default-long-term-goals",
  name: "Our Long-Term Goals",
  icon: "⭐",
  template: "long-term-goals",
  createdAt: new Date().toISOString(),
  maxItems: 5,
  items: [
    { id: "ltg-h1", text: "Our 5 Long-Term Goals", done: false, isHeading: true },
    { id: "ltg-h2", text: "How we'll achieve them", done: false, isHeading: true },
  ],
};

function dbRowToList(row: any): UserList {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    template: row.template || undefined,
    createdAt: row.created_at,
    maxItems: row.max_items || undefined,
    aiSuggestable: row.ai_suggestable || undefined,
    scoreData: row.score_data || undefined,
    items: Array.isArray(row.items) ? row.items : [],
  };
}

export function useSharedLists() {
  const { user } = useAuth();
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
      let result = data.map(dbRowToList);

      // Ensure long-term goals exists for current user
      const hasLTG = result.some((l) => l.template === "long-term-goals");
      if (!hasLTG) {
        // Create it in DB
        const { data: inserted } = await supabase.from("shared_lists").insert({
          user_id: user.id,
          name: defaultLongTermGoals.name,
          icon: defaultLongTermGoals.icon,
          template: "long-term-goals",
          max_items: 5,
          items: JSON.parse(JSON.stringify(defaultLongTermGoals.items)),
        } as any).select().single();
        if (inserted) result = [dbRowToList(inserted), ...result];
      }

      // Migrate from localStorage if user has local lists but none in DB yet
      const ownLists = result.filter((l) => true); // all visible (own + partner)
      if (ownLists.length <= 1) {
        const stored = localStorage.getItem("userLists");
        if (stored) {
          try {
            const localLists: UserList[] = JSON.parse(stored);
            const toMigrate = localLists.filter(
              (ll) => !result.some((r) => r.template && r.template === ll.template)
            );
            if (toMigrate.length > 0) {
              const inserts = toMigrate.map((ll) => ({
                user_id: user.id,
                name: ll.name,
                icon: ll.icon,
                template: ll.template || null,
                max_items: ll.maxItems || null,
                items: JSON.parse(JSON.stringify(ll.items)),
                ai_suggestable: ll.aiSuggestable || false,
                score_data: ll.scoreData ? JSON.parse(JSON.stringify(ll.scoreData)) : null,
              }));
              const { data: migrated } = await supabase
                .from("shared_lists")
                .insert(inserts as any)
                .select();
              if (migrated) {
                result = [...migrated.map(dbRowToList), ...result];
              }
              // Clear localStorage after migration
              localStorage.removeItem("userLists");
            }
          } catch {}
        }
      }

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
      score_data: list.scoreData ? JSON.parse(JSON.stringify(list.scoreData)) : null,
    } as any).select().single();
    if (data) {
      setLists((prev) => [dbRowToList(data), ...prev]);
      return data.id as string;
    }
  }, [user]);

  const updateList = useCallback(async (id: string, updates: Partial<UserList>) => {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.icon !== undefined) payload.icon = updates.icon;
    if (updates.items !== undefined) payload.items = JSON.parse(JSON.stringify(updates.items));
    if (updates.scoreData !== undefined) payload.score_data = JSON.parse(JSON.stringify(updates.scoreData));
    payload.updated_at = new Date().toISOString();

    await supabase.from("shared_lists").update(payload).eq("id", id);
    setLists((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const deleteList = useCallback(async (id: string) => {
    await supabase.from("shared_lists").delete().eq("id", id);
    setLists((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // Convenience: update handler compatible with SharedLists onUpdate prop
  const handleBulkUpdate = useCallback(async (updatedLists: UserList[]) => {
    // Diff against current state and update changed lists
    for (const ul of updatedLists) {
      const existing = lists.find((l) => l.id === ul.id);
      if (!existing) {
        // New list
        await addList(ul);
      } else if (JSON.stringify(existing.items) !== JSON.stringify(ul.items) ||
                 existing.name !== ul.name || existing.icon !== ul.icon) {
        await updateList(ul.id, { items: ul.items, name: ul.name, icon: ul.icon, scoreData: ul.scoreData });
      }
    }
    // Deleted lists
    for (const existing of lists) {
      if (!updatedLists.find((u) => u.id === existing.id)) {
        await deleteList(existing.id);
      }
    }
  }, [lists, addList, updateList, deleteList]);

  return { lists, loading, addList, updateList, deleteList, handleBulkUpdate, fetchLists };
}
