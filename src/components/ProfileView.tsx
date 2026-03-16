import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Trophy, Flame, Target, Gamepad2, Calendar, TrendingUp, User, Zap, Award, Save, Camera, Loader2 } from "lucide-react";

interface GameScore {
  id: string;
  player_score: number;
  ai_score: number;
  rounds_played: number;
  won: boolean;
  created_at: string;
  packs_used?: string[];
  mode?: string;
}

interface ProfileViewProps {
  mode: "singleplayer" | "multiplayer";
}

const ProfileView = ({ mode }: ProfileViewProps) => {
  const navigate = useNavigate();
  const { user, getModeProfile, fetchModeProfile, ensureMode } = useAuth();
  const [games, setGames] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSP = mode === "singleplayer";
  const authRoute = isSP ? "/sp/auth" : "/mp/auth";
  const modeProfile = getModeProfile(mode);
  const profileTable = isSP ? "sp_profiles" : "mp_profiles";

  useEffect(() => {
    ensureMode(mode).then((canProceed) => {
      if (!canProceed) navigate(authRoute);
    });
  }, [mode]);

  const fetchGames = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("game_scores")
      .select("*")
      .eq("user_id", user.id)
      .eq("mode", mode)
      .order("created_at", { ascending: false })
      .limit(50);
    setGames(data || []);
    setLoading(false);
  }, [user, mode]);

  useEffect(() => {
    fetchGames();
    if (!user) return;
    
    // Real-time stats: listen for new scores
    const channel = supabase
      .channel(`profile-scores-${mode}-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "game_scores",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newScore = payload.new as any;
        if (newScore.mode === mode) {
          setGames(prev => [newScore, ...prev]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, mode, fetchGames]);

  useEffect(() => {
    if (modeProfile) {
      setEditName(modeProfile.display_name || "");
      setEditUsername(modeProfile.username || "");
    }
  }, [modeProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const prefix = isSP ? "sp" : "mp";
    const filePath = `${user.id}/${prefix}-avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = `${publicUrl}?t=${Date.now()}`;
    await (supabase as any)
      .from(profileTable)
      .update({ avatar_url: avatarUrl })
      .eq("user_id", user.id);

    await fetchModeProfile(user.id, mode);
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await (supabase as any)
      .from(profileTable)
      .update({ display_name: editName, username: editUsername })
      .eq("user_id", user.id);
    await fetchModeProfile(user.id, mode);
    setEditing(false);
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <User className="w-16 h-16 text-muted-foreground/30" />
        <h1 className="text-4xl font-black text-foreground">{isSP ? "SP" : "MP"} Profile</h1>
        <p className="text-muted-foreground">Sign in to view your profile.</p>
        <Button onClick={() => navigate(authRoute)} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold min-h-[44px] active:scale-95 transition-transform">Sign In</Button>
      </div>
    );
  }

  const totalGames = games.length;
  const wins = games.filter((g) => g.won).length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const totalPoints = games.reduce((sum, g) => sum + g.player_score, 0);
  const avgScore = totalGames > 0 ? (totalPoints / totalGames).toFixed(1) : "0";

  let currentStreak = 0;
  for (const g of games) { if (g.won) currentStreak++; else break; }
  let bestStreak = 0, tempStreak = 0;
  for (const g of games) { if (g.won) { tempStreak++; if (tempStreak > bestStreak) bestStreak = tempStreak; } else tempStreak = 0; }

  const packCounts: Record<string, number> = {};
  for (const g of games) { if (Array.isArray((g as any).packs_used)) { for (const p of (g as any).packs_used) { packCounts[p] = (packCounts[p] || 0) + 1; } } }
  const favoritePack = Object.entries(packCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "—";

  const displayName = modeProfile?.username || modeProfile?.display_name || "Player";

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
        <motion.div className="flex items-center gap-4 mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative group">
            <Avatar className="w-16 h-16 border-2 border-accent/30">
              <AvatarImage src={modeProfile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-accent/20 text-accent text-lg font-black">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-accent" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Display Name"
                  className="bg-secondary border-border text-foreground h-10" />
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username"
                  className="bg-secondary border-border text-foreground h-10" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveProfile} disabled={saving}
                    className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold">
                    <Save className="w-3 h-3 mr-1" /> {saving ? "..." : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground">{displayName}</h1>
                <p className="text-sm text-muted-foreground">@{modeProfile?.username || "player"} · {isSP ? "SP" : "MP"}</p>
                <button onClick={() => setEditing(true)} className="text-xs text-accent hover:underline mt-1">Edit Profile</button>
              </>
            )}
          </div>
        </motion.div>

        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {[
            { icon: Gamepad2, label: "Games", value: totalGames, color: "text-foreground" },
            { icon: Flame, label: "Wins", value: wins, color: "text-accent" },
            { icon: TrendingUp, label: "Win Rate", value: `${winRate}%`, color: winRate >= 50 ? "text-accent" : "text-destructive" },
            { icon: Target, label: "Avg Score", value: avgScore, color: "text-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="bg-secondary rounded-lg p-4 text-center active:scale-95 transition-transform">
              <stat.icon className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div className="grid grid-cols-3 gap-3 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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

        <div className="flex gap-2 mb-6">
          <Button size="sm" onClick={() => navigate(isSP ? "/sp/achievements" : "/mp/achievements")} variant="outline" className="border-accent/30 text-accent min-h-[44px] active:scale-95 transition-transform">
            <Award className="w-4 h-4 mr-1" /> Achievements
          </Button>
          <Button size="sm" onClick={() => navigate(isSP ? "/sp/leaderboard" : "/mp/leaderboard")} variant="outline" className="border-muted-foreground/30 min-h-[44px] active:scale-95 transition-transform">
            <Trophy className="w-4 h-4 mr-1" /> Leaderboard
          </Button>
        </div>

        <h2 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" /> Recent Games
        </h2>

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : games.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No games played yet.</p>
            <Button onClick={() => navigate(isSP ? "/play" : "/multiplayer")} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold mt-4 min-h-[44px] active:scale-95 transition-transform">Play Now</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {games.map((game, i) => (
              <motion.div key={game.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg min-h-[52px] active:scale-[0.98] transition-transform ${game.won ? "bg-accent/10 border border-accent/20" : "bg-secondary"}`}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-black ${game.won ? "text-accent" : "text-destructive"}`}>{game.won ? "W" : "L"}</span>
                  <div>
                    <p className="font-bold text-foreground text-sm">{game.player_score} — {game.ai_score}</p>
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

export default ProfileView;
