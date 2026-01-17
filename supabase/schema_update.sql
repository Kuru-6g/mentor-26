-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goals TEXT;

-- Update Sessions Table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS topics TEXT[];
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_type TEXT CHECK (session_type IN ('online', 'physical'));
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS speakers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS duration TEXT; -- "45 min" etc.

-- Ensure session_requests has necessary fields
ALTER TABLE public.session_requests ADD COLUMN IF NOT EXISTS user_name TEXT; -- cache for display
ALTER TABLE public.session_requests ADD COLUMN IF NOT EXISTS user_email TEXT; -- cache for display
ALTER TABLE public.session_requests ADD COLUMN IF NOT EXISTS user_avatar TEXT; -- cache for display
ALTER TABLE public.session_requests ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.session_requests ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE public.session_requests ADD COLUMN IF NOT EXISTS experience_level TEXT;
ALTER TABLE public.session_requests ADD COLUMN IF NOT EXISTS reason_to_join TEXT;
ALTER TABLE public.session_requests ADD COLUMN IF NOT EXISTS expectations TEXT;

-- RLS Policies Update (Ensure broad access for this MVP)

-- Profiles: Allow public read, self update
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Sessions: Public read, authenticated create/update
DROP POLICY IF EXISTS "Users can view all sessions" ON public.sessions;
CREATE POLICY "Users can view all sessions" ON public.sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create sessions" ON public.sessions;
CREATE POLICY "Users can create sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
CREATE POLICY "Users can update own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;
CREATE POLICY "Users can delete own sessions" ON public.sessions FOR DELETE USING (auth.uid() = created_by);

-- Session Requests
DROP POLICY IF EXISTS "Users can view own requests" ON public.session_requests;
CREATE POLICY "Users can view own requests" ON public.session_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mentors can view requests for their sessions" ON public.session_requests;
CREATE POLICY "Mentors can view requests for their sessions" ON public.session_requests FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE public.sessions.id = public.session_requests.session_id
    AND public.sessions.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create requests" ON public.session_requests;
CREATE POLICY "Users can create requests" ON public.session_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mentors can update requests" ON public.session_requests;
CREATE POLICY "Mentors can update requests" ON public.session_requests FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE public.sessions.id = public.session_requests.session_id
    AND public.sessions.created_by = auth.uid()
  )
);

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'mentee'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
