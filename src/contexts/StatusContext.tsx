import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserStatusType = "available" | "away" | "busy" | "invisible";

export interface UserStatus {
  user_id: string;
  status: UserStatusType;
  last_seen: string;
}

interface StatusContextType {
  myStatus: UserStatusType;
  setStatus: (status: UserStatusType) => Promise<void>;
  getStatus: (userId: string) => UserStatus | undefined;
  statuses: Map<string, UserStatus>;
  fetchStatuses: (userIds?: string[]) => Promise<void>;
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export function StatusProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [myStatus, setMyStatus] = useState<UserStatusType>("available");
  const [statuses, setStatuses] = useState<Map<string, UserStatus>>(new Map());

  const fetchStatuses = useCallback(async (userIds?: string[]) => {
    const query = (supabase as any).from("user_status").select("*");
    if (userIds && userIds.length > 0) {
      query.in("user_id", userIds);
    }
    const { data } = await query;
    if (data) {
      const map = new Map<string, UserStatus>();
      data.forEach((s: any) => map.set(s.user_id, s));
      setStatuses(map);
      if (user && map.has(user.id)) {
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

  return (
    <StatusContext.Provider value={{ myStatus, setStatus, getStatus, statuses, fetchStatuses }}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  const context = useContext(StatusContext);
  if (!context) throw new Error("useStatus must be used within StatusProvider");
  return context;
}
