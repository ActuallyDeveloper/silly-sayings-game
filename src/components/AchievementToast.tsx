import { motion, AnimatePresence } from "framer-motion";
import { Award } from "lucide-react";
import { useEffect, useState } from "react";

interface AchievementNotification {
  id: string;
  title: string;
  tier: string;
}

const TIER_COLORS: Record<string, string> = {
  bronze: "from-amber-700 to-amber-900",
  silver: "from-gray-300 to-gray-500",
  gold: "from-yellow-400 to-amber-500",
  platinum: "from-cyan-300 to-blue-500",
};

let globalSetAchievements: ((fn: (prev: AchievementNotification[]) => AchievementNotification[]) => void) | null = null;

export function showAchievementToast(title: string, tier: string = "bronze") {
  const id = `ach-${Date.now()}-${Math.random()}`;
  globalSetAchievements?.((prev) => [...prev, { id, title, tier }]);
}

const AchievementToast = () => {
  const [achievements, setAchievements] = useState<AchievementNotification[]>([]);
  globalSetAchievements = setAchievements;

  useEffect(() => {
    if (achievements.length === 0) return;
    const timer = setTimeout(() => {
      setAchievements((prev) => prev.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [achievements]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {achievements.map((ach) => (
          <motion.div
            key={ach.id}
            initial={{ opacity: 0, y: -50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="achievement-toast rounded-xl px-6 py-4 flex items-center gap-3 shadow-2xl pointer-events-auto"
          >
            <motion.div
              animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${TIER_COLORS[ach.tier] || TIER_COLORS.bronze} flex items-center justify-center`}>
                <Award className="w-5 h-5 text-white" />
              </div>
            </motion.div>
            <div>
              <motion.p
                className="text-[10px] font-bold uppercase tracking-widest text-accent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                🏆 Achievement Unlocked!
              </motion.p>
              <motion.p
                className="text-sm font-black text-foreground"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                {ach.title}
              </motion.p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AchievementToast;
