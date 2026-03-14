import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserStatusType = "available" | "away" | "busy" | "invisible";

export interface UserStatus {
  user_id: string;
  status: UserStatusType;
  last_seen: string;
}

export interface PrivacySettings {
  status_visibility: "everyone" | "friends";
}

interface StatusContextType {
  myStatus: UserStatusType;
  setStatus: (status: UserStatusType) => Promise<void>;
  getStatus: (userId: string) => UserStatus | undefined;
  getStatusWithPrivacy: (userId: string) => { status: UserStatusType; canView: boolean };
  statuses: Map<string, UserStatus>;
  privacySettings: Map<string, PrivacySettings>;
  friends: Set<string>;
  fetchStatuses: (userIds?: string[]) => Promise<void>;
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export function StatusProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [myStatus, setMyStatus] = useState<UserStatusType>("available");
  const [statuses, setStatuses] = useState<Map<string, UserStatus>>(new Map());
  const [privacySettings, setPrivacySettings] = useState<Map<string, PrivacySettings>>(new Map());
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const friendsFetched = useRef(false);

  // Fetch friends list for privacy checks
  const fetchFriends = useCallback(async () => {
    if (!user || friendsFetched.current) return;
    friendsFetched.current = true;
    
    const { data } = await (supabase as any)
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted");
    
    if (data) {
      const friendSet = new Set<string>();
      data.forEach((f: any) => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        friendSet.add(friendId);
      });
      setFriends(friendSet);
    }
  }, [user]);

  // Fetch privacy settings for users
  const fetchPrivacySettings = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    const { data } = await (supabase as any)
      .from("user_privacy_settings")
      .select("user_id, status_visibility")
      .in("user_id", userIds);
    
    if (data) {
      setPrivacySettings(prev => {
        const next = new Map(prev);
        data.forEach((p: any) => {
          next.set(p.user_id, { status_visibility: p.status_visibility || "everyone" });
        });
        return next;
      });
    }
  }, []);

  const fetchStatuses = useCallback(async (userIds?: string[]) => {
    const query = (supabase as any).from("user_status").select("*");
    if (userIds && userIds.length > 0) {
      query.in("user_id", userIds);
    }
    const { data } = await query;
    if (data) {
      const map = new Map<string, UserStatus>();
      const ids: string[] = [];
      data.forEach((s: any) => {
        map.set(s.user_id, s);
        ids.push(s.user_id);
      });
      setStatuses(map);
      if (user && map.has(user.id)) {
        setMyStatus(map.get(user.id)!.status as UserStatusType);
      }
      // Also fetch privacy settings for these users
      await fetchPrivacySettings(ids);
    }
  }, [user, fetchPrivacySettings]);

  // Fetch friends on mount
  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user, fetchFriends]);

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
      .channel("user-status-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_status" }, () => {
        fetchStatuses();
      })
      .subscribe();

    // Heartbeat every minute
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

  // Get status respecting privacy settings
  const getStatusWithPrivacy = useCallback((userId: string): { status: UserStatusType; canView: boolean } => {
    // Own status - always visible
    if (userId === user?.id) {
      return { status: myStatus, canView: true };
    }
    
    const userStatus = statuses.get(userId);
    const userPrivacy = privacySettings.get(userId);
    
    // Default to invisible if no status found
    if (!userStatus) {
      return { status: "invisible", canView: false };
    }
    
    // If user's status visibility is "friends" only, check if we're friends
    if (userPrivacy?.status_visibility === "friends") {
      const isFriend = friends.has(userId);
      if (!isFriend) {
        return { status: "invisible", canView: false };
      }
    }
    
    return { status: userStatus.status, canView: true };
  }, [user?.id, myStatus, statuses, privacySettings, friends]);

  return (
    <StatusContext.Provider value={{ 
      myStatus, 
      setStatus, 
      getStatus, 
      getStatusWithPrivacy,
      statuses, 
      privacySettings,
      friends,
      fetchStatuses 
    }}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  const context = useContext(StatusContext);
  if (!context) throw new Error("useStatus must be used within StatusProvider");
  return context;
}
