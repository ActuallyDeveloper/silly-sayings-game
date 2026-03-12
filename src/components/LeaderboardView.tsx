import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Flame, Target, Gamepad2 } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  username: string | null;
  total_games: number;
  wins: number;
  losses: number;
  total_points: number;
  win_rate: number;
}

interface LeaderboardViewProps {
  mode: "singleplayer" | "multiplayer";
}

const LeaderboardView = ({ mode }: LeaderboardViewProps) => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const isSP = mode === "singleplayer";
  const viewName = isSP ? "sp_leaderboard" : "mp_leaderboard";

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from(viewName)
        .select("*")
        .order("wins", { ascending: false })
        .limit(50);
      setEntries(data || []);
      setLoading(false);
    })();
  }, [viewName]);

  const medals = ["🥇", "🥈", "🥉"];

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
        <motion.div className="flex items-center gap-3 mb-6 sm:mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
          <h1 className="text-3xl sm:text-4xl font-black text-foreground">{isSP ? "SP" : "MP"} Leaderboard</h1>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : entries.length === 0 ? (
          <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Gamepad2 className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No games played yet.</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <motion.div key={entry.user_id}
                className={`rounded-lg ${i < 3 ? "bg-accent/10 border border-accent/20" : "bg-secondary"}`}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-center justify-between px-3 sm:px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg font-black shrink-0">
                      {i < 3 ? medals[i] : <span className="text-muted-foreground">{i + 1}</span>}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate text-sm">{entry.username || entry.display_name || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{entry.wins}W · {entry.losses}L · {entry.total_points}pts</p>
                    </div>
                  </div>
                  <span className={`font-black text-sm shrink-0 ${entry.win_rate >= 60 ? "text-accent" : "text-muted-foreground"}`}>
                    {entry.win_rate}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardView;
