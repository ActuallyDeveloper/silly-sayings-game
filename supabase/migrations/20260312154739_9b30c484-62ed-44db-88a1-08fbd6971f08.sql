
-- Room chat messages table
CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Anyone in the room can view messages
CREATE POLICY "Room members can view messages"
  ON public.room_messages FOR SELECT
  TO authenticated
  USING (public.is_room_member(auth.uid(), room_id));

-- Authenticated users can send messages
CREATE POLICY "Users can send messages"
  ON public.room_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for room_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
