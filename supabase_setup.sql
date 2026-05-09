-- Create the video_exports table
CREATE TABLE IF NOT EXISTS public.video_exports (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  created_at BIGINT,
  status TEXT
);

-- Enable Row Level Security
ALTER TABLE public.video_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own exports" ON public.video_exports
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own exports" ON public.video_exports
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own exports" ON public.video_exports
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own exports" ON public.video_exports
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Templates Policies
CREATE POLICY "Users can view their own and global templates" ON public.templates
FOR SELECT USING (auth.uid() = user_id OR is_global = true);

CREATE POLICY "Users can insert their own templates" ON public.templates
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.templates
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.templates
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create presets table
CREATE TABLE IF NOT EXISTS public.presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
);

ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;

-- Presets Policies
CREATE POLICY "Users can view their own and global presets" ON public.presets
FOR SELECT USING (auth.uid() = user_id OR is_global = true);

CREATE POLICY "Users can insert their own presets" ON public.presets
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets" ON public.presets
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets" ON public.presets
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- PROFILES AND CUSTOM ASSETS SETUP
-- ==========================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  placeholder_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create Storage Bucket for custom user assets
INSERT INTO storage.buckets (id, name, public) VALUES ('user_assets', 'user_assets', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for user_assets
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'user_assets');
CREATE POLICY "Users can upload their own assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user_assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own assets" ON storage.objects FOR UPDATE USING (bucket_id = 'user_assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own assets" ON storage.objects FOR DELETE USING (bucket_id = 'user_assets' AND auth.uid()::text = (storage.foldername(name))[1]);