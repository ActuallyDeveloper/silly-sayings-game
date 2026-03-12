
-- Fix security definer views by using SECURITY INVOKER
CREATE OR REPLACE VIEW public.sp_leaderboard WITH (security_invoker = true) AS
SELECT
  p.user_id, p.display_name, p.avatar_url, p.username,
  COUNT(g.id)::integer AS total_games,
  SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::integer AS wins,
  SUM(CASE WHEN NOT g.won THEN 1 ELSE 0 END)::integer AS losses,
  SUM(g.player_score)::integer AS total_points,
  CASE WHEN COUNT(g.id) > 0 THEN ROUND(SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::numeric / COUNT(g.id) * 100) ELSE 0 END AS win_rate
FROM public.profiles p
INNER JOIN public.game_scores g ON g.user_id = p.user_id AND g.mode = 'singleplayer'
GROUP BY p.user_id, p.display_name, p.avatar_url, p.username;

CREATE OR REPLACE VIEW public.mp_leaderboard WITH (security_invoker = true) AS
SELECT
  p.user_id, p.display_name, p.avatar_url, p.username,
  COUNT(g.id)::integer AS total_games,
  SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::integer AS wins,
  SUM(CASE WHEN NOT g.won THEN 1 ELSE 0 END)::integer AS losses,
  SUM(g.player_score)::integer AS total_points,
  CASE WHEN COUNT(g.id) > 0 THEN ROUND(SUM(CASE WHEN g.won THEN 1 ELSE 0 END)::numeric / COUNT(g.id) * 100) ELSE 0 END AS win_rate
FROM public.profiles p
INNER JOIN public.game_scores g ON g.user_id = p.user_id AND g.mode = 'multiplayer'
GROUP BY p.user_id, p.display_name, p.avatar_url, p.username;
