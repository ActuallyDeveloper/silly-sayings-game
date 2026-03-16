import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGameState, type CustomCardsInput } from "@/hooks/useGameState";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import GameCard from "@/components/GameCard";
import ExoticLogo from "@/components/ExoticLogo";
import PackSelector from "@/components/PackSelector";
import GameConfig from "@/components/GameConfig";
import PhaseTimer from "@/components/PhaseTimer";
import Confetti from "@/components/Confetti";
import GameChat from "@/components/GameChat";
import AIIcon from "@/components/AIIcon";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, Home, Loader2, Play, User, LogIn, Crown, Skull } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  playCardSelect, playCardSubmit, playWin, playLose, playNewRound, playGameOver, setSoundEnabled,
} from "@/lib/sounds";
import type { PackId, BlackCard, WhiteCard } from "@/data/cards";

const TIMER_BLACK = 15;
const TIMER_PLAY = 45;

const PlayGame = () => {
  const navigate = useNavigate();
  const { soundEnabled, selectedPacks } = useSettings();
  const [gameStarted, setGameStarted] = useState(false);
  const [localPacks, setLocalPacks] = useState<PackId[]>(selectedPacks);
  const [localAiCount, setLocalAiCount] = useState(3);
  const [localRounds, setLocalRounds] = useState(10);
  const [localPoints, setLocalPoints] = useState(10);
  const [customCards, setCustomCards] = useState<CustomCardsInput | undefined>();

  const game = useGameState(localRounds, localPacks, localAiCount, localPoints, customCards);
  const { user, spProfile: profile, loading: authLoading } = useAuth();
  const scoreSaved = useRef(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBigConfetti, setShowBigConfetti] = useState(false);

  const { ensureMode, setActiveMode } = useAuth();

  useEffect(() => {
    ensureMode("singleplayer").then((canProceed) => {
      if (!canProceed) navigate("/sp/auth");
    });
  }, []);

  useEffect(() => {
    if (!user || !localPacks.includes("custom")) { setCustomCards(undefined); return; }
    (async () => {
      const { data } = await (supabase as any).from("custom_cards").select("*").eq("user_id", user.id).eq("mode", "singleplayer");
      if (data && data.length > 0) {
        const maxId = 10000;
        const blacks: BlackCard[] = data.filter((c: any) => c.card_type === "black").map((c: any, i: number) => ({ id: maxId + i, text: c.text, pick: c.pick || 1, pack: "custom" as const }));
        const whites: WhiteCard[] = data.filter((c: any) => c.card_type === "white").map((c: any, i: number) => ({ id: maxId + 500 + i, text: c.text, pack: "custom" as const }));
        setCustomCards({ blacks, whites });
      } else setCustomCards({ blacks: [], whites: [] });
    })();
  }, [user, localPacks]);

  useEffect(() => { setSoundEnabled(soundEnabled); }, [soundEnabled]);

  // Auto-pick black card when AI is czar
  useEffect(() => {
    if (game.phase === "choosing_black" && game.isAICzar && gameStarted) {
      const timeout = setTimeout(() => {
        game.aiCzarPickBlack();
      }, 1500 + Math.random() * 1000);
      return () => clearTimeout(timeout);
    }
  }, [game.phase, game.isAICzar, gameStarted]);

  // Auto-judge when AI is czar
  useEffect(() => {
    if (game.phase === "judging" && game.isAICzar && !game.aiPickingCards && !game.aiJudging && game.aiSubmissions.length > 0) {
      const timeout = setTimeout(() => {
        game.judgeWithAI();
      }, 2000 + Math.random() * 1500);
      return () => clearTimeout(timeout);
    }
  }, [game.phase, game.isAICzar, game.aiPickingCards, game.aiJudging, game.aiSubmissions.length]);

  useEffect(() => {
    if (game.phase === "gameover" && !scoreSaved.current) {
      scoreSaved.current = true;
      playGameOver();
      setShowBigConfetti(game.winner === "You");
      if (user) {
        (supabase as any).from("game_scores").insert({
          user_id: user.id, player_score: game.playerScore,
          ai_score: Math.max(...game.aiPlayers.map((a) => a.score), 0),
          rounds_played: game.round, won: game.winner === "You",
          packs_used: localPacks, mode: "singleplayer",
        });
      }
    }
  }, [game.phase, user]);

  useEffect(() => {
    if (game.phase === "result") {
      if (game.winner === "You") { playWin(); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 2500); }
      else playLose();
    }
  }, [game.phase, game.winner]);

  const handleSelectCard = (card: any) => { playCardSelect(); game.selectCard(card); };
  const handleSubmit = useCallback(() => { playCardSubmit(); game.submitCards(); }, [game.submitCards]);
  const handleNextRound = () => { playNewRound(); game.nextRound(); };

  const handleReset = () => { scoreSaved.current = false; setShowBigConfetti(false); setGameStarted(false); game.resetGame(); };

  const handleLocalTogglePack = (packId: PackId) => {
    setLocalPacks((prev) => {
      if (prev.includes(packId)) { if (prev.length <= 1) return prev; return prev.filter((p) => p !== packId); }
      return [...prev, packId];
    });
  };

  const handleBlackTimerExpire = useCallback(() => {
    if (game.phase === "choosing_black" && game.blackCardChoices.length > 0 && game.isCzar) {
      playCardSelect(); game.chooseBlackCard(game.blackCardChoices[0]);
    }
  }, [game.phase, game.blackCardChoices, game.chooseBlackCard, game.isCzar]);

  const handlePlayTimerExpire = useCallback(() => {
    if (game.phase === "playing" && game.currentBlackCard && !game.isCzar) {
      const pick = game.currentBlackCard.pick;
      if (game.selectedCards.length >= pick) handleSubmit();
      else {
        const needed = pick - game.selectedCards.length;
        const available = game.hand.filter((c) => !game.selectedCards.find((s) => s.id === c.id));
        for (let i = 0; i < needed && i < available.length; i++) game.selectCard(available[i]);
        setTimeout(() => { playCardSubmit(); game.submitCards(); }, 300);
      }
    }
  }, [game.phase, game.currentBlackCard, game.selectedCards, game.hand, game.selectCard, game.submitCards, handleSubmit, game.isCzar]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <ExoticLogo />
        <LogIn className="w-12 h-12 text-muted-foreground/40" />
        <h2 className="text-2xl font-black text-foreground">Sign In to Play</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          You need an account to play single player. Your scores and achievements will be saved.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/sp/auth")} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold">
            <LogIn className="w-4 h-4 mr-2" /> Sign In
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="border-muted-foreground/30">
            Back Home
          </Button>
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 sm:gap-6 px-4 py-6">
        <ExoticLogo size="sm" />
        <h2 className="text-2xl sm:text-3xl font-black text-foreground">Play vs AI</h2>
        <p className="text-muted-foreground text-sm text-center">Configure your game</p>
        <PackSelector selectedPacks={localPacks} onTogglePack={handleLocalTogglePack} />
        <GameConfig aiPlayerCount={localAiCount} onAiPlayerCountChange={setLocalAiCount}
          rounds={localRounds} onRoundsChange={setLocalRounds}
          pointsToWin={localPoints} onPointsToWinChange={setLocalPoints} minAi={2} maxAi={7} />
        <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
          <Button onClick={() => { setGameStarted(true); game.resetGame(); }}
            disabled={localPacks.length === 0}
            className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold text-lg py-6 disabled:opacity-30">
            <Play className="w-5 h-5 mr-2" /> Start Game
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">Back Home</Button>
        </div>
      </div>
    );
  }

  // Game over
  if (game.phase === "gameover") {
    const allScores = [
      { name: "You", score: game.playerScore, icon: "user" },
      ...game.aiPlayers.map((ai) => ({ name: ai.name, score: ai.score, icon: ai.icon })),
    ].sort((a, b) => b.score - a.score);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 sm:gap-6 px-4">
        <Confetti active={showBigConfetti} big />
        <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-accent" />
        <h1 className="text-3xl sm:text-5xl font-black text-foreground text-center">
          {game.winner === "Tie" ? "It's a Tie!" : `${game.winner} Win${game.winner === "You" ? "" : "s"}!`}
        </h1>
        <div className="w-full max-w-sm space-y-2">
          {allScores.map((s, i) => (
            <div key={s.name} className={`flex items-center justify-between px-4 py-2 rounded-lg ${i === 0 ? "bg-accent/10 border border-accent/20" : "bg-secondary"}`}>
              <div className="flex items-center gap-2">
                <span className={`font-black text-lg ${i === 0 ? "text-accent" : "text-muted-foreground"}`}>#{i + 1}</span>
                <AIIcon icon={s.icon} size={16} animated={false} />
                <span className="font-bold text-foreground text-sm">{s.name}</span>
              </div>
              <span className="font-black text-foreground">{s.score}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-accent">Score saved!</p>
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

  // Scoreboard
  const allScores = [
    { name: "You", score: game.playerScore, icon: "user", isCzar: game.czarId === -1 },
    ...game.aiPlayers.map((ai) => ({ name: ai.name, score: ai.score, icon: ai.icon, isCzar: game.czarId === ai.id })),
  ];

  const czarAI = game.isAICzar ? game.aiPlayers.find(ai => ai.id === game.czarId) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Confetti active={showConfetti} />

      <header className="flex items-center justify-between px-3 sm:px-4 md:px-8 py-2 sm:py-3 border-b border-border">
        <ExoticLogo size="sm" />
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-bold">
          <span className="text-muted-foreground/50">R{game.round}/{game.maxRounds}</span>
          <span className="text-muted-foreground/50">First to {game.pointsToWin}</span>
        </div>
      </header>

      {/* Czar indicator */}
      <div className="flex items-center justify-center gap-2 py-1.5 bg-accent/5 border-b border-border">
        <Crown className="w-3 h-3 text-accent" />
        <span className="text-xs font-bold text-accent">
          {game.isCzar ? "You are the Czar!" : `${game.czarName} is the Czar`}
        </span>
      </div>

      {/* Scoreboard bar */}
      <div className="flex gap-2 px-3 sm:px-4 md:px-8 py-1.5 overflow-x-auto border-b border-border">
        {allScores.map((s) => (
          <div key={s.name} className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold shrink-0 ${s.isCzar ? "bg-accent text-accent-foreground" : s.name === "You" ? "bg-primary/10 text-foreground" : "bg-secondary text-foreground"}`}>
            {s.isCzar && <Crown className="w-3 h-3" />}
            <AIIcon icon={s.icon} size={12} animated={false} />
            <span>{s.name}</span>
            <span className="opacity-60">{s.score}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {game.phase === "choosing_black" && (
          <motion.div key="choosing" className="flex flex-col items-center gap-4 sm:gap-6 py-6 sm:py-10 px-4 flex-1"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {game.isCzar ? (
              <>
                <PhaseTimer duration={TIMER_BLACK} onExpire={handleBlackTimerExpire} active={game.phase === "choosing_black"} phaseKey={`black-${game.round}`} />
                <p className="text-muted-foreground font-bold text-xs sm:text-sm uppercase tracking-widest">You are Czar — Choose a black card</p>
                <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
                  {game.blackCardChoices.map((card, i) => (
                    <motion.div key={card.id}
                      initial={{ opacity: 0, rotateY: 180, scale: 0.8 }} animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                      transition={{ delay: i * 0.2, duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
                      style={{ perspective: 1000 }}>
                      <GameCard text={card.text} type="black" logo onClick={() => { playCardSelect(); game.chooseBlackCard(card); }} />
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                <p className="text-muted-foreground font-bold text-xs sm:text-sm uppercase tracking-widest">
                  {czarAI && <AIIcon icon={czarAI.icon} size={14} color={czarAI.color} animated />}
                  {game.czarName} is choosing a black card...
                </p>
              </div>
            )}
          </motion.div>
        )}

        {game.phase === "playing" && (
          <motion.div key="playing" className="flex flex-col flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!game.isCzar && (
              <div className="px-4 pt-3">
                <PhaseTimer duration={TIMER_PLAY} onExpire={handlePlayTimerExpire} active={game.phase === "playing"} phaseKey={`play-${game.round}`} />
              </div>
            )}
            <div className="flex justify-center py-3 sm:py-6 px-4">
              {game.currentBlackCard && (
                <motion.div initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.5, type: "spring" }} style={{ perspective: 1000 }}>
                  <GameCard text={game.currentBlackCard.text} type="black" logo />
                </motion.div>
              )}
            </div>
            {game.isCzar ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Crown className="w-6 h-6 text-accent" />
                <p className="text-accent font-bold text-xs sm:text-sm uppercase tracking-widest">
                  You are the Czar — waiting for players to submit...
                </p>
              </div>
            ) : (
              <div className="mt-auto border-t border-border">
                <div className="flex items-center justify-between px-3 sm:px-4 md:px-8 py-2 sm:py-3">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Pick {game.currentBlackCard?.pick || 1}</p>
                  <Button size="sm" disabled={game.selectedCards.length < (game.currentBlackCard?.pick || 1)}
                    onClick={handleSubmit} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold disabled:opacity-30">
                    Submit
                  </Button>
                </div>
                <div className="flex gap-2 sm:gap-3 overflow-x-auto px-3 sm:px-4 md:px-8 pb-3 sm:pb-5 pt-1">
                  {game.hand.map((card, i) => (
                    <motion.div key={card.id} initial={{ opacity: 0, y: 40, rotateZ: -5 }}
                      animate={{ opacity: 1, y: 0, rotateZ: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}>
                      <GameCard text={card.text} type="white" small
                        selected={!!game.selectedCards.find((c) => c.id === card.id)}
                        onClick={() => handleSelectCard(card)} logo />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {game.phase === "judging" && (
          <motion.div key="judging" className="flex flex-col items-center gap-4 sm:gap-6 px-4 pb-4 sm:pb-6 py-6"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex justify-center mb-2">
              {game.currentBlackCard && <GameCard text={game.currentBlackCard.text} type="black" logo />}
            </div>
            {game.aiPickingCards ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                <p className="text-muted-foreground font-bold text-xs sm:text-sm uppercase tracking-widest">Players are choosing...</p>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground font-bold text-xs sm:text-sm uppercase tracking-widest">
                  {game.aiJudging ? `${game.czarName} is judging...` : "All cards are in!"}
                </p>
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-3xl">
                  {/* Show player's cards only if they submitted (not czar) */}
                  {game.czarId !== -1 && (
                    <div className="text-center">
                      <p className="text-[10px] sm:text-xs text-accent mb-1 font-bold flex items-center justify-center gap-1">
                        <User className="w-3 h-3" /> YOU
                      </p>
                      <div className="flex gap-1">
                        {game.selectedCards.map((c, i) => (
                          <motion.div key={c.id} initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
                            transition={{ delay: i * 0.1, duration: 0.5, type: "spring" }} style={{ perspective: 1000 }}>
                            <GameCard text={c.text} type="white" small logo />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                  {game.aiSubmissions.map((sub, subIdx) => {
                    const aiPlayer = game.aiPlayers.find((a) => a.id === sub.playerId);
                    return (
                      <div key={sub.playerId} className="text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-bold flex items-center justify-center gap-1">
                          {aiPlayer && <AIIcon icon={aiPlayer.icon} size={12} color={aiPlayer.color} animated={false} />}
                          {sub.playerName.toUpperCase()}
                        </p>
                        <div className="flex gap-1">
                          {sub.cards.map((c, i) => (
                            <motion.div key={c.id} initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
                              transition={{ delay: 0.3 + subIdx * 0.2 + i * 0.1, duration: 0.5, type: "spring" }}
                              style={{ perspective: 1000 }}>
                              <GameCard text={c.text} type="white" small logo />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* When player is czar, they pick the winner from the submissions */}
                {game.isCzar && !game.aiPickingCards && game.aiSubmissions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-accent font-bold text-xs uppercase tracking-widest mb-3">You are Czar — Pick the funniest!</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {game.aiSubmissions.map((sub) => {
                        const aiPlayer = game.aiPlayers.find((a) => a.id === sub.playerId);
                        return (
                          <motion.div key={sub.playerId}
                            className="text-center cursor-pointer hover:ring-2 hover:ring-accent rounded-lg p-2"
                            whileHover={{ scale: 1.05 }}
                            onClick={() => game.pickWinnerManual(sub.playerName)}>
                            <p className="text-[10px] text-muted-foreground mb-1 font-bold flex items-center justify-center gap-1">
                              {aiPlayer && <AIIcon icon={aiPlayer.icon} size={12} color={aiPlayer.color} animated={false} />}
                              {sub.playerName}
                            </p>
                            <div className="flex gap-1">
                              {sub.cards.map((c, i) => (
                                <GameCard key={c.id} text={c.text} type="white" small logo />
                              ))}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {game.isAICzar && !game.aiJudging && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold">{game.czarName} is picking the winner...</span>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {game.phase === "result" && (
          <motion.div key="result" className="flex flex-col items-center gap-3 sm:gap-4 px-4 pb-4 sm:pb-6 py-6"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2">
              {game.winner === "You" ? <Crown className="w-6 h-6 text-accent" /> : <Skull className="w-6 h-6 text-destructive" />}
              <p className={`text-2xl sm:text-3xl font-black ${game.winner === "You" ? "text-accent" : "text-destructive"}`}>
                {game.winner === "You" ? "You won this round!" : `${game.winner} wins this round!`}
              </p>
            </div>
            {game.trashTalk && (
              <motion.p className="text-xs sm:text-sm text-muted-foreground italic max-w-md text-center bg-secondary/50 px-4 py-2 rounded-lg"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                "{game.trashTalk}"
              </motion.p>
            )}
            <Button onClick={handleNextRound} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold">
              Next Round
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Chat with AI - NO media features for singleplayer */}
      {gameStarted && (
        <GameChat
          aiPlayers={game.aiPlayers.map((a) => a.personality)}
          gamePhase={game.phase}
          roundNumber={game.round}
          playerName={profile?.username || profile?.display_name || "You"}
          gameContext={{
            phase: game.phase,
            round: game.round,
            scores: [
              { name: profile?.username || "You", score: game.playerScore },
              ...game.aiPlayers.map(a => ({ name: a.name, score: a.score })),
            ],
            lastBlackCard: game.currentBlackCard?.text,
            lastWinner: game.winner || undefined,
          }}
        />
      )}
    </div>
  );
};

export default PlayGame;
