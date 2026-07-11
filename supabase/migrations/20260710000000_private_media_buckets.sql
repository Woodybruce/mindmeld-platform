-- ============================================================================
-- Security fix: private couple media + scoped storage read policies
--
-- Previously couple-photos, chat-images and voice-notes were PUBLIC buckets with
-- a SELECT policy of `USING (bucket_id = '...')`, so anyone with (or guessing)
-- an object URL could read intimate photos, chat images and voice notes with no
-- auth. The shared-files bucket was private but its SELECT policy had no owner
-- check, letting any authenticated user read another couple's files.
--
-- This migration makes the media buckets private and scopes every read to the
-- object owner or their partner. Objects are stored under a `${user_id}/...`
-- path, so the owner id is the first path segment.
-- The client must use createSignedUrl() (not getPublicUrl) for these buckets.
-- ============================================================================

-- 1. Make the media buckets private.
UPDATE storage.buckets SET public = false WHERE id IN ('couple-photos', 'chat-images', 'voice-notes');

-- 2. Replace the world-readable SELECT policies with owner-or-partner scoped ones.
DROP POLICY IF EXISTS "Anyone can view couple photos" ON storage.objects;
DROP POLICY IF EXISTS "Chat images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Voice notes are publicly accessible" ON storage.objects;

CREATE POLICY "Owner or partner can view couple photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'couple-photos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_partner(((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Owner or partner can view chat images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_partner(((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Owner or partner can view voice notes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-notes'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_partner(((storage.foldername(name))[1])::uuid)
  )
);

-- 3. Fix shared-files: the read policy had no owner scope (any authenticated
--    user could read any couple's files).
DROP POLICY IF EXISTS "Users can view shared files" ON storage.objects;

CREATE POLICY "Owner or partner can view shared files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'shared-files'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_partner(((storage.foldername(name))[1])::uuid)
  )
);
