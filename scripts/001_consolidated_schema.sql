-- Consolidated schema for achievements, leaderboards, stats, and multiplayer ready functionality
-- This script is idempotent and can be run multiple times safely

-- =====================================================
-- 1. PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add username column if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(lower(username));

-- =====================================================
-- 2. SP_PROFILES and MP_PROFILES (mode-specific profiles)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sp_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mp_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "sp_profiles_select" ON public.sp_profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sp_profiles_insert" ON public.sp_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sp_profiles_update" ON public.sp_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mp_profiles_select" ON public.mp_profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mp_profiles_insert" ON public.mp_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mp_profiles_update" ON public.mp_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- 3. GAME_SCORES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  player_score integer NOT NULL DEFAULT 0,
  ai_score integer NOT NULL DEFAULT 0,
  rounds_played integer NOT NULL DEFAULT 0,
  won boolean NOT NULL DEFAULT false,
  packs_used jsonb DEFAULT '[]'::jsonb,
  mode text NOT NULL DEFAULT 'singleplayer',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "game_scores_select_public" ON public.game_scores FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "game_scores_insert_own" ON public.game_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add mode column if missing
ALTER TABLE public.game_scores ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'singleplayer';

-- Enable realtime for game_scores
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.game_scores;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- 4. ACHIEVEMENTS TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  mode text NOT NULL DEFAULT 'both',
  tier text NOT NULL DEFAULT 'bronze',
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL DEFAULT 'singleplayer',
  UNIQUE(user_id, achievement_id, mode)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "achievements_select_public" ON public.achievements FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_achievements_select_own" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_achievements_insert_own" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable realtime for user_achievements
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- 5. GAME ROOMS AND MULTIPLAYER TABLES
-- =====================================================
-- Updated at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_round integer NOT NULL DEFAULT 0,
  max_rounds integer NOT NULL DEFAULT 10,
  czar_user_id uuid REFERENCES auth.users(id),
  current_black_card_id integer,
  used_black_card_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  used_white_card_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "game_rooms_select" ON public.game_rooms FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "game_rooms_insert" ON public.game_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "game_rooms_update" ON public.game_rooms FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS update_game_rooms_updated_at ON public.game_rooms;
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON public.game_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Room players
CREATE TABLE IF NOT EXISTS public.room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  hand jsonb NOT NULL DEFAULT '[]'::jsonb,
  ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Add ready column if missing (for existing tables)
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS ready boolean NOT NULL DEFAULT false;

ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "room_players_select" ON public.room_players FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "room_players_insert" ON public.room_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "room_players_update" ON public.room_players FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "room_players_delete" ON public.room_players FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Room submissions
CREATE TABLE IF NOT EXISTS public.room_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  white_card_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_winner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number, user_id)
);

