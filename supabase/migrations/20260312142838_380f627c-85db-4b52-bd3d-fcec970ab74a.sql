-- Fix overly permissive UPDATE policies by checking room membership

-- Create helper function to check room membership
CREATE OR REPLACE FUNCTION public.is_room_member(_user_id UUID, _room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_players
    WHERE user_id = _user_id AND room_id = _room_id
  )
$$;

-- Fix game_rooms UPDATE policy
DROP POLICY "Players in room can update" ON public.game_rooms;
CREATE POLICY "Room members can update" ON public.game_rooms FOR UPDATE TO authenticated
  USING (public.is_room_member(auth.uid(), id));

-- Fix room_players UPDATE policies  
DROP POLICY "Players can update their own data" ON public.room_players;
DROP POLICY "Room updates by any player" ON public.room_players;
CREATE POLICY "Room members can update players" ON public.room_players FOR UPDATE TO authenticated
  USING (public.is_room_member(auth.uid(), room_id));

-- Fix room_submissions UPDATE policy
DROP POLICY "Czar can update winner" ON public.room_submissions;
CREATE POLICY "Room members can update submissions" ON public.room_submissions FOR UPDATE TO authenticated
  USING (public.is_room_member(auth.uid(), room_id));