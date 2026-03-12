
-- Friendships table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships addressed to them" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Direct messages table
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'video')),
  media_url TEXT,
  reply_to_id UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DMs" ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send DMs" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own DMs" ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Message reactions (likes)
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, reaction)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions on their DMs" ON public.message_reactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.direct_messages dm
    WHERE dm.id = message_id AND (dm.sender_id = auth.uid() OR dm.receiver_id = auth.uid())
  ));

CREATE POLICY "Users can add reactions" ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions" ON public.message_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Game invites
CREATE TABLE public.game_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites" ON public.game_invites FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send invites" ON public.game_invites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update invites they received" ON public.game_invites FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

-- User privacy settings
CREATE TABLE public.user_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  status_visibility TEXT NOT NULL DEFAULT 'everyone' CHECK (status_visibility IN ('everyone', 'friends')),
  receive_friend_requests TEXT NOT NULL DEFAULT 'everyone' CHECK (receive_friend_requests IN ('everyone', 'nobody')),
  receive_game_invites TEXT NOT NULL DEFAULT 'everyone' CHECK (receive_game_invites IN ('everyone', 'friends')),
  receive_dms TEXT NOT NULL DEFAULT 'everyone' CHECK (receive_dms IN ('everyone', 'friends')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view privacy settings" ON public.user_privacy_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own privacy settings" ON public.user_privacy_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings" ON public.user_privacy_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- User status
CREATE TABLE public.user_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'away', 'busy', 'invisible')),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user status" ON public.user_status FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own status" ON public.user_status FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status" ON public.user_status FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Room chat media support (add columns)
ALTER TABLE public.room_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE public.room_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.room_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.room_messages(id) ON DELETE SET NULL;

-- Room message reactions
CREATE TABLE public.room_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.room_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, reaction)
);

ALTER TABLE public.room_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view reactions" ON public.room_message_reactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can add room msg reactions" ON public.room_message_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own room msg reactions" ON public.room_message_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
