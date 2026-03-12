import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBlockReport } from "@/hooks/useBlockReport";

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  friend_profile?: { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null };
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Friendship[]>([]);
  const [pendingSent, setPendingSent] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!data) { setLoading(false); return; }

    // Fetch profiles for all friend IDs
    const friendIds = data.map((f: any) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );
    const uniqueIds = [...new Set(friendIds)] as string[];

    let profiles: any[] = [];
    if (uniqueIds.length > 0) {
      const { data: p } = await (supabase as any)
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", uniqueIds);
      profiles = p || [];
    }

    const enriched = data.map((f: any) => {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      return { ...f, friend_profile: profiles.find((p: any) => p.user_id === friendId) };
    });

    setFriends(enriched.filter((f: any) => f.status === "accepted"));
    setPendingReceived(enriched.filter((f: any) => f.status === "pending" && f.addressee_id === user.id));
    setPendingSent(enriched.filter((f: any) => f.status === "pending" && f.requester_id === user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFriendships();
    if (!user) return;

    const channel = supabase
      .channel("friendships-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        fetchFriendships();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchFriendships]);

  const sendRequest = async (addresseeId: string) => {
    if (!user) return;
    await (supabase as any).from("friendships").insert({
      requester_id: user.id, addressee_id: addresseeId, status: "pending",
    });
  };

  const acceptRequest = async (friendshipId: string) => {
    await (supabase as any).from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
  };

  const declineRequest = async (friendshipId: string) => {
    await (supabase as any).from("friendships").update({ status: "declined" }).eq("id", friendshipId);
  };

  const removeFriend = async (friendshipId: string) => {
    await (supabase as any).from("friendships").delete().eq("id", friendshipId);
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) return [];
    const { data } = await (supabase as any)
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .neq("user_id", user.id)
      .ilike("username", `%${query}%`)
      .limit(10);
    return data || [];
  };

  const isFriend = (userId: string) => friends.some(
    f => f.friend_profile?.user_id === userId
  );

  return {
    friends, pendingReceived, pendingSent, loading,
    sendRequest, acceptRequest, declineRequest, removeFriend,
    searchUsers, isFriend, refresh: fetchFriendships,
  };
}
