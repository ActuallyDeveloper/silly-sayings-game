import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBlockReport } from "@/hooks/useBlockReport";

export interface GameInvite {
  id: string;
  sender_id: string;
  receiver_id: string;
  room_id: string | null;
  status: string;
  created_at: string;
  sender_profile?: { display_name: string | null; username: string | null };
  room?: { room_code: string; status: string };
}

export function useGameInvites() {
  const { user } = useAuth();
  const [received, setReceived] = useState<GameInvite[]>([]);
  const [sent, setSent] = useState<GameInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("game_invites")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Fetch sender profiles
    const senderIds = [...new Set(data.map((i: any) => i.sender_id))] as string[];
    let profiles: any[] = [];
    if (senderIds.length > 0) {
      const { data: p } = await (supabase as any)
        .from("profiles").select("user_id, display_name, username").in("user_id", senderIds);
      profiles = p || [];
    }

    // Fetch rooms
    const roomIds = data.filter((i: any) => i.room_id).map((i: any) => i.room_id);
    let rooms: any[] = [];
    if (roomIds.length > 0) {
      const { data: r } = await (supabase as any)
        .from("game_rooms").select("id, room_code, status").in("id", roomIds);
      rooms = r || [];
    }

    const enriched = data.map((i: any) => ({
      ...i,
      sender_profile: profiles.find((p: any) => p.user_id === i.sender_id),
      room: rooms.find((r: any) => r.id === i.room_id),
    }));

    setReceived(enriched.filter((i: any) => i.receiver_id === user.id));
    setSent(enriched.filter((i: any) => i.sender_id === user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchInvites();
    if (!user) return;

    const channel = supabase
      .channel("game-invites-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_invites" }, () => {
        fetchInvites();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchInvites]);

  const sendInvite = async (receiverId: string, roomId?: string) => {
    if (!user) return;
    await (supabase as any).from("game_invites").insert({
      sender_id: user.id, receiver_id: receiverId, room_id: roomId || null,
    });
  };

  const acceptInvite = async (inviteId: string) => {
    await (supabase as any).from("game_invites").update({ status: "accepted" }).eq("id", inviteId);
  };

  const declineInvite = async (inviteId: string) => {
    await (supabase as any).from("game_invites").update({ status: "declined" }).eq("id", inviteId);
  };

  return { received, sent, loading, sendInvite, acceptInvite, declineInvite, refresh: fetchInvites };
}
