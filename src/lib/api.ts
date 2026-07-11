import { supabase } from "@/integrations/supabase/client";

/** Authorization header for the current session (empty if signed out). Use for direct fetch() calls to authenticated /api routes. */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function apiInvoke<T = any>(
  functionName: string,
  options?: { body?: any; method?: string; query?: Record<string, string> }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    let url = `/api/${functionName}`;
    if (options?.query) {
      const params = new URLSearchParams(options.query);
      url += `?${params.toString()}`;
    }

    const method = options?.method || (options?.body ? "POST" : "GET");
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    const fetchOptions: RequestInit = { method, headers };

    if (method !== "GET") {
      const userId = session?.user?.id;
      const bodyWithUser = { ...(options?.body || {}), ...(userId ? { userId } : {}) };
      fetchOptions.body = JSON.stringify(bodyWithUser);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: new Error(data.error || `Request failed with status ${response.status}`) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error("Unknown error") };
  }
}
