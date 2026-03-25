import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PrivacySettings {
  profile_visibility: "public" | "friends" | "private";
  status_visibility: "everyone" | "friends";
  receive_friend_requests: "everyone" | "nobody";
  receive_game_invites: "everyone" | "friends";
  receive_dms: "everyone" | "friends";
}

const defaults: PrivacySettings = {
  profile_visibility: "public",
  status_visibility: "everyone",
  receive_friend_requests: "everyone",
  receive_game_invites: "everyone",
  receive_dms: "everyone",
};

export function usePrivacySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>(defaults);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(defaults);
      setLoading(false);
      return;
    }

    const { data } = await (supabase as any)
      .from("user_privacy_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setSettings({
        profile_visibility: data.profile_visibility,
        status_visibility: data.status_visibility,
        receive_friend_requests: data.receive_friend_requests,
        receive_game_invites: data.receive_game_invites,
        receive_dms: data.receive_dms,
      });
    } else {
      setSettings(defaults);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`privacy-settings-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_privacy_settings", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setSettings(defaults);
            return;
          }

          const next = payload.new as any;
          if (!next) return;
          setSettings({
            profile_visibility: next.profile_visibility,
            status_visibility: next.status_visibility,
            receive_friend_requests: next.receive_friend_requests,
            receive_game_invites: next.receive_game_invites,
            receive_dms: next.receive_dms,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateSettings = async (updates: Partial<PrivacySettings>) => {
    if (!user) return;
    const previousSettings = settings;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    const { error } = await (supabase as any)
      .from("user_privacy_settings")
      .upsert({ user_id: user.id, ...newSettings, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    if (error) {
      setSettings(previousSettings);
      throw error;
    }
  };

  return { settings, loading, updateSettings, refresh: fetchSettings };
}
