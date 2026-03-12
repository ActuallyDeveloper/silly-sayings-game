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
    if (!user) return;
    const { data } = await (supabase as any)
      .from("user_privacy_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setSettings({
        profile_visibility: data.profile_visibility,
        status_visibility: data.status_visibility,
        receive_friend_requests: data.receive_friend_requests,
        receive_game_invites: data.receive_game_invites,
        receive_dms: data.receive_dms,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSettings = async (updates: Partial<PrivacySettings>) => {
    if (!user) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    const { data: existing } = await (supabase as any)
      .from("user_privacy_settings")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      await (supabase as any)
        .from("user_privacy_settings")
        .update({ ...newSettings, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    } else {
      await (supabase as any)
        .from("user_privacy_settings")
        .insert({ user_id: user.id, ...newSettings });
    }
  };

  return { settings, loading, updateSettings };
}
