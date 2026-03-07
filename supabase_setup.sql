-- ============================================
-- Us App - Complete Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)
-- ============================================

-- 1. Create custom enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  partner_id uuid REFERENCES public.profiles(id),
  partner_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  avatar_url text,
  phone_number text,
  anniversary_date date,
  calendar_forward_token text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Messages (chat)
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  receiver_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  image_url text,
  message_type text DEFAULT 'text' NOT NULL,
  read boolean DEFAULT false NOT NULL,
  reply_to_id uuid REFERENCES public.messages(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 4. Calendar events
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  subject text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_all_day boolean DEFAULT false NOT NULL,
  location text,
  source text DEFAULT 'manual' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 5. Weekly tasks
CREATE TABLE public.weekly_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  text text NOT NULL,
  done boolean DEFAULT false NOT NULL,
  scheduled_date date DEFAULT CURRENT_DATE NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  source text DEFAULT 'manual' NOT NULL,
  source_id text,
  completed_at timestamptz,
  attachments jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 6. Shared lists
CREATE TABLE public.shared_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  icon text DEFAULT '📝' NOT NULL,
  template text,
  items jsonb DEFAULT '[]'::jsonb NOT NULL,
  max_items integer,
  ai_suggestable boolean DEFAULT false NOT NULL,
  score_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
-- NOTE: List ordering is handled client-side via localStorage (us-list-order-{userId})

-- 7. Device tokens (push notifications)
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  token text NOT NULL,
  platform text DEFAULT 'web' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, token)
);

-- 8. Microsoft tokens (Outlook integration)
CREATE TABLE public.microsoft_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 9. Couple photos
CREATE TABLE public.couple_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 10. Feed content
CREATE TABLE public.feed_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text DEFAULT 'update' NOT NULL,
  title text NOT NULL,
  subtitle text,
  body text NOT NULL,
  emoji text,
  image_url text,
  tag text DEFAULT 'General' NOT NULL,
  tag_color text DEFAULT 'blue' NOT NULL,
  link text,
  size text DEFAULT 'half' NOT NULL,
  weight integer DEFAULT 1 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 11. Content likes
CREATE TABLE public.content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content_id text NOT NULL,
  content_type text NOT NULL,
  content_title text,
  content_emoji text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 12. Shared links
CREATE TABLE public.shared_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  url text NOT NULL,
  title text,
  note text,
  platform text DEFAULT 'Other' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 13. Shared folders
CREATE TABLE public.shared_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  parent_id uuid REFERENCES public.shared_folders(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 14. Shared files
CREATE TABLE public.shared_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  folder_id uuid REFERENCES public.shared_folders(id),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint DEFAULT 0 NOT NULL,
  mime_type text DEFAULT 'application/octet-stream' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 15. Mood check-ins
CREATE TABLE public.mood_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  mood text NOT NULL,
  note text,
  check_date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, check_date)
);

-- 16. Quiz sessions
CREATE TABLE public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  quiz_id text NOT NULL,
  score integer,
  total_questions integer,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 17. Quiz answers
CREATE TABLE public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.quiz_sessions(id),
  question_index integer NOT NULL,
  question_text text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 18. User roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role app_role NOT NULL DEFAULT 'user'
);

-- 19. Bucket list proposals
CREATE TABLE public.bucket_list_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  proposal_type text DEFAULT 'sex-bucket' NOT NULL,
  items jsonb DEFAULT '[]'::jsonb NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  selected_items jsonb,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 20. Couple announcements
CREATE TABLE public.couple_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  emoji text DEFAULT '📌',
  pinned boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 21. Instagram suggestions
CREATE TABLE public.insta_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  handle text NOT NULL,
  label text,
  bio text,
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- Functions
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Link partner by code
CREATE OR REPLACE FUNCTION public.link_partner(_partner_code text)
RETURNS boolean AS $$
DECLARE
  _partner_id uuid;
BEGIN
  SELECT id INTO _partner_id FROM public.profiles
  WHERE partner_code = _partner_code AND id != auth.uid();

  IF _partner_id IS NULL THEN RETURN false; END IF;

  UPDATE public.profiles SET partner_id = _partner_id WHERE id = auth.uid();
  UPDATE public.profiles SET partner_id = auth.uid() WHERE id = _partner_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Link partner by email
CREATE OR REPLACE FUNCTION public.link_partner_by_email(_partner_email text)
RETURNS boolean AS $$
DECLARE
  _partner_id uuid;
BEGIN
  SELECT id INTO _partner_id FROM auth.users
  WHERE email = _partner_email AND id != auth.uid();

  IF _partner_id IS NULL THEN RETURN false; END IF;

  UPDATE public.profiles SET partner_id = _partner_id WHERE id = auth.uid();
  UPDATE public.profiles SET partner_id = auth.uid() WHERE id = _partner_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is partner
