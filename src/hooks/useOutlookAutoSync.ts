import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SYNC_INTERVAL_MS = 15 * 60 * 1000;
const SYNC_KEY = "outlook_last_auto_sync";

export function useOutlookAutoSync(onSynced?: () => void) {
  const { user } = useAuth();
  const syncing = useRef(false);

  useEffect(() => {
    if (!user) return;

    const lastSync = localStorage.getItem(SYNC_KEY);
    const lastFail = localStorage.getItem("outlook_no_token");
    const now = Date.now();
    if (lastFail && now - parseInt(lastFail, 10) < SYNC_INTERVAL_MS * 4) return;
    if (lastSync && now - parseInt(lastSync, 10) < SYNC_INTERVAL_MS) return;

    if (syncing.current) return;
    syncing.current = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const headers = {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        };

        const res = await fetch("/api/sync-outlook-calendar", {
          method: "POST",
          headers,
          body: JSON.stringify({ mode: "preview" }),
        });

        const result = await res.json();
        if (result.error) {
          if (result.error === "no_microsoft_token") localStorage.setItem("outlook_no_token", String(Date.now()));
          return;
        }

        const events = result.events || [];
        const toImport = events
          .filter((e: any) => !e.already_imported && e.partner_invited)
          .map((e: any) => ({
            id: e.id,
            subject: e.subject,
            start_time: e.start_time,
            end_time: e.end_time,
            is_all_day: e.is_all_day,
            location: e.location,
            partner_invited: e.partner_invited,
          }));

        if (toImport.length > 0) {
          await fetch("/api/sync-outlook-calendar", {
            method: "POST",
            headers,
            body: JSON.stringify({ mode: "import", events: toImport }),
          });
          onSynced?.();
        }

        localStorage.setItem(SYNC_KEY, String(Date.now()));
      } catch {
      } finally {
        syncing.current = false;
      }
    })();
  }, [user]);
}
