
-- Add username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(lower(username));

-- Add mode to game_scores
ALTER TABLE public.game_scores ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'singleplayer';

-- Add mode to custom_cards
ALTER TABLE public.custom_cards ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'singleplayer';

-- Achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🏆',
  mode text NOT NULL DEFAULT 'both',
  tier text NOT NULL DEFAULT 'bronze',
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL DEFAULT 1
);

-- User achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL DEFAULT 'singleplayer',
  UNIQUE(user_id, achievement_id, mode)
);

-- RLS for achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can earn achievements" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Lookup email by username for login
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email FROM auth.users u
  INNER JOIN public.profiles p ON p.user_id = u.id
  WHERE lower(p.username) = lower(_username)
  LIMIT 1
$$;

-- Update handle_new_user to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'username'
  );
  RETURN NEW;
END;
$$;

-- Update save_multiplayer_score to include mode
CREATE OR REPLACE FUNCTION public.save_multiplayer_score(_user_id uuid, _player_score integer, _ai_score integer, _rounds integer, _won boolean)
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

-- SP Leaderboard view
CREATE OR REPLACE VIEW public.sp_leaderboard AS
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.username,
  COUNT(g.id)::integer AS total_games,
  SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::integer AS wins,
  SUM(CASE WHEN NOT g.won THEN 1 ELSE 0 END)::integer AS losses,
  SUM(g.player_score)::integer AS total_points,
  CASE WHEN COUNT(g.id) > 0 THEN ROUND(SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::numeric / COUNT(g.id) * 100) ELSE 0 END AS win_rate
FROM public.profiles p
INNER JOIN public.game_scores g ON g.user_id = p.user_id AND g.mode = 'singleplayer'
GROUP BY p.user_id, p.display_name, p.avatar_url, p.username;

-- MP Leaderboard view
CREATE OR REPLACE VIEW public.mp_leaderboard AS
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.username,
  COUNT(g.id)::integer AS total_games,
  SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::integer AS wins,
  SUM(CASE WHEN NOT g.won THEN 1 ELSE 0 END)::integer AS losses,
  SUM(g.player_score)::integer AS total_points,
  CASE WHEN COUNT(g.id) > 0 THEN ROUND(SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::numeric / COUNT(g.id) * 100) ELSE 0 END AS win_rate
FROM public.profiles p
INNER JOIN public.game_scores g ON g.user_id = p.user_id AND g.mode = 'multiplayer'
GROUP BY p.user_id, p.display_name, p.avatar_url, p.username;

-- Seed achievements
INSERT INTO public.achievements (key, title, description, icon, mode, tier, requirement_type, requirement_value) VALUES
('sp_first_win', 'First Victory', 'Win your first SP game', '🏆', 'singleplayer', 'bronze', 'wins', 1),
('sp_5_wins', 'Getting Good', 'Win 5 SP games', '⭐', 'singleplayer', 'silver', 'wins', 5),
('sp_25_wins', 'Veteran', 'Win 25 SP games', '🌟', 'singleplayer', 'gold', 'wins', 25),
('sp_50_wins', 'Legend', 'Win 50 SP games', '👑', 'singleplayer', 'platinum', 'wins', 50),
('sp_3_streak', 'On Fire', '3 win streak', '🔥', 'singleplayer', 'bronze', 'streak', 3),
('sp_5_streak', 'Unstoppable', '5 win streak', '💥', 'singleplayer', 'silver', 'streak', 5),
('sp_10_games', 'Regular', 'Play 10 SP games', '🎮', 'singleplayer', 'bronze', 'games', 10),
('sp_50_games', 'Dedicated', 'Play 50 SP games', '🎯', 'singleplayer', 'silver', 'games', 50),
('sp_100_pts', 'Point Master', '100 total SP points', '💎', 'singleplayer', 'gold', 'points', 100),
('mp_first_win', 'Social Butterfly', 'Win your first MP game', '🦋', 'multiplayer', 'bronze', 'wins', 1),
('mp_5_wins', 'Party Animal', 'Win 5 MP games', '🎉', 'multiplayer', 'silver', 'wins', 5),
('mp_25_wins', 'Champion', 'Win 25 MP games', '🏅', 'multiplayer', 'gold', 'wins', 25),
('mp_50_wins', 'MP Legend', 'Win 50 MP games', '👑', 'multiplayer', 'platinum', 'wins', 50),
('mp_3_streak', 'Hot Streak', '3 win streak in MP', '🔥', 'multiplayer', 'bronze', 'streak', 3),
('mp_10_games', 'Social Gamer', 'Play 10 MP games', '🎮', 'multiplayer', 'bronze', 'games', 10),
('mp_50_games', 'Party Pro', 'Play 50 MP games', '🎯', 'multiplayer', 'silver', 'games', 50),
('mp_100_pts', 'Points Champ', '100 total MP points', '💎', 'multiplayer', 'gold', 'points', 100);
