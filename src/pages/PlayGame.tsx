import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import GameCard from "@/components/GameCard";
import ExoticLogo from "@/components/ExoticLogo";
import PackSelector from "@/components/PackSelector";
import Confetti from "@/components/Confetti";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Home, Loader2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { playCardSelect, playCardSubmit, playWin, playLose, playNewRound, playGameOver, setSoundEnabled } from "@/lib/sounds";
import type { PackId } from "@/data/cards";

const PlayGame = () => {
  const navigate = useNavigate();
  const { maxRounds, soundEnabled, selectedPacks, togglePack } = useSettings();
  const [gameStarted, setGameStarted] = useState(false);
  const [localPacks, setLocalPacks] = useState<PackId[]>(selectedPacks);
  const game = useGameState(maxRounds, localPacks);
  const { user } = useAuth();
  const scoreSaved = useRef(false);
  const cardsGenerated = useRef(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBigConfetti, setShowBigConfetti] = useState(false);

  useEffect(() => { setSoundEnabled(soundEnabled); }, [soundEnabled]);

  useEffect(() => {
    if (game.round === 5 && !cardsGenerated.current) {
      cardsGenerated.current = true;
      game.generateNewCards();
    }
  }, [game.round]);

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
    setGameStarted(false);
    game.resetGame();
  };

  const handleLocalTogglePack = (packId: PackId) => {
    setLocalPacks((prev) => {
      if (prev.includes(packId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((p) => p !== packId);
      }
      return [...prev, packId];
    });
  };

  // Pre-game pack selection screen
  if (!gameStarted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <ExoticLogo size="sm" />
        <h2 className="text-2xl sm:text-3xl font-black text-foreground">Play vs AI</h2>
        <p className="text-muted-foreground text-sm text-center">Choose your card packs before starting</p>

        <PackSelector selectedPacks={localPacks} onTogglePack={handleLocalTogglePack} />

        <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
          <Button
            onClick={() => { setGameStarted(true); game.resetGame(); }}
            disabled={localPacks.length === 0}
            className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold text-lg py-6 disabled:opacity-30"
          >
            <Play className="w-5 h-5 mr-2" /> Start Game
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
            ← Back Home
          </Button>
        </div>
      </div>
    );
  }

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

      <AnimatePresence mode="wait">
        {/* Choose between 2 black cards */}
        {game.phase === "choosing_black" && (
          <motion.div
            key="choosing"
            className="flex flex-col items-center gap-4 sm:gap-6 py-8 sm:py-12 px-4 flex-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-muted-foreground font-bold text-xs sm:text-sm uppercase tracking-widest">
              Choose a black card
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {game.blackCardChoices.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, rotateY: 180, scale: 0.8 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  transition={{ delay: i * 0.2, duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
                  style={{ perspective: 1000 }}
                >
                  <GameCard
                    text={card.text}
                    type="black"
                    logo
                    onClick={() => {
                      playCardSelect();
                      game.chooseBlackCard(card);
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Playing phase - show selected black card + hand */}
        {game.phase === "playing" && (
          <motion.div
            key="playing"
            className="flex flex-col flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex justify-center py-4 sm:py-8 px-4">
              {game.currentBlackCard && (
                <motion.div
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  style={{ perspective: 1000 }}
                >
                  <GameCard text={game.currentBlackCard.text} type="black" logo />
                </motion.div>
              )}
            </div>

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
                {game.hand.map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 40, rotateZ: -5 }}
                    animate={{ opacity: 1, y: 0, rotateZ: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <GameCard
                      text={card.text}
                      type="white"
                      small
                      selected={!!game.selectedCards.find((c) => c.id === card.id)}
                      onClick={() => handleSelectCard(card)}
                      logo
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {game.phase === "judging" && (
          <motion.div
            key="judging"
            className="flex flex-col items-center gap-4 sm:gap-6 px-4 pb-4 sm:pb-6 py-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex justify-center mb-4">
              {game.currentBlackCard && <GameCard text={game.currentBlackCard.text} type="black" logo />}
            </div>
            <p className="text-muted-foreground font-bold text-xs sm:text-sm uppercase tracking-widest">
              {game.aiJudging ? "AI is thinking..." : "The AI is judging..."}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2 font-bold">YOUR CARD{game.selectedCards.length > 1 ? "S" : ""}</p>
                <div className="flex gap-2 justify-center">
                  {game.selectedCards.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ rotateY: 180, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ delay: i * 0.15, duration: 0.5, type: "spring" }}
                      style={{ perspective: 1000 }}
                    >
                      <GameCard text={c.text} type="white" small logo />
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2 font-bold">AI'S CARD{game.aiCards.length > 1 ? "S" : ""}</p>
                <div className="flex gap-2 justify-center">
                  {game.aiCards.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ rotateY: 180, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.15, duration: 0.5, type: "spring" }}
                      style={{ perspective: 1000 }}
                    >
                      <GameCard text={c.text} type="white" small logo />
                    </motion.div>
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
            className="flex flex-col items-center gap-3 sm:gap-4 px-4 pb-4 sm:pb-6 py-6"
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
    </div>
  );
};

export default PlayGame;
