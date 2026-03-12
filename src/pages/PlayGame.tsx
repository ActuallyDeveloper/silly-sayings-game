import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GameCard from "@/components/GameCard";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Home } from "lucide-react";
import { useEffect, useRef } from "react";

const PlayGame = () => {
  const navigate = useNavigate();
  const game = useGameState();
  const { user } = useAuth();
  const scoreSaved = useRef(false);

  // Save score when game ends
  useEffect(() => {
    if (game.phase === "gameover" && user && !scoreSaved.current) {
      scoreSaved.current = true;
      supabase.from("game_scores").insert({
        user_id: user.id,
        player_score: game.playerScore,
        ai_score: game.aiScore,
        rounds_played: game.round,
        won: game.playerScore > game.aiScore,
      });
    }
  }, [game.phase, user, game.playerScore, game.aiScore, game.round]);

  const handleReset = () => {
    scoreSaved.current = false;
    game.resetGame();
  };

  if (game.phase === "gameover") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <Trophy className="w-16 h-16 text-accent" />
        <h1 className="text-5xl font-black text-foreground">
          {game.winner === "Tie" ? "It's a Tie!" : `${game.winner} Win${game.winner === "You" ? "" : "s"}!`}
        </h1>
        <p className="text-2xl text-muted-foreground">
          {game.playerScore} — {game.aiScore}
        </p>
        {user && <p className="text-sm text-accent">Score saved!</p>}
        {!user && (
          <p className="text-sm text-muted-foreground">
            <button onClick={() => navigate("/auth")} className="text-accent hover:underline">Sign in</button> to save scores
          </p>
        )}
        <div className="flex gap-4 mt-4">
          <Button onClick={handleReset} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold">
            <RotateCcw className="w-4 h-4 mr-2" /> Play Again
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="border-muted-foreground/30">
            <Home className="w-4 h-4 mr-2" /> Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border">
        <ExoticLogo size="sm" />
        <div className="flex items-center gap-6 text-sm font-bold">
          <span className="text-foreground">You: {game.playerScore}</span>
          <span className="text-muted-foreground">AI: {game.aiScore}</span>
          <span className="text-muted-foreground/50">Round {game.round}/{game.maxRounds}</span>
        </div>
      </header>

      {/* Black card area */}
      <div className="flex justify-center py-8 px-4">
        {game.currentBlackCard && (
          <GameCard text={game.currentBlackCard.text} type="black" logo />
        )}
      </div>

      {/* Judging phase */}
      <AnimatePresence mode="wait">
        {game.phase === "judging" && (
          <motion.div
            key="judging"
            className="flex flex-col items-center gap-6 px-4 pb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">The AI is judging...</p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2 font-bold">YOUR CARD{game.selectedCards.length > 1 ? "S" : ""}</p>
                <div className="flex gap-2">
                  {game.selectedCards.map((c) => (
                    <GameCard key={c.id} text={c.text} type="white" small logo />
                  ))}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2 font-bold">AI'S CARD{game.aiCards.length > 1 ? "S" : ""}</p>
                <div className="flex gap-2">
                  {game.aiCards.map((c) => (
                    <GameCard key={c.id} text={c.text} type="white" small logo />
                  ))}
                </div>
              </div>
            </div>
            <Button
              onClick={() => game.judge(true)}
              className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold mt-2"
            >
              Reveal Winner
            </Button>
          </motion.div>
        )}

        {game.phase === "result" && (
          <motion.div
            key="result"
            className="flex flex-col items-center gap-4 px-4 pb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className={`text-3xl font-black ${game.winner === "You" ? "text-accent" : "text-destructive"}`}>
              {game.winner === "You" ? "🎉 You won this round!" : "💀 AI wins this round!"}
            </p>
            <Button
              onClick={game.nextRound}
              className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold"
            >
              Next Round →
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hand */}
      {game.phase === "playing" && (
        <div className="mt-auto border-t border-border">
          <div className="flex items-center justify-between px-4 md:px-8 py-3">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
              Pick {game.currentBlackCard?.pick || 1} card{(game.currentBlackCard?.pick || 1) > 1 ? "s" : ""}
            </p>
            <Button
              size="sm"
              disabled={game.selectedCards.length < (game.currentBlackCard?.pick || 1)}
              onClick={game.submitCards}
              className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold disabled:opacity-30"
            >
              Submit
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-6 pt-2">
            {game.hand.map((card) => (
              <GameCard
                key={card.id}
                text={card.text}
                type="white"
                small
                selected={!!game.selectedCards.find((c) => c.id === card.id)}
                onClick={() => game.selectCard(card)}
                logo
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayGame;
