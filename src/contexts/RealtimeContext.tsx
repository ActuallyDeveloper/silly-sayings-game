import { createContext, useContext, useEffect, useCallback, ReactNode, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

type SubscriptionCallback = (payload: any) => void;

interface Subscription {
  table: string;
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
  callback: SubscriptionCallback;
}

interface RealtimeContextType {
  subscribe: (subscription: Subscription) => () => void;
  subscribeToTable: (table: string, callback: SubscriptionCallback, filter?: string) => () => void;
  subscribeToChannel: (channelName: string, eventName: string, callback: SubscriptionCallback) => () => void;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const subscriptionsRef = useRef<Map<string, Set<SubscriptionCallback>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // Subscribe to postgres_changes for a specific table
  const subscribe = useCallback((subscription: Subscription) => {
    const { table, event, filter, callback } = subscription;
    const channelKey = `${table}-${event}-${filter || "all"}`;
    
    // Add callback to subscriptions set
    if (!subscriptionsRef.current.has(channelKey)) {
      subscriptionsRef.current.set(channelKey, new Set());
    }
    subscriptionsRef.current.get(channelKey)!.add(callback);
    
    // Create channel if it doesn't exist
    if (!channelsRef.current.has(channelKey)) {
      const channelConfig: any = {
        event,
        schema: "public",
        table,
      };
      if (filter) {
        channelConfig.filter = filter;
      }
      
      const channel = supabase
        .channel(channelKey)
        .on("postgres_changes", channelConfig, (payload) => {
          // Call all callbacks for this subscription
          const callbacks = subscriptionsRef.current.get(channelKey);
          if (callbacks) {
            callbacks.forEach(cb => cb(payload));
          }
        })
        .subscribe((status) => {
          setIsConnected(status === "SUBSCRIBED");
        });
      
      channelsRef.current.set(channelKey, channel);
    }
    
    // Return unsubscribe function
    return () => {
      const callbacks = subscriptionsRef.current.get(channelKey);
      if (callbacks) {
        callbacks.delete(callback);
        // If no more callbacks, remove the channel
        if (callbacks.size === 0) {
          const channel = channelsRef.current.get(channelKey);
          if (channel) {
            supabase.removeChannel(channel);
            channelsRef.current.delete(channelKey);
            subscriptionsRef.current.delete(channelKey);
          }
        }
      }
    };
  }, []);

  // Convenience method for subscribing to all events on a table
  const subscribeToTable = useCallback((table: string, callback: SubscriptionCallback, filter?: string) => {
    return subscribe({ table, event: "*", filter, callback });
  }, [subscribe]);

  // Subscribe to a broadcast channel (for custom events)
  const subscribeToChannel = useCallback((channelName: string, eventName: string, callback: SubscriptionCallback) => {
    const key = `broadcast-${channelName}-${eventName}`;
    
    if (!subscriptionsRef.current.has(key)) {
      subscriptionsRef.current.set(key, new Set());
    }
    subscriptionsRef.current.get(key)!.add(callback);
    
    if (!channelsRef.current.has(key)) {
      const channel = supabase
        .channel(channelName)
        .on("broadcast", { event: eventName }, (payload) => {
          const callbacks = subscriptionsRef.current.get(key);
          if (callbacks) {
            callbacks.forEach(cb => cb(payload));
          }
        })
        .subscribe();
      
      channelsRef.current.set(key, channel);
    }
    
    return () => {
      const callbacks = subscriptionsRef.current.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          const channel = channelsRef.current.get(key);
          if (channel) {
            supabase.removeChannel(channel);
            channelsRef.current.delete(key);
            subscriptionsRef.current.delete(key);
          }
        }
      }
    };
  }, []);

  // Cleanup all channels on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
      subscriptionsRef.current.clear();
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ subscribe, subscribeToTable, subscribeToChannel, isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used within RealtimeProvider");
  return context;
}

// Hook for subscribing to a specific table
export function useRealtimeTable<T = any>(
  table: string,
  options?: {
    filter?: string;
    event?: "*" | "INSERT" | "UPDATE" | "DELETE";
    onInsert?: (record: T) => void;
    onUpdate?: (record: T) => void;
    onDelete?: (record: T) => void;
    onChange?: (payload: { eventType: string; new: T; old: T }) => void;
  }
) {
  const { subscribe } = useRealtime();
  
  useEffect(() => {
    const unsubscribe = subscribe({
      table,
      event: options?.event || "*",
      filter: options?.filter,
      callback: (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        if (options?.onChange) {
          options.onChange({ eventType, new: newRecord, old: oldRecord });
        }
        
        if (eventType === "INSERT" && options?.onInsert) {
          options.onInsert(newRecord);
        } else if (eventType === "UPDATE" && options?.onUpdate) {
          options.onUpdate(newRecord);
        } else if (eventType === "DELETE" && options?.onDelete) {
          options.onDelete(oldRecord);
        }
      },
    });
    
    return unsubscribe;
  }, [table, options?.filter, options?.event]);
}

// Hook for presence (online users, typing indicators, etc.)
export function usePresence(channelName: string, userState?: Record<string, any>) {
  const [presenceState, setPresenceState] = useState<Record<string, any[]>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } },
    });
    
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setPresenceState(state);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        setPresenceState(prev => ({
          ...prev,
          [key]: [...(prev[key] || []), ...newPresences],
        }));
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        setPresenceState(prev => {
          const existing = prev[key] || [];
          const remaining = existing.filter(p => 
            !leftPresences.some((lp: any) => lp.presence_ref === p.presence_ref)
          );
          if (remaining.length === 0) {
            const { [key]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [key]: remaining };
        });
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
      }
    };
  }, [channelName, user?.id]);
  
  const updatePresence = useCallback(async (state: Record<string, any>) => {
    if (channelRef.current) {
      await channelRef.current.track(state);
    }
  }, []);
  
  return { presenceState, updatePresence };
}

// Hook for typing indicators
export function useTypingIndicator(channelName: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { user } = useAuth();
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase.channel(`typing-${channelName}`);
    
    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { userId, username, isTyping } = payload;
        if (userId === user.id) return;
        
        if (isTyping) {
          setTypingUsers(prev => {
            if (!prev.includes(username)) return [...prev, username];
            return prev;
          });
          
          // Clear existing timeout
          const existing = typingTimeoutRef.current.get(userId);
          if (existing) clearTimeout(existing);
          
          // Set timeout to remove after 3 seconds
          const timeout = setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u !== username));
            typingTimeoutRef.current.delete(userId);
          }, 3000);
          typingTimeoutRef.current.set(userId, timeout);
        } else {
          setTypingUsers(prev => prev.filter(u => u !== username));
          const existing = typingTimeoutRef.current.get(userId);
          if (existing) {
            clearTimeout(existing);
            typingTimeoutRef.current.delete(userId);
          }
        }
      })
      .subscribe();
    
    channelRef.current = channel;
    
    return () => {
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelName, user?.id]);
  
  const sendTyping = useCallback((username: string, isTyping: boolean) => {
    if (channelRef.current && user) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: user.id, username, isTyping },
      });
    }
  }, [user?.id]);
  
  return { typingUsers, sendTyping };
}
