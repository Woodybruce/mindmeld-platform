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
    const fetchOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (options?.body && method !== "GET") {
      fetchOptions.body = JSON.stringify(options.body);
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
