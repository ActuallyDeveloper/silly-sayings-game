import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Flame, Target, Gamepad2, Calendar, TrendingUp, User, Zap } from "lucide-react";

interface GameScore {
  id: string;
  player_score: number;
  ai_score: number;
  rounds_played: number;
  won: boolean;
  created_at: string;
  packs_used?: string[];
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, spProfile } = useAuth();
  const [games, setGames] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchGames() {
      const { data } = await supabase
        .from("game_scores")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setGames((data as any) || []);
      setLoading(false);
    }
    fetchGames();
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <User className="w-16 h-16 text-muted-foreground/30" />
        <h1 className="text-4xl font-black text-foreground">Profile</h1>
        <p className="text-muted-foreground">Sign in to view your profile.</p>
        <Button onClick={() => navigate("/sp/auth")} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold">
          Sign In
        </Button>
      </div>
    );
  }

  const totalGames = games.length;
  const wins = games.filter((g) => g.won).length;
  const losses = totalGames - wins;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const totalPoints = games.reduce((sum, g) => sum + g.player_score, 0);
  const avgScore = totalGames > 0 ? (totalPoints / totalGames).toFixed(1) : "0";

  // Win streak calculations
  let currentStreak = 0;
  for (const g of games) {
    if (g.won) currentStreak++;
    else break;
  }

  let bestStreak = 0;
  let tempStreak = 0;
  for (const g of games) {
    if (g.won) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  // Favorite pack
  const packCounts: Record<string, number> = {};
  for (const g of games) {
    const packs = (g as any).packs_used;
    if (Array.isArray(packs)) {
      for (const p of packs) {
        packCounts[p] = (packCounts[p] || 0) + 1;
      }
    }
  }
  const favoritePack = Object.entries(packCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "—";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border">
        <ExoticLogo size="sm" />
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Home
        </Button>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Profile header */}
        <motion.div className="flex items-center gap-4 mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
            <User className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground">{profile?.display_name || "Player"}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { icon: Gamepad2, label: "Games", value: totalGames, color: "text-foreground" },
            { icon: Flame, label: "Wins", value: wins, color: "text-accent" },
            { icon: TrendingUp, label: "Win Rate", value: `${winRate}%`, color: winRate >= 50 ? "text-accent" : "text-destructive" },
            { icon: Target, label: "Avg Score", value: avgScore, color: "text-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="bg-secondary rounded-lg p-4 text-center">
              <stat.icon className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Streaks & favorites */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="bg-secondary rounded-lg p-4 text-center">
            <Zap className="w-5 h-5 text-accent mx-auto mb-2" />
            <p className="text-2xl font-black text-accent">{currentStreak}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Current Streak</p>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <Trophy className="w-5 h-5 text-accent mx-auto mb-2" />
            <p className="text-2xl font-black text-foreground">{bestStreak}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Best Streak</p>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <Flame className="w-5 h-5 text-accent mx-auto mb-2" />
            <p className="text-lg font-black text-foreground capitalize">{favoritePack}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Fav Pack</p>
          </div>
        </motion.div>

        {/* Game history */}
        <h2 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" /> Recent Games
        </h2>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No games played yet.</p>
            <Button onClick={() => navigate("/play")} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold mt-4">
              Play Now
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {games.map((game, i) => (
              <motion.div
                key={game.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                  game.won ? "bg-accent/10 border border-accent/20" : "bg-secondary"
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-black ${game.won ? "text-accent" : "text-destructive"}`}>
                    {game.won ? "W" : "L"}
                  </span>
                  <div>
                    <p className="font-bold text-foreground text-sm">
                      {game.player_score} — {game.ai_score}
                    </p>
                    <p className="text-xs text-muted-foreground">{game.rounds_played} rounds</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(game.created_at).toLocaleDateString()}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
