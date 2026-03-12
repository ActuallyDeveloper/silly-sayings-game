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
  total_games: number;
  wins: number;
  losses: number;
  total_points: number;
  win_rate: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("leaderboard" as any)
        .select("*")
        .order("wins", { ascending: false })
        .limit(50);
      setEntries((data as unknown as LeaderboardEntry[] | null) || []);
      setLoading(false);
    }
    fetch();
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border">
        <ExoticLogo size="sm" />
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Home
        </Button>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <motion.div
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Trophy className="w-8 h-8 text-accent" />
          <h1 className="text-4xl font-black text-foreground">Leaderboard</h1>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Gamepad2 className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No games played yet.</p>
            <p className="text-muted-foreground/50 text-sm mt-1">Play a game to appear on the leaderboard!</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem_4rem_4.5rem] gap-2 px-4 py-2 text-xs text-muted-foreground font-bold uppercase tracking-widest">
              <span>#</span>
              <span>Player</span>
              <span className="text-center">W</span>
              <span className="text-center">L</span>
              <span className="text-center">Pts</span>
              <span className="text-right">Win%</span>
            </div>

            {entries.map((entry, i) => (
              <motion.div
                key={entry.user_id}
                className={`grid grid-cols-[2.5rem_1fr_4rem_4rem_4rem_4.5rem] gap-2 items-center px-4 py-3 rounded-lg ${
                  i < 3 ? "bg-accent/10 border border-accent/20" : "bg-secondary"
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="text-lg font-black">
                  {i < 3 ? medals[i] : <span className="text-muted-foreground">{i + 1}</span>}
                </span>
                <span className="font-bold text-foreground truncate">
                  {entry.display_name || "Anonymous"}
                </span>
                <span className="text-center font-bold text-accent flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3" /> {entry.wins}
                </span>
                <span className="text-center text-muted-foreground font-bold">{entry.losses}</span>
                <span className="text-center text-foreground font-bold flex items-center justify-center gap-1">
                  <Target className="w-3 h-3 text-muted-foreground" /> {entry.total_points}
                </span>
                <span className={`text-right font-black text-sm ${
                  entry.win_rate >= 60 ? "text-accent" : entry.win_rate >= 40 ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {entry.win_rate}%
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
