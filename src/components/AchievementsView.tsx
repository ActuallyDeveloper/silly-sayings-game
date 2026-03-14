import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAchievements } from "@/hooks/useAchievements";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Lock, Sparkles } from "lucide-react";

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
  const { 
    achievements, 
    earnedIds, 
    loading, 
    newlyUnlocked,
    checkAchievements,
    clearNewlyUnlocked 
  } = useAchievements(mode);
  
  const isSP = mode === "singleplayer";

  // Check for new achievements on mount (in case user navigates here after playing)
  useEffect(() => {
    if (user) {
      checkAchievements();
    }
  }, [user, checkAchievements]);

  // Clear newly unlocked after a delay
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const timer = setTimeout(() => {
        clearNewlyUnlocked();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newlyUnlocked, clearNewlyUnlocked]);

  const tiers = ["bronze", "silver", "gold", "platinum"];
  const earnedCount = achievements.filter(a => earnedIds.has(a.id)).length;

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

        <div className="mb-4 flex gap-2 items-center">
          <span className="text-sm text-muted-foreground font-bold">
            {earnedCount}/{achievements.length} unlocked
          </span>
          {newlyUnlocked.length > 0 && (
            <motion.span 
              className="flex items-center gap-1 text-xs font-bold text-accent"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Sparkles className="w-3 h-3" />
              {newlyUnlocked.length} new!
            </motion.span>
          )}
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
                    <AnimatePresence>
                      {tierAchs.map((ach, i) => {
                        const isEarned = earnedIds.has(ach.id);
                        const isNew = newlyUnlocked.some(n => n.id === ach.id);
                        return (
                          <motion.div 
                            key={ach.id}
                            className={`relative rounded-lg p-3 border ${isEarned ? TIER_BORDER[tier] : "border-border"} ${
                              isEarned ? "bg-secondary" : "bg-secondary/50 opacity-60"
                            } ${isNew ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}`}
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ delay: i * 0.05 }}
                            layout
                          >
                            {isNew && (
                              <motion.div 
                                className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5 }}
                              >
                                <Sparkles className="w-3 h-3" /> NEW
                              </motion.div>
                            )}
                            <div className="flex items-start gap-3">
                              <Award className="w-6 h-6 text-accent shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-black text-foreground text-sm">{ach.title}</p>
                                  {!isEarned && <Lock className="w-3 h-3 text-muted-foreground" />}
                                </div>
                                <p className="text-xs text-muted-foreground">{ach.description}</p>
                              </div>
                              {isEarned && (
                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r ${TIER_COLORS[tier]} text-white flex items-center shrink-0`}>
                                  <Award className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
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
