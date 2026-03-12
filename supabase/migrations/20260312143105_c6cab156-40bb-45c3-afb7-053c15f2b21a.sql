-- Create a leaderboard view aggregating from game_scores and profiles
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  COUNT(gs.id)::int AS total_games,
  COUNT(gs.id) FILTER (WHERE gs.won = true)::int AS wins,
  COUNT(gs.id) FILTER (WHERE gs.won = false)::int AS losses,
  COALESCE(SUM(gs.player_score), 0)::int AS total_points,
  CASE WHEN COUNT(gs.id) > 0 THEN ROUND((COUNT(gs.id) FILTER (WHERE gs.won = true)::numeric / COUNT(gs.id)::numeric) * 100, 1) ELSE 0 END AS win_rate
FROM public.profiles p
LEFT JOIN public.game_scores gs ON gs.user_id = p.user_id
GROUP BY p.user_id, p.display_name, p.avatar_url
HAVING COUNT(gs.id) > 0
ORDER BY wins DESC, total_points DESC;

-- Also add multiplayer scores: merge room_players final scores into game_scores
-- Create a function to save multiplayer results
CREATE OR REPLACE FUNCTION public.save_multiplayer_score(
  _user_id UUID,
  _player_score INT,
  _ai_score INT,
  _rounds INT,
  _won BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.game_scores (user_id, player_score, ai_score, rounds_played, won)
  VALUES (_user_id, _player_score, _ai_score, _rounds, _won);
END;
$$;