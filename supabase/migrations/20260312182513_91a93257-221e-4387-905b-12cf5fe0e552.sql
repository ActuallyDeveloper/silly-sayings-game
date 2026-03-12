
-- Custom cards table
CREATE TABLE public.custom_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  text text NOT NULL,
  card_type text NOT NULL DEFAULT 'white',
  pick integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom cards" ON public.custom_cards FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create custom cards" ON public.custom_cards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom cards" ON public.custom_cards FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Game scores: track packs used
ALTER TABLE public.game_scores ADD COLUMN IF NOT EXISTS packs_used jsonb DEFAULT '[]'::jsonb;

-- Multiplayer AI support
ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS ai_player_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS ai_players_data jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS points_to_win integer NOT NULL DEFAULT 10;
