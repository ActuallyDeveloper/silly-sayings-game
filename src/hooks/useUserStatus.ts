import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canViewStatus, fetchViewerRelationshipMaps } from "@/lib/socialPrivacy";

export type UserStatusType = "available" | "away" | "busy" | "invisible";

export interface UserStatus {
  user_id: string;
  status: UserStatusType;
  last_seen: string;
}

export function useUserStatus() {
  const { user } = useAuth();
  const [myStatus, setMyStatus] = useState<UserStatusType>("available");
  const [statuses, setStatuses] = useState<Map<string, UserStatus>>(new Map());

  const fetchStatuses = useCallback(async (userIds?: string[]) => {
    if (!user) return;

    const query = (supabase as any).from("user_status").select("*");
    if (userIds && userIds.length > 0) {
      query.in("user_id", userIds);
    }
    const { data } = await query;
    if (data) {
      const visibleTargetIds = (data as any[])
        .map((status) => status.user_id)
        .filter((userId) => userId !== user.id);
      const { blockedIds, friendIds, privacyMap } = await fetchViewerRelationshipMaps(user.id, visibleTargetIds);
      const map = new Map<string, UserStatus>();
      data.forEach((s: any) => {
        const isSelf = s.user_id === user.id;
        const isFriend = friendIds.has(s.user_id);
        if (!blockedIds.has(s.user_id) && canViewStatus(privacyMap.get(s.user_id) || null, isFriend, isSelf)) {
          map.set(s.user_id, s);
        }
      });
      setStatuses(map);
      if (map.has(user.id)) {
        setMyStatus(map.get(user.id)!.status as UserStatusType);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchStatuses();

    // Set initial status
    (async () => {
      const { data: existing } = await (supabase as any)
        .from("user_status").select("id").eq("user_id", user.id).single();
      if (!existing) {
        await (supabase as any).from("user_status").insert({
          user_id: user.id, status: "available", last_seen: new Date().toISOString(),
        });
      } else {
        await (supabase as any).from("user_status").update({
          last_seen: new Date().toISOString(),
        }).eq("user_id", user.id);
      }
    })();

    const channel = supabase
      .channel("user-status-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_status" }, () => {
        fetchStatuses();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_privacy_settings" }, () => {
        fetchStatuses();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        fetchStatuses();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_blocks" }, () => {
        fetchStatuses();
      })
      .subscribe();

    // Heartbeat
    const interval = setInterval(() => {
      (supabase as any).from("user_status").update({
        last_seen: new Date().toISOString(),
      }).eq("user_id", user.id).then(() => {});
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, fetchStatuses]);

  const setStatus = async (status: UserStatusType) => {
    if (!user) return;
    setMyStatus(status);
    await (supabase as any).from("user_status").update({
      status, updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
  };

  const getStatus = (userId: string): UserStatus | undefined => statuses.get(userId);

  return { myStatus, setStatus, getStatus, statuses, fetchStatuses };
}
