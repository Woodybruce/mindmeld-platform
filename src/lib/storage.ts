import { supabase } from "@/integrations/supabase/client";

/**
 * Signed-URL helpers for PRIVATE storage buckets (couple-photos, chat-images,
 * voice-notes, shared-files). These buckets are no longer public, so
 * getPublicUrl() will not work — read access requires a short-lived signed URL,
 * which RLS grants only to the object's owner or their partner.
 */

const DEFAULT_TTL = 60 * 60; // 1 hour

/** Long TTL for signed URLs persisted in RLS-protected rows (e.g. chat messages). */
export const SIGNED_MEDIA_TTL = 60 * 60 * 24 * 365 * 5; // ~5 years

/** Signed URL for a single object, or null if it can't be signed. */
export async function getSignedUrl(bucket: string, path: string | null | undefined, ttl = DEFAULT_TTL): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
  if (error) {
    console.warn(`Signed URL failed for ${bucket}/${path}:`, error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/** Signed URLs for many objects at once, returned as a { path: signedUrl } map. */
export async function getSignedUrls(bucket: string, paths: (string | null | undefined)[], ttl = DEFAULT_TTL): Promise<Record<string, string>> {
  const clean = paths.filter((p): p is string => !!p);
  if (clean.length === 0) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(clean, ttl);
  if (error || !data) {
    console.warn(`Signed URLs failed for ${bucket}:`, error?.message);
    return {};
  }
  const map: Record<string, string> = {};
  for (const d of data) {
    if (d.signedUrl && d.path) map[d.path] = d.signedUrl;
  }
  return map;
}