CREATE OR REPLACE FUNCTION public.is_partner(_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND partner_id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microsoft_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_list_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insta_suggestions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read own + partner's, update own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_partner(id));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Messages: users can manage own sent/received messages
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- Calendar events: own + partner's
CREATE POLICY "Users can view calendar events" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can insert calendar events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar events" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- Weekly tasks: own + partner's
CREATE POLICY "Users can view weekly tasks" ON public.weekly_tasks FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can insert weekly tasks" ON public.weekly_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly tasks" ON public.weekly_tasks FOR UPDATE USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can delete own weekly tasks" ON public.weekly_tasks FOR DELETE USING (auth.uid() = user_id);

-- Shared lists: own + partner's
CREATE POLICY "Users can view shared lists" ON public.shared_lists FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can insert shared lists" ON public.shared_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update shared lists" ON public.shared_lists FOR UPDATE USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can delete own shared lists" ON public.shared_lists FOR DELETE USING (auth.uid() = user_id);

-- Device tokens: own only
CREATE POLICY "Users can manage own device tokens" ON public.device_tokens FOR ALL USING (auth.uid() = user_id);

-- Microsoft tokens: own only
CREATE POLICY "Users can manage own microsoft tokens" ON public.microsoft_tokens FOR ALL USING (auth.uid() = user_id);

-- Couple photos: own + partner's
CREATE POLICY "Users can view couple photos" ON public.couple_photos FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can insert couple photos" ON public.couple_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own couple photos" ON public.couple_photos FOR DELETE USING (auth.uid() = user_id);

-- Feed content: public read
CREATE POLICY "Anyone can view feed content" ON public.feed_content FOR SELECT USING (true);
CREATE POLICY "Admins can manage feed content" ON public.feed_content FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Content likes: own + partner's
CREATE POLICY "Users can view content likes" ON public.content_likes FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can insert content likes" ON public.content_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own content likes" ON public.content_likes FOR DELETE USING (auth.uid() = user_id);

-- Shared links: own + partner's
CREATE POLICY "Users can view shared links" ON public.shared_links FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can insert shared links" ON public.shared_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own shared links" ON public.shared_links FOR DELETE USING (auth.uid() = user_id);

-- Shared folders: own + partner's
CREATE POLICY "Users can view shared folders" ON public.shared_folders FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can insert shared folders" ON public.shared_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own shared folders" ON public.shared_folders FOR DELETE USING (auth.uid() = user_id);

-- Shared files: own + partner's
CREATE POLICY "Users can view shared files" ON public.shared_files FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can insert shared files" ON public.shared_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own shared files" ON public.shared_files FOR DELETE USING (auth.uid() = user_id);

-- Mood check-ins: own + partner's
CREATE POLICY "Users can view mood checkins" ON public.mood_checkins FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can manage own mood checkins" ON public.mood_checkins FOR ALL USING (auth.uid() = user_id);

-- Quiz sessions: own only
CREATE POLICY "Users can manage own quiz sessions" ON public.quiz_sessions FOR ALL USING (auth.uid() = user_id);

-- Quiz answers: via session ownership
CREATE POLICY "Users can manage own quiz answers" ON public.quiz_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quiz_sessions WHERE id = quiz_answers.session_id AND user_id = auth.uid())
);

-- User roles: read own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Bucket list proposals: own + partner's
CREATE POLICY "Users can view bucket proposals" ON public.bucket_list_proposals FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can insert bucket proposals" ON public.bucket_list_proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update bucket proposals" ON public.bucket_list_proposals FOR UPDATE USING (auth.uid() = user_id OR is_partner(user_id));

-- Couple announcements: own + partner's
CREATE POLICY "Users can view announcements" ON public.couple_announcements FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can insert announcements" ON public.couple_announcements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own announcements" ON public.couple_announcements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own announcements" ON public.couple_announcements FOR DELETE USING (auth.uid() = user_id);

-- Instagram suggestions: own + partner's
CREATE POLICY "Users can view insta suggestions" ON public.insta_suggestions FOR SELECT USING (auth.uid() = user_id OR is_partner(user_id));
CREATE POLICY "Users can insert insta suggestions" ON public.insta_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own insta suggestions" ON public.insta_suggestions FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Enable Realtime for key tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bucket_list_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_announcements;

-- ============================================
-- Storage buckets
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('shared-files', 'shared-files', false) ON CONFLICT DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for photos
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for chat images
CREATE POLICY "Anyone can view chat images" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');
CREATE POLICY "Authenticated users can upload chat images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

-- Storage policies for shared files
CREATE POLICY "Authenticated users can view shared files" ON storage.objects FOR SELECT USING (bucket_id = 'shared-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can upload shared files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shared-files' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own shared files" ON storage.objects FOR DELETE USING (bucket_id = 'shared-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- Done! Your database is ready.
-- ============================================
