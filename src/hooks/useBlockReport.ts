import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export function useBlockReport() {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<UserBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlocks = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("user_blocks")
      .select("*")
      .eq("blocker_id", user.id);
    setBlockedUsers(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBlocks();
    if (!user) return;

    const channel = supabase
      .channel(`user-blocks-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_blocks", filter: `blocker_id=eq.${user.id}` }, () => {
        fetchBlocks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchBlocks, user]);

  const blockUser = async (blockedId: string) => {
    if (!user) return;
    await (supabase as any).from("user_blocks").insert({
      blocker_id: user.id,
      blocked_id: blockedId,
    });
    // Also remove friendship if exists
    await (supabase as any)
      .from("friendships")
      .delete()
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${blockedId}),and(requester_id.eq.${blockedId},addressee_id.eq.${user.id})`);
    fetchBlocks();
  };

  const unblockUser = async (blockedId: string) => {
    if (!user) return;
    await (supabase as any)
      .from("user_blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedId);
    fetchBlocks();
  };

  const reportUser = async (reportedId: string, reason: string, details?: string) => {
    if (!user) return;
    await (supabase as any).from("user_reports").insert({
      reporter_id: user.id,
      reported_id: reportedId,
      reason,
      details: details || null,
    });
  };

  const isBlocked = (userId: string) =>
    blockedUsers.some((b) => b.blocked_id === userId);

  return {
    blockedUsers,
    loading,
    blockUser,
    unblockUser,
    reportUser,
    isBlocked,
    refresh: fetchBlocks,
  };
}
