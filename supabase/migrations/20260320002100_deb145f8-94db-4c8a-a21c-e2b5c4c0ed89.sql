-- Fix leaderboard: allow all authenticated users to read game_scores for leaderboard views
DROP POLICY IF EXISTS "Users can view their own scores" ON public.game_scores;

CREATE POLICY "Anyone can view scores"
ON public.game_scores
FOR SELECT
TO authenticated
USING (true);
