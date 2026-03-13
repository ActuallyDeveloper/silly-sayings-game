-- Create SP profiles table
CREATE TABLE public.sp_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  username text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create MP profiles table
CREATE TABLE public.mp_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  username text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_profiles ENABLE ROW LEVEL SECURITY;

-- SP profiles policies
CREATE POLICY "SP profiles viewable by everyone" ON public.sp_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own SP profile" ON public.sp_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own SP profile" ON public.sp_profiles FOR UPDATE USING (auth.uid() = user_id);

-- MP profiles policies
CREATE POLICY "MP profiles viewable by everyone" ON public.mp_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own MP profile" ON public.mp_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own MP profile" ON public.mp_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_sp_profiles_updated_at BEFORE UPDATE ON public.sp_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mp_profiles_updated_at BEFORE UPDATE ON public.mp_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update the handle_new_user trigger to create entries in BOTH mode-specific tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'username'
  );
  INSERT INTO public.sp_profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'username'
  );
  INSERT INTO public.mp_profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'username'
  );
  RETURN NEW;
END;
$$;

-- Migrate existing profiles data into sp_profiles and mp_profiles
INSERT INTO public.sp_profiles (user_id, display_name, avatar_url, username, created_at, updated_at)
SELECT user_id, display_name, avatar_url, username, created_at, updated_at
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.mp_profiles (user_id, display_name, avatar_url, username, created_at, updated_at)
SELECT user_id, display_name, avatar_url, username, created_at, updated_at
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Update leaderboard views to use mode-specific profiles
DROP VIEW IF EXISTS public.sp_leaderboard;
CREATE VIEW public.sp_leaderboard AS
SELECT 
  gs.user_id,
  sp.display_name,
  sp.avatar_url,
  sp.username,
  count(*) as total_games,
  sum(case when gs.won then 1 else 0 end) as wins,
  sum(case when not gs.won then 1 else 0 end) as losses,
  sum(gs.player_score) as total_points,
  round(avg(case when gs.won then 1 else 0 end)::numeric * 100, 1) as win_rate
FROM public.game_scores gs
JOIN public.sp_profiles sp ON sp.user_id = gs.user_id
WHERE gs.mode = 'singleplayer'
GROUP BY gs.user_id, sp.display_name, sp.avatar_url, sp.username;

DROP VIEW IF EXISTS public.mp_leaderboard;
CREATE VIEW public.mp_leaderboard AS
SELECT 
  gs.user_id,
  mp.display_name,
  mp.avatar_url,
  mp.username,
  count(*) as total_games,
  sum(case when gs.won then 1 else 0 end) as wins,
  sum(case when not gs.won then 1 else 0 end) as losses,
  sum(gs.player_score) as total_points,
  round(avg(case when gs.won then 1 else 0 end)::numeric * 100, 1) as win_rate
FROM public.game_scores gs
JOIN public.mp_profiles mp ON mp.user_id = gs.user_id
WHERE gs.mode = 'multiplayer'
GROUP BY gs.user_id, mp.display_name, mp.avatar_url, mp.username;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sp_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mp_profiles;