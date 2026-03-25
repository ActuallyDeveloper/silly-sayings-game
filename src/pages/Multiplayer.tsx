import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import GameCard from "@/components/GameCard";
import GameConfig from "@/components/GameConfig";
import ExoticLogo from "@/components/ExoticLogo";
import RoomChat from "@/components/RoomChat";
import PackSelector from "@/components/PackSelector";
import PhaseTimer from "@/components/PhaseTimer";
import LobbyCountdown from "@/components/LobbyCountdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { whiteCards } from "@/data/cards";
import { getAIPersonalities } from "@/data/aiPersonalities";
import { Users, Copy, ArrowLeft, Crown, Trophy, RotateCcw, Home, Check, Bot, CheckCircle2, Circle } from "lucide-react";
import StatusIndicator from "@/components/StatusIndicator";
import WinnerReveal from "@/components/WinnerReveal";
import { useUserStatus } from "@/hooks/useUserStatus";
import type { WhiteCard, PackId } from "@/data/cards";
import { showAchievementToast } from "@/components/AchievementToast";

const Multiplayer = () => {
  const navigate = useNavigate();
  const { user, ensureMode } = useAuth();

  useEffect(() => {
    ensureMode("multiplayer").then((canProceed) => {
      if (!canProceed) navigate("/mp/auth");
    });
  }, []);
  const game = useMultiplayerGame();
  const { getStatus } = useUserStatus();
  const { selectedPacks, judgingTimer } = useSettings();
  const [joinCode, setJoinCode] = useState("");
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  const [lobbyPacks, setLobbyPacks] = useState<PackId[]>(selectedPacks);
  const [enableAiBots, setEnableAiBots] = useState(false);
  const [aiCount, setAiCount] = useState(1);
  const [lobbyPoints, setLobbyPoints] = useState(10);
  const [useAiCards, setUseAiCards] = useState(false);
  const mpAchChecked = useRef(false);
  const countdownHandledRef = useRef<string | null>(null);

  // Check MP achievements when game ends
  const checkMPAchievements = useCallback(async () => {
    if (!user || mpAchChecked.current) return;
    mpAchChecked.current = true;
    const [{ data: achData }, { data: earnedData }, { data: scores }] = await Promise.all([
      (supabase as any).from("achievements").select("*").or("mode.eq.multiplayer,mode.eq.both"),
      (supabase as any).from("user_achievements").select("*").eq("user_id", user.id).eq("mode", "multiplayer"),
      (supabase as any).from("game_scores").select("*").eq("user_id", user.id).eq("mode", "multiplayer").order("created_at", { ascending: false }),
    ]);
    if (!achData || !scores) return;
    const earnedIds = new Set((earnedData || []).map((e: any) => e.achievement_id));
    const totalGames = scores.length;
    const wins = scores.filter((s: any) => s.won).length;
    const totalPoints = scores.reduce((sum: number, s: any) => sum + s.player_score, 0);
    const newAchs: string[] = [];
    for (const ach of achData) {
      if (earnedIds.has(ach.id)) continue;
      let met = false;
      if (ach.requirement_type === "wins") met = wins >= ach.requirement_value;
      else if (ach.requirement_type === "games_played" || ach.requirement_type === "games") met = totalGames >= ach.requirement_value;
      else if (ach.requirement_type === "total_points" || ach.requirement_type === "points") met = totalPoints >= ach.requirement_value;
      if (met) newAchs.push(ach.id);
    }
    if (newAchs.length > 0) {
      await (supabase as any).from("user_achievements").insert(newAchs.map((aid) => ({ user_id: user.id, achievement_id: aid, mode: "multiplayer" })));
      for (const aid of newAchs) {
        const ach = achData.find((a: any) => a.id === aid);
        if (ach) showAchievementToast(ach.title, ach.tier);
      }
    }
  }, [user]);

  useEffect(() => {
    if (game.phase === "game_over") checkMPAchievements();
  }, [game.phase, checkMPAchievements]);

  const playerCount = game.players.length;
  const minAi = playerCount <= 2 ? 1 : 0;
  const maxAi = playerCount <= 2 ? 6 : 5;
  const aiRequired = playerCount <= 2;
  const projectedAiCount = (aiRequired || enableAiBots) ? Math.max(aiCount, minAi) : 0;
  const readyToStart = game.allReady && game.players.length >= 2 && game.players.length + projectedAiCount >= 3;

  const countdownActive = game.countdownStarted;

  useEffect(() => {
    if (game.room?.status !== "waiting") {
      countdownHandledRef.current = null;
    }
  }, [game.room?.status, game.room?.id]);

  const handleCountdownComplete = useCallback(async () => {
    if (!game.room || game.room.created_by !== user?.id) return;
    if (countdownHandledRef.current === game.room.id) return;

    countdownHandledRef.current = game.room.id;
    const effectiveAiCount = projectedAiCount;
    const aiPlayersData = effectiveAiCount > 0
      ? getAIPersonalities(effectiveAiCount).map((ai) => ({ id: ai.id, name: ai.name }))
      : [];

    await game.startGame({
      aiPlayerCount: effectiveAiCount,
      aiPlayersData,
      pointsToWin: lobbyPoints,
      maxRounds: lobbyPoints * 3,
    });
  }, [game, user?.id, projectedAiCount, lobbyPoints]);

  const handleLobbySelectPack = (packId: PackId) => {
    setLobbyPacks([packId]);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <Users className="w-16 h-16 text-muted-foreground/30" />
        <h1 className="text-4xl font-black text-foreground">Multiplayer</h1>
        <p className="text-muted-foreground text-center">You need to sign in to play multiplayer.</p>
        <Button onClick={() => navigate("/mp/auth")} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold">
          Sign In
        </Button>
      </div>
    );
  }

  // LOBBY: No room yet
  if (!game.room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
        <ExoticLogo />
        <h2 className="text-2xl font-black text-foreground">Multiplayer</h2>

        <motion.div className="flex flex-col gap-4 w-full max-w-sm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button
            onClick={game.createRoom}
            disabled={game.loading}
            className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold text-lg py-6"
          >
            Create Room
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-sm">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Enter room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={5}
              className="bg-secondary border-border text-foreground text-center font-mono text-lg tracking-widest uppercase"
            />
            <Button
              onClick={() => game.joinRoom(joinCode)}
              disabled={game.loading || joinCode.length < 5}
              className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold"
            >
              Join
            </Button>
          </div>

          {game.error && <p className="text-destructive text-sm text-center">{game.error}</p>}
        </motion.div>

        <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back Home
        </Button>
      </div>
    );
  }

  // WAITING ROOM
  if (game.phase === "lobby") {
    const isHost = game.room.created_by === user.id;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 sm:gap-6 px-4 py-6">
        <ExoticLogo size="sm" />
        <div className="flex items-center gap-3">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground">Room</h2>
          <span className="text-2xl sm:text-3xl font-mono font-black text-accent tracking-widest">{game.room.room_code}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(game.room!.room_code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="text-muted-foreground"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">Share the code with your friends!</p>

        <div className="w-full max-w-sm space-y-2">
           <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Players ({game.players.length}{projectedAiCount ? ` + ${projectedAiCount} AI` : ""})</p>
          {game.players.map((p) => (
            <motion.div
              key={p.id}
              className="flex items-center gap-3 bg-secondary rounded-lg px-4 py-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {p.ready ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground" />
              )}
              <StatusIndicator status={(getStatus(p.user_id)?.status as any) || "invisible"} size={8} />
              <span className="font-bold text-foreground">{p.display_name}</span>
              <span className={`ml-auto text-[10px] font-bold uppercase tracking-widest ${p.ready ? "text-green-500" : "text-muted-foreground/50"}`}>
                {p.ready ? "Ready" : "Not Ready"}
              </span>
              {p.user_id === game.room.created_by && <Crown className="w-4 h-4 text-accent" />}
            </motion.div>
          ))}
          {(aiRequired || enableAiBots) && getAIPersonalities(projectedAiCount).map((ai) => (
            <motion.div
              key={`ai-${ai.id}`}
              className="flex items-center gap-3 bg-secondary/60 rounded-lg px-4 py-3 border border-border/50"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <Bot className="w-4 h-4 text-accent" />
              <span className="font-bold text-foreground">{ai.name}</span>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-green-500">Ready</span>
            </motion.div>
          ))}
        </div>

        {isHost && (
          <>
            <PackSelector selectedPacks={lobbyPacks} onSelectPack={handleLobbySelectPack} singleSelect />

            <div className="w-full max-w-sm space-y-3">
              <GameConfig
                 aiPlayerCount={projectedAiCount}
                onAiPlayerCountChange={(v) => setAiCount(v)}
                pointsToWin={lobbyPoints}
                onPointsToWinChange={setLobbyPoints}
                minAi={Math.max(minAi, 1)}
                maxAi={maxAi}
                useAiGeneratedCards={useAiCards}
                onUseAiGeneratedCardsChange={setUseAiCards}
              />

              {!aiRequired && (
                <div className="flex items-center justify-between bg-secondary rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-accent" />
                    <Label className="text-foreground font-bold text-sm">AI Bots</Label>
                  </div>
                  <Switch checked={enableAiBots} onCheckedChange={setEnableAiBots} />
                </div>
              )}

              {aiRequired && (
                <p className="text-xs text-accent text-center">
                  AI players required with 2 or fewer human players
                </p>
              )}
            </div>
          </>
        )}

        {!readyToStart && (
          <p className="text-muted-foreground/50 text-sm">
            {game.players.length < 2
              ? "Need at least 2 human players to start"
              : game.players.length + projectedAiCount < 3
                ? "Need at least 3 total participants including AI"
                : "Waiting for all players to ready up"}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            onClick={game.toggleReady}
            variant={game.myPlayer?.ready ? "outline" : "default"}
            className={game.myPlayer?.ready
              ? "border-green-500 text-green-500 hover:bg-green-500/10 font-bold"
              : "bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold"
            }
          >
            {game.myPlayer?.ready ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Ready!</> : <><Circle className="w-4 h-4 mr-2" /> Ready Up</>}
          </Button>
          {isHost && (
            <Button
              onClick={() => game.broadcastCountdown()}
              disabled={!readyToStart || game.loading || countdownActive}
              className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold disabled:opacity-30"
            >
              Start Game
            </Button>
          )}
          <Button variant="outline" onClick={game.leaveRoom} className="border-muted-foreground/30">
            Leave Room
          </Button>
        </div>
        {game.allReady && !readyToStart && game.players.length < 2 && (
          <p className="text-muted-foreground/50 text-xs">Need at least 2 human players.</p>
        )}
        {game.allReady && !readyToStart && game.players.length >= 2 && game.players.length + projectedAiCount < 3 && (
          <p className="text-muted-foreground/50 text-xs">Add at least one AI or one more human player.</p>
        )}
        {!game.allReady && game.players.length >= 1 && (
          <p className="text-muted-foreground/50 text-xs">Waiting for all players to ready up...</p>
        )}
        <LobbyCountdown active={countdownActive} onComplete={handleCountdownComplete} />
        <RoomChat
          roomId={game.room.id}
          aiPlayers={enableAiBots ? getAIPersonalities(aiCount) : []}
          gamePhase={game.phase}
          roundNumber={game.room.current_round}
          gameScores={game.players.map(p => ({ name: p.display_name, score: p.score }))}
          lastBlackCard={game.currentBlackCard?.text}
        />
      </div>
    );
  }

  // GAME OVER
  if (game.phase === "game_over") {
    const sorted = [...game.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <Trophy className="w-16 h-16 text-accent" />
        <h1 className="text-5xl font-black text-foreground">{winner?.display_name} Wins!</h1>

        <div className="w-full max-w-sm space-y-2">
          {sorted.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`font-black text-lg ${i === 0 ? "text-accent" : "text-muted-foreground"}`}>#{i + 1}</span>
                <span className="font-bold text-foreground">{p.display_name}</span>
              </div>
              <span className="font-black text-foreground">{p.score}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => game.leaveRoom()}
            className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> New Game
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              game.leaveRoom();
              navigate("/");
            }}
            className="border-muted-foreground/30"
          >
            <Home className="w-4 h-4 mr-2" /> Home
          </Button>
        </div>
        <RoomChat
          roomId={game.room.id}
          aiPlayers={enableAiBots ? getAIPersonalities(aiCount) : []}
          gamePhase={game.phase}
          roundNumber={game.room.current_round}
          gameScores={game.players.map(p => ({ name: p.display_name, score: p.score }))}
        />
      </div>
    );
  }

  // PLAYING PHASES
  const roundSubs = game.submissions.filter((s) => s.round_number === game.room!.current_round);
  const pick = game.currentBlackCard?.pick || 1;

  const handleSelectCard = (cardId: number) => {
    if (game.isCzar || game.mySubmission) return;
    setSelectedCards((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= pick) return prev;
      return [...prev, cardId];
    });
  };

  const handleSubmit = () => {
    game.submitCards(selectedCards);
    setSelectedCards([]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-4 md:px-8 py-3 border-b border-border">
        <ExoticLogo size="sm" />
        <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
          <span className="text-muted-foreground/50 font-mono">{game.room.room_code}</span>
          <span className="text-muted-foreground/50">
            Round {game.room.current_round}/{game.room.max_rounds}
          </span>
        </div>
      </header>

      {/* Scores bar */}
      <div className="flex gap-2 px-3 sm:px-4 md:px-8 py-1.5 overflow-x-auto border-b border-border">
        {game.players.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold shrink-0 ${
              p.user_id === game.room!.czar_user_id
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-foreground"
            }`}
          >
            {p.user_id === game.room!.czar_user_id && <Crown className="w-3 h-3" />}
            <StatusIndicator status={(getStatus(p.user_id)?.status as any) || "invisible"} size={7} />
            <span>{p.display_name}</span>
            <span className="opacity-60">{p.score}</span>
          </div>
        ))}
      </div>

      {/* Black card */}
      <div className="flex justify-center py-4 sm:py-6 px-4">
        {game.currentBlackCard && <GameCard text={game.currentBlackCard.text} type="black" logo dealDelay={1} />}
      </div>

      {/* Phase-specific content */}
      <AnimatePresence mode="wait">
        {game.phase === "submitting" && (
          <motion.div
            key="submitting"
            className="text-center px-4 pb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {game.isCzar ? (
              <p className="text-accent font-bold text-xs sm:text-sm uppercase tracking-widest">
                You are the Card Czar — waiting for submissions ({roundSubs.length + game.aiSubmissions.length}/{game.players.length - 1 + (game.room?.ai_player_count || 0)})
              </p>
            ) : game.mySubmission ? (
              <p className="text-muted-foreground font-bold text-xs sm:text-sm uppercase tracking-widest">
                Submitted! Waiting for others... ({roundSubs.length + game.aiSubmissions.length}/{game.players.length - 1 + (game.room?.ai_player_count || 0)})
              </p>
            ) : (
              <p className="text-muted-foreground font-bold text-xs sm:text-sm uppercase tracking-widest">
                Pick {pick} card{pick > 1 ? "s" : ""} ({roundSubs.length + game.aiSubmissions.length}/{game.players.length - 1 + (game.room?.ai_player_count || 0)} submitted)
              </p>
            )}
          </motion.div>
        )}

        {game.phase === "judging" && (
          <motion.div
            key="judging"
            className="flex flex-col items-center gap-4 px-4 pb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {game.isCzar && (
              <PhaseTimer
                duration={judgingTimer}
                onExpire={() => {
                  const allIds: string[] = [
                    ...roundSubs.map(s => s.id),
                    ...game.aiSubmissions.map((_, idx) => `ai-${idx}`),
                  ];
                  if (allIds.length > 0) {
                    game.pickWinner(allIds[Math.floor(Math.random() * allIds.length)]);
                  }
                }}
                active={game.phase === "judging" && game.isCzar}
                phaseKey={`judge-${game.room!.current_round}`}
              />
            )}
            <p className="text-accent font-bold text-xs sm:text-sm uppercase tracking-widest">
              {game.isCzar ? "Pick the funniest answer!" : "The Card Czar is judging..."}
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {/* Human player submissions */}
              {roundSubs.map((sub, sIdx) => {
                const cards = sub.white_card_ids
                  .map((id) => whiteCards.find((c) => c.id === id))
                  .filter(Boolean) as WhiteCard[];
                return (
                  <motion.div
                    key={sub.id}
                    className={`flex flex-col gap-1 ${game.isCzar ? "cursor-pointer hover:ring-2 hover:ring-accent rounded-lg p-1" : ""}`}
                    onClick={() => game.isCzar && game.pickWinner(sub.id)}
                    whileHover={game.isCzar ? { scale: 1.05 } : {}}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: sIdx * 0.15, duration: 0.3 }}
                  >
                    <p className="text-[10px] text-muted-foreground mb-1 font-bold text-center">???</p>
                    {cards.map((c) => (
                      <GameCard key={c.id} text={c.text} type="white" small logo />
                    ))}
                  </motion.div>
                );
              })}
              {/* AI submissions */}
              {game.aiSubmissions.map((aiSub, idx) => {
                const cards = aiSub.white_card_ids
                  .map((id) => whiteCards.find((c) => c.id === id))
                  .filter(Boolean) as WhiteCard[];
                return (
                  <motion.div
                    key={`ai-${idx}`}
                    className={`flex flex-col gap-1 ${game.isCzar ? "cursor-pointer hover:ring-2 hover:ring-accent rounded-lg p-1" : ""}`}
                    onClick={() => game.isCzar && game.pickWinner(`ai-${idx}`)}
                    whileHover={game.isCzar ? { scale: 1.05 } : {}}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (roundSubs.length + idx) * 0.15, duration: 0.3 }}
                  >
                    <p className="text-[10px] text-muted-foreground mb-1 font-bold text-center">???</p>
                    {cards.map((c) => (
                      <GameCard key={c.id} text={c.text} type="white" small logo />
                    ))}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {game.phase === "round_result" && game.roundWinner && (
          <motion.div
            key="result"
            className="flex flex-col items-center gap-4 px-4 pb-4 relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <WinnerReveal
              winnerName={`${game.roundWinner.name} wins!`}
              isPlayer={game.roundWinner.userId === user?.id}
            />
            <motion.div className="flex gap-2 justify-center mt-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              {(() => {
                const winningSub = roundSubs.find(s => s.user_id === game.roundWinner!.userId);
                const aiWinSub = !winningSub ? game.aiSubmissions.find(a => a.aiName === game.roundWinner!.name) : null;
                const winnerCardIds = winningSub?.white_card_ids || aiWinSub?.white_card_ids || [];
                const winnerCards = winnerCardIds
                  .map((id: number) => whiteCards.find((c) => c.id === id))
                  .filter(Boolean) as WhiteCard[];
                return winnerCards.map((c) => (
                  <GameCard key={c.id} text={c.text} type="white" small logo />
                ));
              })()}
            </motion.div>
            {game.room.created_by === user.id && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
                <Button
                  onClick={game.nextRound}
                  className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold"
                >
                  Next Round →
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hand (only for non-czar during submitting) */}
      {game.phase === "submitting" && !game.isCzar && !game.mySubmission && (
        <div className="mt-auto border-t border-border">
          <div className="flex items-center justify-between px-3 sm:px-4 md:px-8 py-2 sm:py-3">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Your Hand</p>
            <Button
              size="sm"
              disabled={selectedCards.length < pick}
              onClick={handleSubmit}
              className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold disabled:opacity-30"
            >
              Submit
            </Button>
          </div>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto px-3 sm:px-4 md:px-8 pb-4 sm:pb-6 pt-1">
            {game.myHand.map((card, i) => (
              <GameCard
                key={card.id}
                text={card.text}
                type="white"
                small
                selected={selectedCards.includes(card.id)}
                onClick={() => handleSelectCard(card.id)}
                logo
                dealDelay={i}
                shuffle
              />
            ))}
          </div>
        </div>
      )}
      <RoomChat
        roomId={game.room.id}
        aiPlayers={enableAiBots ? getAIPersonalities(aiCount) : []}
        gamePhase={game.phase}
        roundNumber={game.room.current_round}
        gameScores={game.players.map(p => ({ name: p.display_name, score: p.score }))}
        lastBlackCard={game.currentBlackCard?.text}
      />
    </div>
  );
};

export default Multiplayer;