ALTER TABLE public.room_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "room_submissions_select" ON public.room_submissions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "room_submissions_insert" ON public.room_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "room_submissions_update" ON public.room_submissions FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable realtime for multiplayer tables
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_submissions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Room code generator
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS text AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 5));
    SELECT EXISTS(SELECT 1 FROM public.game_rooms WHERE room_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Room member check function
CREATE OR REPLACE FUNCTION public.is_room_member(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.room_players WHERE user_id = _user_id AND room_id = _room_id)
$$;

-- =====================================================
-- 6. LEADERBOARD VIEWS
-- =====================================================
DROP VIEW IF EXISTS public.sp_leaderboard;
CREATE VIEW public.sp_leaderboard AS
SELECT
  COALESCE(sp.user_id, p.user_id) as user_id,
  COALESCE(sp.display_name, p.display_name) as display_name,
  COALESCE(sp.avatar_url, p.avatar_url) as avatar_url,
  COALESCE(sp.username, p.username) as username,
  COUNT(g.id)::integer AS total_games,
  COALESCE(SUM(CASE WHEN g.won THEN 1 ELSE 0 END), 0)::integer AS wins,
  COALESCE(SUM(CASE WHEN NOT g.won THEN 1 ELSE 0 END), 0)::integer AS losses,
  COALESCE(SUM(g.player_score), 0)::integer AS total_points,
  CASE WHEN COUNT(g.id) > 0 
    THEN ROUND(SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::numeric / COUNT(g.id) * 100) 
    ELSE 0 
  END AS win_rate
FROM public.sp_profiles sp
LEFT JOIN public.profiles p ON p.user_id = sp.user_id
LEFT JOIN public.game_scores g ON g.user_id = sp.user_id AND g.mode = 'singleplayer'
GROUP BY sp.user_id, sp.display_name, sp.avatar_url, sp.username, p.user_id, p.display_name, p.avatar_url, p.username;

DROP VIEW IF EXISTS public.mp_leaderboard;
CREATE VIEW public.mp_leaderboard AS
SELECT
  COALESCE(mp.user_id, p.user_id) as user_id,
  COALESCE(mp.display_name, p.display_name) as display_name,
  COALESCE(mp.avatar_url, p.avatar_url) as avatar_url,
  COALESCE(mp.username, p.username) as username,
  COUNT(g.id)::integer AS total_games,
  COALESCE(SUM(CASE WHEN g.won THEN 1 ELSE 0 END), 0)::integer AS wins,
  COALESCE(SUM(CASE WHEN NOT g.won THEN 1 ELSE 0 END), 0)::integer AS losses,
  COALESCE(SUM(g.player_score), 0)::integer AS total_points,
  CASE WHEN COUNT(g.id) > 0 
    THEN ROUND(SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::numeric / COUNT(g.id) * 100) 
    ELSE 0 
  END AS win_rate
FROM public.mp_profiles mp
LEFT JOIN public.profiles p ON p.user_id = mp.user_id
LEFT JOIN public.game_scores g ON g.user_id = mp.user_id AND g.mode = 'multiplayer'
GROUP BY mp.user_id, mp.display_name, mp.avatar_url, mp.username, p.user_id, p.display_name, p.avatar_url, p.username;

-- =====================================================
-- 7. SEED ACHIEVEMENTS (idempotent with ON CONFLICT)
-- =====================================================
INSERT INTO public.achievements (key, title, description, icon, mode, tier, requirement_type, requirement_value) VALUES
  ('sp_first_win', 'First Victory', 'Win your first SP game', 'trophy', 'singleplayer', 'bronze', 'wins', 1),
  ('sp_5_wins', 'Getting Good', 'Win 5 SP games', 'star', 'singleplayer', 'silver', 'wins', 5),
  ('sp_25_wins', 'Veteran', 'Win 25 SP games', 'medal', 'singleplayer', 'gold', 'wins', 25),
  ('sp_50_wins', 'Legend', 'Win 50 SP games', 'crown', 'singleplayer', 'platinum', 'wins', 50),
  ('sp_3_streak', 'On Fire', '3 win streak', 'flame', 'singleplayer', 'bronze', 'streak', 3),
  ('sp_5_streak', 'Unstoppable', '5 win streak', 'zap', 'singleplayer', 'silver', 'streak', 5),
  ('sp_10_games', 'Regular', 'Play 10 SP games', 'gamepad', 'singleplayer', 'bronze', 'games', 10),
  ('sp_50_games', 'Dedicated', 'Play 50 SP games', 'target', 'singleplayer', 'silver', 'games', 50),
  ('sp_100_pts', 'Point Master', '100 total SP points', 'gem', 'singleplayer', 'gold', 'points', 100),
  ('mp_first_win', 'Social Butterfly', 'Win your first MP game', 'trophy', 'multiplayer', 'bronze', 'wins', 1),
  ('mp_5_wins', 'Party Animal', 'Win 5 MP games', 'star', 'multiplayer', 'silver', 'wins', 5),
  ('mp_25_wins', 'Champion', 'Win 25 MP games', 'medal', 'multiplayer', 'gold', 'wins', 25),
  ('mp_50_wins', 'MP Legend', 'Win 50 MP games', 'crown', 'multiplayer', 'platinum', 'wins', 50),
  ('mp_3_streak', 'Hot Streak', '3 win streak in MP', 'flame', 'multiplayer', 'bronze', 'streak', 3),
  ('mp_10_games', 'Social Gamer', 'Play 10 MP games', 'gamepad', 'multiplayer', 'bronze', 'games', 10),
  ('mp_50_games', 'Party Pro', 'Play 50 MP games', 'target', 'multiplayer', 'silver', 'games', 50),
  ('mp_100_pts', 'Points Champ', '100 total MP points', 'gem', 'multiplayer', 'gold', 'points', 100)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Save multiplayer score function
CREATE OR REPLACE FUNCTION public.save_multiplayer_score(
  _user_id uuid,
  _player_score integer,
  _ai_score integer,
  _rounds integer,
  _won boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.game_scores (user_id, player_score, ai_score, rounds_played, won, mode)
  VALUES (_user_id, _player_score, _ai_score, _rounds, _won, 'multiplayer');
END;
$$;

-- Get user stats for a mode
CREATE OR REPLACE FUNCTION public.get_user_stats(_user_id uuid, _mode text)
RETURNS TABLE (
  total_games bigint,
  wins bigint,
  losses bigint,
  total_points bigint,
  win_rate numeric,
  current_streak integer,
  best_streak integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_streak integer := 0;
  v_best_streak integer := 0;
  v_temp_streak integer := 0;
  game_record record;
BEGIN
  -- Calculate streaks
  FOR game_record IN
    SELECT won FROM public.game_scores 
    WHERE user_id = _user_id AND mode = _mode 
    ORDER BY created_at DESC
  LOOP
    IF game_record.won THEN
      v_temp_streak := v_temp_streak + 1;
      IF v_temp_streak > v_best_streak THEN
        v_best_streak := v_temp_streak;
      END IF;
    ELSE
      IF v_current_streak = 0 THEN
        v_current_streak := v_temp_streak;
      END IF;
      v_temp_streak := 0;
    END IF;
  END LOOP;
  
  -- If no losses, current streak is temp streak
  IF v_current_streak = 0 THEN
    v_current_streak := v_temp_streak;
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_games,
    SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::bigint as wins,
    SUM(CASE WHEN NOT g.won THEN 1 ELSE 0 END)::bigint as losses,
    COALESCE(SUM(g.player_score), 0)::bigint as total_points,
    CASE WHEN COUNT(*) > 0 
      THEN ROUND(SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) 
      ELSE 0 
    END as win_rate,
    v_current_streak as current_streak,
    v_best_streak as best_streak
  FROM public.game_scores g
  WHERE g.user_id = _user_id AND g.mode = _mode;
END;
$$;

-- Check and award achievements
CREATE OR REPLACE FUNCTION public.check_achievements(_user_id uuid, _mode text)
RETURNS TABLE (
  achievement_id uuid,
  achievement_key text,
  achievement_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_games integer;
  v_wins integer;
  v_total_points integer;
  v_best_streak integer := 0;
  v_temp_streak integer := 0;
  game_record record;
  ach_record record;
  v_met boolean;
BEGIN
  -- Get basic stats
  SELECT 
    COUNT(*)::integer,
    SUM(CASE WHEN won THEN 1 ELSE 0 END)::integer,
    COALESCE(SUM(player_score), 0)::integer
  INTO v_total_games, v_wins, v_total_points
  FROM public.game_scores
  WHERE user_id = _user_id AND mode = _mode;
  
  -- Calculate best streak
  FOR game_record IN
    SELECT won FROM public.game_scores 
    WHERE user_id = _user_id AND mode = _mode 
    ORDER BY created_at ASC
  LOOP
    IF game_record.won THEN
      v_temp_streak := v_temp_streak + 1;
      IF v_temp_streak > v_best_streak THEN
        v_best_streak := v_temp_streak;
      END IF;
    ELSE
      v_temp_streak := 0;
    END IF;
  END LOOP;
  
  -- Check each achievement
  FOR ach_record IN
    SELECT a.id, a.key, a.title, a.requirement_type, a.requirement_value
    FROM public.achievements a
    WHERE a.mode = _mode
    AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua 
      WHERE ua.user_id = _user_id 
      AND ua.achievement_id = a.id 
      AND ua.mode = _mode
    )
  LOOP
    v_met := false;
    
    IF ach_record.requirement_type = 'wins' THEN
      v_met := v_wins >= ach_record.requirement_value;
    ELSIF ach_record.requirement_type = 'games' THEN
      v_met := v_total_games >= ach_record.requirement_value;
    ELSIF ach_record.requirement_type = 'points' THEN
      v_met := v_total_points >= ach_record.requirement_value;
    ELSIF ach_record.requirement_type = 'streak' THEN
      v_met := v_best_streak >= ach_record.requirement_value;
    END IF;
    
    IF v_met THEN
      -- Award achievement
      INSERT INTO public.user_achievements (user_id, achievement_id, mode)
      VALUES (_user_id, ach_record.id, _mode)
      ON CONFLICT DO NOTHING;
      
      -- Return newly awarded achievement
      achievement_id := ach_record.id;
      achievement_key := ach_record.key;
      achievement_title := ach_record.title;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;
