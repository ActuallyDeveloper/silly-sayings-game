-- Fix security definer views by recreating with security_invoker=on
DROP VIEW IF EXISTS public.sp_leaderboard;
CREATE VIEW public.sp_leaderboard WITH (security_invoker=on) AS
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
CREATE VIEW public.mp_leaderboard WITH (security_invoker=on) AS
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

-- Also fix the old leaderboard view if it exists
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard WITH (security_invoker=on) AS
SELECT 
  gs.user_id,
  p.display_name,
  p.avatar_url,
  count(*) as total_games,
  sum(case when gs.won then 1 else 0 end) as wins,
  sum(case when not gs.won then 1 else 0 end) as losses,
  sum(gs.player_score) as total_points,
  round(avg(case when gs.won then 1 else 0 end)::numeric * 100, 1) as win_rate
FROM public.game_scores gs
JOIN public.profiles p ON p.user_id = gs.user_id
GROUP BY gs.user_id, p.display_name, p.avatar_url;