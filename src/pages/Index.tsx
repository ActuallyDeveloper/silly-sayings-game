import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import ExoticLogo from "@/components/ExoticLogo";
import GameCard from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings, Gamepad2, Users, Trophy, Award, Pencil, MessageCircle } from "lucide-react";
import { blackCards, whiteCards } from "@/data/cards";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.username || profile?.display_name || user?.email;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 sm:gap-8 px-4 py-8">
      {/* Decorative floating cards */}
      <div className="absolute top-10 left-10 rotate-[-15deg] opacity-20 hidden lg:block animate-float">
        <GameCard text="What's that smell?" type="black" small logo />
      </div>
      <div className="absolute bottom-10 right-10 rotate-[12deg] opacity-20 hidden lg:block animate-float-delayed">
        <GameCard text="Poor life choices." type="white" small logo />
      </div>

      {/* Auth + settings */}
      <div className="absolute top-4 right-4 flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground">
          <Settings className="w-4 h-4" />
        </Button>
        {user ? (
          <>
            <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{displayName}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => navigate("/sp/auth")}
            className="border-muted-foreground/30 text-foreground text-xs sm:text-sm">
            Sign In
          </Button>
        )}
      </div>

      <ExoticLogo />

      <motion.p className="text-muted-foreground text-base sm:text-lg md:text-xl text-center max-w-md"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        A party game for horrible people.
      </motion.p>

      {/* Main actions */}
      <motion.div className="flex flex-col w-full max-w-xs gap-3 mt-2 sm:mt-4"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Button size="lg" className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full"
          onClick={() => navigate("/play")}>
          <Gamepad2 className="w-5 h-5 mr-2" /> Play vs AI
        </Button>
        <Button size="lg" variant="outline"
          className="border-muted-foreground/30 text-foreground hover:bg-secondary font-bold text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full"
          onClick={() => navigate("/multiplayer")}>
          <Users className="w-5 h-5 mr-2" /> Multiplayer
        </Button>
      </motion.div>

      {/* Mode sections */}
      <motion.div className="w-full max-w-md grid grid-cols-2 gap-4 mt-4"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        {/* Single Player Section */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-1">
            <Gamepad2 className="w-3 h-3" /> Single Player
          </p>
          {[
            { label: "Profile", icon: User, route: "/sp/profile" },
            { label: "Leaderboard", icon: Trophy, route: "/sp/leaderboard" },
            { label: "Achievements", icon: Award, route: "/sp/achievements" },
            { label: "Custom Cards", icon: Pencil, route: "/sp/custom-cards" },
          ].map((item) => (
            <button key={item.route} onClick={() => navigate(item.route)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-sm font-bold transition-colors text-left">
              <item.icon className="w-4 h-4 text-muted-foreground" />
              {item.label}
            </button>
          ))}
          {!user && (
            <button onClick={() => navigate("/sp/auth")}
              className="w-full text-xs text-accent hover:underline text-left px-3">
              Sign in for SP →
            </button>
          )}
        </div>

        {/* Multiplayer Section */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-1">
            <Users className="w-3 h-3" /> Multiplayer
          </p>
          {[
            { label: "Profile", icon: User, route: "/mp/profile" },
            { label: "Leaderboard", icon: Trophy, route: "/mp/leaderboard" },
            { label: "Achievements", icon: Award, route: "/mp/achievements" },
            { label: "Custom Cards", icon: Pencil, route: "/mp/custom-cards" },
            { label: "Social", icon: MessageCircle, route: "/mp/social" },
          ].map((item) => (
            <button key={item.route} onClick={() => navigate(item.route)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-sm font-bold transition-colors text-left">
              <item.icon className="w-4 h-4 text-muted-foreground" />
              {item.label}
            </button>
          ))}
          {!user && (
            <button onClick={() => navigate("/mp/auth")}
              className="w-full text-xs text-accent hover:underline text-left px-3">
              Sign in for MP →
            </button>
          )}
        </div>
      </motion.div>

      {!user && (
        <motion.p className="text-muted-foreground/70 text-xs sm:text-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <button onClick={() => navigate("/sp/auth")} className="text-accent hover:underline">Sign in</button>{" "}to save your scores
        </motion.p>
      )}

      <motion.p className="text-muted-foreground/50 text-xs sm:text-sm mt-2 sm:mt-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        Not affiliated with Cards Against Humanity.
      </motion.p>
    </div>
  );
};

export default Index;
