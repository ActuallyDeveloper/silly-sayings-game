import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Gamepad2, EyeOff } from "lucide-react";
import StatusIndicator from "@/components/StatusIndicator";
import { useUserStatus } from "@/hooks/useUserStatus";

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
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const isSP = mode === "singleplayer";
  const viewName = isSP ? "sp_leaderboard" : "mp_leaderboard";

  const fetchEntries = useCallback(async () => {
    const { data } = await (supabase as any)
      .from(viewName)
      .select("*")
      .order("wins", { ascending: false })
      .limit(50);

    if (!data) { setEntries([]); setLoading(false); return; }

    // For multiplayer, filter out users with private profiles (unless they're friends or the current user)
    if (!isSP) {
      const userIds = data.map((e: any) => e.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: privacyData } = await (supabase as any)
          .from("user_privacy_settings")
          .select("user_id, profile_visibility")
          .in("user_id", userIds);

        // Get current user's friends
        let friendIds: string[] = [];
        if (user) {
          const { data: friendships } = await (supabase as any)
            .from("friendships")
            .select("requester_id, addressee_id")
            .eq("status", "accepted")
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
          if (friendships) {
            friendIds = friendships.map((f: any) =>
              f.requester_id === user.id ? f.addressee_id : f.requester_id
            );
          }
        }

        const privacyMap = new Map(
          (privacyData || []).map((p: any) => [p.user_id, p.profile_visibility])
        );

        const filtered = data.filter((entry: any) => {
          if (entry.user_id === user?.id) return true; // Always show self
          const visibility = privacyMap.get(entry.user_id) || "public";
          if (visibility === "private") return false;
          if (visibility === "friends") return friendIds.includes(entry.user_id);
          return true; // public
        });

        setEntries(filtered);
        setLoading(false);
        return;
      }
    }

    setEntries(data || []);
    setLoading(false);
  }, [viewName, isSP, user]);

  useEffect(() => {
    fetchEntries();

    const channel = supabase
      .channel(`leaderboard-${mode}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_scores" }, () => {
        fetchEntries();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [viewName, fetchEntries]);

  const medals = ["#1", "#2", "#3"];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border">
        <ExoticLogo size="sm" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">{isSP ? "Single Player" : "Multiplayer"}</span>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground min-h-[44px]">
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 sm:py-8">
        <motion.div className="flex items-center gap-3 mb-6 sm:mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
          <h1 className="text-3xl sm:text-4xl font-black text-foreground">{isSP ? "SP" : "MP"} Leaderboard</h1>
        </motion.div>

        {!isSP && (
          <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
            <EyeOff className="w-3.5 h-3.5" />
            <span>Players with private profiles are hidden from the leaderboard.</span>
          </div>
        )}

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
                className={`rounded-lg ${i < 3 ? "bg-accent/10 border border-accent/20" : "bg-secondary"} active:scale-[0.98] transition-transform`}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-center justify-between px-3 sm:px-4 py-3 min-h-[52px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-lg font-black shrink-0 ${i < 3 ? "text-accent" : "text-muted-foreground"}`}>
                      {i < 3 ? medals[i] : `#${i + 1}`}
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