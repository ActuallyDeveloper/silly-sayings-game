import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ExoticLogo from "@/components/ExoticLogo";
import GameCard from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      {/* Decorative cards */}
      <div className="absolute top-10 left-10 rotate-[-15deg] opacity-20 hidden md:block">
        <GameCard text="What's that smell?" type="black" small logo />
      </div>
      <div className="absolute bottom-10 right-10 rotate-[12deg] opacity-20 hidden md:block">
        <GameCard text="Poor life choices." type="white" small logo />
      </div>

      {/* Auth status */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        {user ? (
          <>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="w-4 h-4" />
              {profile?.display_name || user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/auth")}
            className="border-muted-foreground/30 text-foreground"
          >
            Sign In
          </Button>
        )}
      </div>

      <ExoticLogo />

      <motion.p
        className="text-muted-foreground text-lg md:text-xl text-center max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        A party game for horrible people.
      </motion.p>

      <motion.div
        className="flex flex-col sm:flex-row gap-4 mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          size="lg"
          className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold text-lg px-8 py-6"
          onClick={() => navigate("/play")}
        >
          Play vs AI
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="border-muted-foreground/30 text-foreground hover:bg-secondary font-bold text-lg px-8 py-6"
          onClick={() => navigate("/multiplayer")}
        >
          Multiplayer
        </Button>
      </motion.div>

      {!user && (
        <motion.p
          className="text-muted-foreground/70 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <button onClick={() => navigate("/auth")} className="text-accent hover:underline">
            Sign in
          </button>{" "}
          to save your scores
        </motion.p>
      )}

      <motion.p
        className="text-muted-foreground/50 text-sm mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Not affiliated with Cards Against Humanity.
      </motion.p>
    </div>
  );
};

export default Index;
