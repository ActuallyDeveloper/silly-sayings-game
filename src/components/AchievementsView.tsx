import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Lock } from "lucide-react";

interface Achievement {
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

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
}

const TIER_COLORS: Record<string, string> = {
  bronze: "from-amber-700 to-amber-900",
  silver: "from-gray-300 to-gray-500",
  gold: "from-yellow-400 to-amber-500",
  platinum: "from-cyan-300 to-blue-500",
};

const TIER_BORDER: Record<string, string> = {
  bronze: "border-amber-700/30",
  silver: "border-gray-400/30",
  gold: "border-yellow-400/30",
  platinum: "border-cyan-400/30",
};

interface AchievementsViewProps {
  mode: "singleplayer" | "multiplayer";
}

const AchievementsView = ({ mode }: AchievementsViewProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const isSP = mode === "singleplayer";

  useEffect(() => {
    (async () => {
      const { data: achData } = await (supabase as any)
        .from("achievements")
        .select("*")
        .eq("mode", mode)
        .order("tier", { ascending: true });
      setAchievements(achData || []);

      if (user) {
        const { data: earnedData } = await (supabase as any)
          .from("user_achievements")
          .select("*")
          .eq("user_id", user.id)
          .eq("mode", mode);
        setEarned(earnedData || []);

        // Check for new achievements
        const { data: scores } = await (supabase as any)
          .from("game_scores")
          .select("*")
          .eq("user_id", user.id)
          .eq("mode", mode)
          .order("created_at", { ascending: false });

        if (scores && achData) {
          const totalGames = scores.length;
          const wins = scores.filter((s: any) => s.won).length;
          const totalPoints = scores.reduce((sum: number, s: any) => sum + s.player_score, 0);
          let bestStreak = 0, tempStreak = 0;
          for (const s of scores) {
            if ((s as any).won) { tempStreak++; if (tempStreak > bestStreak) bestStreak = tempStreak; }
            else tempStreak = 0;
          }

          const earnedIds = new Set((earnedData || []).map((e: any) => e.achievement_id));
          const newAchievements: string[] = [];

          for (const ach of achData) {
            if (earnedIds.has(ach.id)) continue;
            let met = false;
            if (ach.requirement_type === "wins") met = wins >= ach.requirement_value;
            else if (ach.requirement_type === "games") met = totalGames >= ach.requirement_value;
            else if (ach.requirement_type === "points") met = totalPoints >= ach.requirement_value;
            else if (ach.requirement_type === "streak") met = bestStreak >= ach.requirement_value;
            if (met) newAchievements.push(ach.id);
          }

          if (newAchievements.length > 0) {
            const inserts = newAchievements.map((aid) => ({
              user_id: user.id,
              achievement_id: aid,
              mode,
            }));
            await (supabase as any).from("user_achievements").insert(inserts);
            const { data: updatedEarned } = await (supabase as any)
              .from("user_achievements")
              .select("*")
              .eq("user_id", user.id)
              .eq("mode", mode);
            setEarned(updatedEarned || []);
          }
        }
      }
      setLoading(false);
    })();
  }, [user, mode]);

  const earnedIds = new Set(earned.map((e) => e.achievement_id));
  const tiers = ["bronze", "silver", "gold", "platinum"];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border">
        <ExoticLogo size="sm" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">{isSP ? "Single Player" : "Multiplayer"}</span>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 sm:py-8">
        <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Award className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
          <h1 className="text-3xl sm:text-4xl font-black text-foreground">{isSP ? "SP" : "MP"} Achievements</h1>
        </motion.div>

        <div className="mb-4 flex gap-2">
          <span className="text-sm text-muted-foreground font-bold">
            {earned.length}/{achievements.length} unlocked
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {tiers.map((tier) => {
              const tierAchs = achievements.filter((a) => a.tier === tier);
              if (tierAchs.length === 0) return null;
              return (
                <div key={tier}>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 capitalize">{tier} Tier</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {tierAchs.map((ach, i) => {
                      const isEarned = earnedIds.has(ach.id);
                      return (
                        <motion.div key={ach.id}
                          className={`relative rounded-lg p-3 border ${isEarned ? TIER_BORDER[tier] : "border-border"} ${
                            isEarned ? "bg-secondary" : "bg-secondary/50 opacity-60"
                          }`}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                          <div className="flex items-start gap-3">
                            <Award className="w-6 h-6 text-accent" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-black text-foreground text-sm">{ach.title}</p>
                                {!isEarned && <Lock className="w-3 h-3 text-muted-foreground" />}
                              </div>
                              <p className="text-xs text-muted-foreground">{ach.description}</p>
                            </div>
                            {isEarned && (
                              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r ${TIER_COLORS[tier]} text-white`}>
                                ✓
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementsView;
