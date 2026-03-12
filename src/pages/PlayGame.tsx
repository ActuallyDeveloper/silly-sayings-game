import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import GameCard from "@/components/GameCard";
import ExoticLogo from "@/components/ExoticLogo";
import Confetti from "@/components/Confetti";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Home, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { playCardSelect, playCardSubmit, playWin, playLose, playNewRound, playGameOver, setSoundEnabled } from "@/lib/sounds";

const PlayGame = () => {
  const navigate = useNavigate();
  const { maxRounds, soundEnabled, selectedPacks } = useSettings();
  const game = useGameState(maxRounds, selectedPacks);
  const { user } = useAuth();
  const scoreSaved = useRef(false);
  const cardsGenerated = useRef(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBigConfetti, setShowBigConfetti] = useState(false);

  // Sync sound setting
  useEffect(() => { setSoundEnabled(soundEnabled); }, [soundEnabled]);

  // Generate AI cards at round 5
  useEffect(() => {
    if (game.round === 5 && !cardsGenerated.current) {
      cardsGenerated.current = true;
      game.generateNewCards();
    }
  }, [game.round]);

  // Save score when game ends
  useEffect(() => {
    if (game.phase === "gameover" && user && !scoreSaved.current) {
      scoreSaved.current = true;
      playGameOver();
      setShowBigConfetti(game.playerScore > game.aiScore);
      supabase.from("game_scores").insert({
        user_id: user.id,
        player_score: game.playerScore,
        ai_score: game.aiScore,
        rounds_played: game.round,
        won: game.playerScore > game.aiScore,
      });
    } else if (game.phase === "gameover" && !scoreSaved.current) {
      playGameOver();
      setShowBigConfetti(game.playerScore > game.aiScore);
      scoreSaved.current = true;
    }
  }, [game.phase, user, game.playerScore, game.aiScore, game.round]);

  // Sound + confetti on result
  useEffect(() => {
    if (game.phase === "result") {
      if (game.winner === "You") {
        playWin();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
      } else {
        playLose();
      }
    }
  }, [game.phase, game.winner]);

  const handleSelectCard = (card: any) => {
    playCardSelect();
    game.selectCard(card);
  };

  const handleSubmit = () => {
    playCardSubmit();
    game.submitCards();
  };

  const handleNextRound = () => {
    playNewRound();
    game.nextRound();
  };

  const handleReset = () => {
    scoreSaved.current = false;
    cardsGenerated.current = false;
    setShowBigConfetti(false);
    game.resetGame();
  };

  if (game.phase === "gameover") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 sm:gap-6 px-4">
        <Confetti active={showBigConfetti} big />
        <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-accent" />
        <h1 className="text-3xl sm:text-5xl font-black text-foreground text-center">
          {game.winner === "Tie" ? "It's a Tie!" : `${game.winner} Win${game.winner === "You" ? "" : "s"}!`}
        </h1>
        <p className="text-xl sm:text-2xl text-muted-foreground">
          {game.playerScore} — {game.aiScore}
        </p>
        {user && <p className="text-sm text-accent">Score saved!</p>}
        {!user && (
          <p className="text-xs sm:text-sm text-muted-foreground">
            <button onClick={() => navigate("/auth")} className="text-accent hover:underline">Sign in</button> to save scores
          </p>
        )}
        <div className="flex gap-3 sm:gap-4 mt-4">
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
      <Confetti active={showConfetti} />

      <header className="flex items-center justify-between px-3 sm:px-4 md:px-8 py-3 sm:py-4 border-b border-border">
        <ExoticLogo size="sm" />
        <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-bold">
          <span className="text-foreground">You: {game.playerScore}</span>
          <span className="text-muted-foreground">AI: {game.aiScore}</span>
          <span className="text-muted-foreground/50">R{game.round}/{game.maxRounds}</span>
        </div>
      </header>

      <div className="flex justify-center py-4 sm:py-8 px-4">
        {game.currentBlackCard && (
          <GameCard text={game.currentBlackCard.text} type="black" logo />
        )}
      </div>

      <AnimatePresence mode="wait">
        {game.phase === "judging" && (
          <motion.div
            key="judging"
            className="flex flex-col items-center gap-4 sm:gap-6 px-4 pb-4 sm:pb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-muted-foreground font-bold text-xs sm:text-sm uppercase tracking-widest">
              {game.aiJudging ? "AI is thinking..." : "The AI is judging..."}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2 font-bold">YOUR CARD{game.selectedCards.length > 1 ? "S" : ""}</p>
                <div className="flex gap-2 justify-center">
                  {game.selectedCards.map((c) => (
                    <GameCard key={c.id} text={c.text} type="white" small logo />
                  ))}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2 font-bold">AI'S CARD{game.aiCards.length > 1 ? "S" : ""}</p>
                <div className="flex gap-2 justify-center">
                  {game.aiCards.map((c) => (
                    <GameCard key={c.id} text={c.text} type="white" small logo />
                  ))}
                </div>
              </div>
            </div>
            <Button
              onClick={game.judgeWithAI}
              disabled={game.aiJudging}
              className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold mt-2 disabled:opacity-50"
            >
              {game.aiJudging ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Judging...</> : "Reveal Winner"}
            </Button>
          </motion.div>
        )}

        {game.phase === "result" && (
          <motion.div
            key="result"
            className="flex flex-col items-center gap-3 sm:gap-4 px-4 pb-4 sm:pb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className={`text-2xl sm:text-3xl font-black ${game.winner === "You" ? "text-accent" : "text-destructive"}`}>
              {game.winner === "You" ? "🎉 You won this round!" : "💀 AI wins this round!"}
            </p>
            {game.trashTalk && (
              <motion.p
                className="text-xs sm:text-sm text-muted-foreground italic max-w-md text-center bg-secondary/50 px-4 py-2 rounded-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                "{game.trashTalk}"
              </motion.p>
            )}
            <Button
              onClick={handleNextRound}
              className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold"
            >
              Next Round →
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {game.phase === "playing" && (
        <div className="mt-auto border-t border-border">
          <div className="flex items-center justify-between px-3 sm:px-4 md:px-8 py-2 sm:py-3">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
              Pick {game.currentBlackCard?.pick || 1}
            </p>
            <Button
              size="sm"
              disabled={game.selectedCards.length < (game.currentBlackCard?.pick || 1)}
              onClick={handleSubmit}
              className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold disabled:opacity-30"
            >
              Submit
            </Button>
          </div>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto px-3 sm:px-4 md:px-8 pb-4 sm:pb-6 pt-2">
            {game.hand.map((card) => (
              <GameCard
                key={card.id}
                text={card.text}
                type="white"
                small
                selected={!!game.selectedCards.find((c) => c.id === card.id)}
                onClick={() => handleSelectCard(card)}
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
