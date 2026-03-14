import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  mode: string;
  tier: string;
  requirement_type: string;
  requirement_value: number;
}

export interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  mode: string;
}

export interface NewAchievement {
  achievement_id: string;
  achievement_key: string;
  achievement_title: string;
}

export function useAchievements(mode: "singleplayer" | "multiplayer") {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);

  // Fetch all achievements for the mode
  const fetchAchievements = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("achievements")
      .select("*")
      .eq("mode", mode)
      .order("tier", { ascending: true });
    setAchievements(data || []);
  }, [mode]);

  // Fetch user's earned achievements
  const fetchEarned = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("user_achievements")
      .select("*")
      .eq("user_id", user.id)
      .eq("mode", mode);
    setEarned(data || []);
  }, [user, mode]);

  // Check and award new achievements (call after game ends)
  const checkAchievements = useCallback(async (): Promise<NewAchievement[]> => {
    if (!user) return [];
    
    try {
      const { data, error } = await (supabase as any)
        .rpc("check_achievements", { _user_id: user.id, _mode: mode });
      
      if (error) {
        console.error("Error checking achievements:", error);
        return [];
      }
      
      const newAchs = data || [];
      
      // Show toast for each new achievement
      for (const ach of newAchs) {
        const fullAch = achievements.find(a => a.id === ach.achievement_id);
        if (fullAch) {
          setNewlyUnlocked(prev => [...prev, fullAch]);
          toast.success(`Achievement Unlocked: ${ach.achievement_title}`, {
            description: fullAch.description,
            duration: 5000,
          });
        }
      }
      
      // Refresh earned list
      if (newAchs.length > 0) {
        await fetchEarned();
      }
      
      return newAchs;
    } catch (err) {
      console.error("Error in checkAchievements:", err);
      return [];
    }
  }, [user, mode, achievements, fetchEarned]);

  // Clear newly unlocked (after showing notification)
  const clearNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked([]);
  }, []);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchAchievements();
      await fetchEarned();
      setLoading(false);
    };
    load();
  }, [fetchAchievements, fetchEarned]);

  // Real-time subscription for new achievements
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-achievements-${mode}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newEarned = payload.new as any;
          if (newEarned.mode === mode) {
            // Add to earned list
            setEarned((prev) => {
              if (prev.some(e => e.id === newEarned.id)) return prev;
              return [...prev, newEarned];
            });
            
            // Find achievement details and show toast
            const fullAch = achievements.find(a => a.id === newEarned.achievement_id);
            if (fullAch) {
              setNewlyUnlocked(prev => {
                if (prev.some(a => a.id === fullAch.id)) return prev;
                return [...prev, fullAch];
              });
              toast.success(`Achievement Unlocked: ${fullAch.title}`, {
                description: fullAch.description,
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, mode, achievements]);

  const earnedIds = new Set(earned.map((e) => e.achievement_id));

  return {
    achievements,
    earned,
    earnedIds,
    loading,
    newlyUnlocked,
    checkAchievements,
    clearNewlyUnlocked,
    refetch: async () => {
      await fetchAchievements();
      await fetchEarned();
    },
  };
}
