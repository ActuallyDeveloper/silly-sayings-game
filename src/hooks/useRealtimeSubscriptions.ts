import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Generic realtime subscription hook
export function useRealtimeSubscription<T>(
  table: string,
  options?: {
    filter?: string;
    event?: "*" | "INSERT" | "UPDATE" | "DELETE";
    onInsert?: (record: T) => void;
    onUpdate?: (record: T) => void;
    onDelete?: (record: T) => void;
    enabled?: boolean;
  }
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (options?.enabled === false) return;

    const channelKey = `${table}-${options?.filter || "all"}-${Date.now()}`;
    const channel = supabase.channel(channelKey);

    const config: any = {
      event: options?.event || "*",
      schema: "public",
      table,
    };
    if (options?.filter) {
      config.filter = options.filter;
    }

    channel
      .on("postgres_changes", config, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        if (eventType === "INSERT" && options?.onInsert) {
          options.onInsert(newRecord as T);
        } else if (eventType === "UPDATE" && options?.onUpdate) {
          options.onUpdate(newRecord as T);
        } else if (eventType === "DELETE" && options?.onDelete) {
          options.onDelete(oldRecord as T);
        }
      })
      .subscribe((status) => {
        setIsSubscribed(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsSubscribed(false);
      }
    };
  }, [table, options?.filter, options?.event, options?.enabled]);

  return { isSubscribed };
}

// Hook for multiple table subscriptions
export function useRealtimeMultiSubscription(
  subscriptions: Array<{
    table: string;
    filter?: string;
    event?: "*" | "INSERT" | "UPDATE" | "DELETE";
    callback: (payload: any) => void;
  }>,
  enabled = true
) {
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const channels: RealtimeChannel[] = [];
    let subscribedCount = 0;

    subscriptions.forEach((sub, idx) => {
      const channelKey = `multi-${sub.table}-${idx}-${Date.now()}`;
      const channel = supabase.channel(channelKey);

      const config: any = {
        event: sub.event || "*",
        schema: "public",
        table: sub.table,
      };
      if (sub.filter) {
        config.filter = sub.filter;
      }

      channel
        .on("postgres_changes", config, (payload) => {
          sub.callback(payload);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            subscribedCount++;
            if (subscribedCount === subscriptions.length) {
              setIsSubscribed(true);
            }
          }
        });

      channels.push(channel);
    });

    channelsRef.current = channels;

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      setIsSubscribed(false);
    };
  }, [subscriptions.length, enabled]);

  return { isSubscribed };
}

// Broadcast channel hook for custom events (typing, presence, etc.)
export function useBroadcastChannel(
  channelName: string,
  eventName: string,
  onReceive: (payload: any) => void,
  enabled = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { user } = useAuth();

  const send = useCallback(
    (payload: any) => {
      if (channelRef.current && user) {
        channelRef.current.send({
          type: "broadcast",
          event: eventName,
          payload: { ...payload, senderId: user.id },
        });
      }
    },
    [eventName, user?.id]
  );

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: eventName }, ({ payload }) => {
        // Don't receive your own broadcasts
        if (payload?.senderId !== user?.id) {
          onReceive(payload);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, eventName, enabled, user?.id]);

  return { send };
}

// Enhanced typing indicator hook with debouncing
export function useEnhancedTypingIndicator(channelName: string, username: string) {
  const [typingUsers, setTypingUsers] = useState<Map<string, { username: string; timestamp: number }>>(new Map());
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastTypingSentRef = useRef(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`typing-${channelName}`);

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.userId === user.id) return;

        const { userId, username: typingUsername, isTyping } = payload;

        if (isTyping) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.set(userId, { username: typingUsername, timestamp: Date.now() });
            return next;
          });

          // Clear existing timeout
          const existingTimeout = typingTimeoutRef.current.get(userId);
          if (existingTimeout) clearTimeout(existingTimeout);

          // Auto-remove after 3 seconds
          const timeout = setTimeout(() => {
            setTypingUsers((prev) => {
              const next = new Map(prev);
              next.delete(userId);
              return next;
            });
            typingTimeoutRef.current.delete(userId);
          }, 3000);
          typingTimeoutRef.current.set(userId, timeout);
        } else {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
          const existingTimeout = typingTimeoutRef.current.get(userId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            typingTimeoutRef.current.delete(userId);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, user?.id]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current || !user) return;

      // Debounce typing events - don't send more than once per 500ms
      const now = Date.now();
      if (isTyping && now - lastTypingSentRef.current < 500) return;
      lastTypingSentRef.current = now;

      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: user.id, username, isTyping },
      });
    },
    [user?.id, username]
  );

  const typingUsersList = Array.from(typingUsers.values()).map((t) => t.username);

  return { typingUsers: typingUsersList, sendTyping };
}

// Presence hook for tracking online users in a room
export function useRoomPresence(
  roomId: string | null,
  userState?: Record<string, any>
) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, any>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!roomId || !user) return;

    const channel = supabase.channel(`presence-${roomId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = new Map<string, any>();
        Object.entries(state).forEach(([key, presences]) => {
          if (presences && presences.length > 0) {
            users.set(key, presences[0]);
          }
        });
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && userState) {
          await channel.track(userState);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId, user?.id]);

  const updatePresence = useCallback(
    async (state: Record<string, any>) => {
      if (channelRef.current) {
        await channelRef.current.track(state);
      }
    },
    []
  );

  return { onlineUsers, updatePresence };
}

// Hook for status updates with privacy settings
export function useStatusWithPrivacy(userId: string | null) {
  const [status, setStatus] = useState<string | null>(null);
  const [canView, setCanView] = useState(true);
  const { user } = useAuth();

  const checkPrivacyAndFetchStatus = useCallback(async () => {
    if (!userId) return;

    // Fetch privacy settings
    const { data: privacyData } = await (supabase as any)
      .from("user_privacy_settings")
      .select("status_visibility")
      .eq("user_id", userId)
      .single();

    const statusVisibility = privacyData?.status_visibility || "everyone";

    // Check if current user can view
    if (statusVisibility === "friends" && user) {
      const { data: friendship } = await (supabase as any)
        .from("friendships")
        .select("id")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
        .eq("status", "accepted")
        .single();

      if (!friendship) {
        setCanView(false);
        setStatus("invisible");
        return;
      }
    }

    setCanView(true);

    // Fetch actual status
    const { data: statusData } = await (supabase as any)
      .from("user_status")
      .select("status")
      .eq("user_id", userId)
      .single();

    setStatus(statusData?.status || "invisible");
  }, [userId, user?.id]);

  useEffect(() => {
    checkPrivacyAndFetchStatus();

    if (!userId) return;

    // Subscribe to status changes
    const channel = supabase
      .channel(`status-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_status", filter: `user_id=eq.${userId}` },
        () => {
          checkPrivacyAndFetchStatus();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_privacy_settings", filter: `user_id=eq.${userId}` },
        () => {
          checkPrivacyAndFetchStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, checkPrivacyAndFetchStatus]);

  return { status, canView };
}
