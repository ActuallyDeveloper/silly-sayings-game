import { useState, useCallback, useRef } from "react";
import { BlackCard, WhiteCard, shuffle, getCardsByPacks, type PackId } from "@/data/cards";
import { supabase } from "@/integrations/supabase/client";
import { AI_PERSONALITIES, type AIPersonality } from "@/data/aiPersonalities";

export interface AIPlayerState {
  id: number;
  name: string;
  score: number;
  icon: string;
  color: string;
  personality: AIPersonality;
}

export interface AISubmission {
  playerId: number;
  playerName: string;
  cards: WhiteCard[];
}

interface GameState {
  phase: "choosing_black" | "playing" | "judging" | "result" | "gameover";
  blackCardChoices: BlackCard[];
  currentBlackCard: BlackCard | null;
  hand: WhiteCard[];
  selectedCards: WhiteCard[];
  aiPlayers: AIPlayerState[];
  aiSubmissions: AISubmission[];
  playerScore: number;
  round: number;
  maxRounds: number;
  pointsToWin: number;
  winner: string | null;
  blackDeck: BlackCard[];
  whiteDeck: WhiteCard[];
  trashTalk: string | null;
  aiJudging: boolean;
  aiPickingCards: boolean;
  czarId: number | null; // -1 = player, positive = AI player id
  czarName: string;
  czarOrder: number[]; // rotation order: -1 for player, ai ids for AI
  czarIndex: number; // current index in czarOrder
}

const HAND_SIZE = 7;

function drawBlackChoices(blackDeck: BlackCard[]): { choices: BlackCard[]; remaining: BlackCard[] } {
  const remaining = [...blackDeck];
  const choices: BlackCard[] = [];
  const count = Math.min(2, remaining.length);
  for (let i = 0; i < count; i++) choices.push(remaining.shift()!);
  return { choices, remaining };
}

export interface CustomCardsInput {
  blacks: BlackCard[];
  whites: WhiteCard[];
}

function buildCzarOrder(aiPlayers: AIPlayerState[]): number[] {
  // Build rotation: player (-1) + all AI ids, shuffled
  const order = [-1, ...aiPlayers.map(ai => ai.id)];
  // Shuffle for initial randomness
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function getCzarFromOrder(order: number[], index: number, aiPlayers: AIPlayerState[]): { czarId: number; czarName: string } {
  const czarId = order[index % order.length];
  const czarName = czarId === -1 ? "You" : (aiPlayers.find(ai => ai.id === czarId)?.name || "AI");
  return { czarId, czarName };
}

function createInitialState(
  maxRounds: number, packs: PackId[], aiPlayerCount: number, pointsToWin: number, customCards?: CustomCardsInput
): GameState {
  const { blacks, whites } = getCardsByPacks(packs);
  if (customCards) { blacks.push(...customCards.blacks); whites.push(...customCards.whites); }
  const blackDeck = shuffle(blacks);
  const whiteDeck = shuffle(whites);
  const hand = whiteDeck.splice(0, HAND_SIZE);
  const { choices, remaining } = drawBlackChoices(blackDeck);

  const aiPlayers = AI_PERSONALITIES.slice(0, aiPlayerCount).map((p, i) => ({
    id: i + 1,
    name: p.name,
    score: 0,
    icon: p.icon,
    color: p.color,
    personality: p,
  }));

  const czarOrder = buildCzarOrder(aiPlayers);
  const czarIndex = 0;
  const { czarId, czarName } = getCzarFromOrder(czarOrder, czarIndex, aiPlayers);

  return {
    phase: "choosing_black", blackCardChoices: choices, currentBlackCard: null,
    hand, selectedCards: [], aiPlayers, aiSubmissions: [],
    playerScore: 0, round: 1, maxRounds, pointsToWin, winner: null,
    blackDeck: remaining, whiteDeck, trashTalk: null, aiJudging: false, aiPickingCards: false,
    czarId, czarName, czarOrder, czarIndex,
  };
}

export function useGameState(
  maxRounds = 10, packs: PackId[] = ["classic"], aiPlayerCount = 3, pointsToWin = 10, customCards?: CustomCardsInput
) {
  const [state, setState] = useState<GameState>(() =>
    createInitialState(maxRounds, packs, aiPlayerCount, pointsToWin, customCards)
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const packsRef = useRef(packs);
  packsRef.current = packs;
  const customCardsRef = useRef(customCards);
  customCardsRef.current = customCards;

  const isCzar = state.czarId === -1; // player is czar
  const isAICzar = state.czarId !== null && state.czarId > 0;

  const chooseBlackCard = useCallback((card: BlackCard) => {
    setState((prev) => {
      if (prev.phase !== "choosing_black") return prev;
      return { ...prev, phase: "playing", currentBlackCard: card, blackCardChoices: [] };
    });
  }, []);

  // AI czar auto-picks black card
  const aiCzarPickBlack = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "choosing_black" || prev.czarId === -1) return prev;
      const pick = prev.blackCardChoices[Math.floor(Math.random() * prev.blackCardChoices.length)];
      return { ...prev, phase: "playing", currentBlackCard: pick, blackCardChoices: [] };
    });
  }, []);

  const selectCard = useCallback((card: WhiteCard) => {
    setState((prev) => {
      if (prev.phase !== "playing" || !prev.currentBlackCard) return prev;
      // If player is czar, they don't play cards
      if (prev.czarId === -1) return prev;
      const pick = prev.currentBlackCard.pick;
      const alreadySelected = prev.selectedCards.find((c) => c.id === card.id);
      if (alreadySelected) return { ...prev, selectedCards: prev.selectedCards.filter((c) => c.id !== card.id) };
      if (prev.selectedCards.length >= pick) return prev;
      return { ...prev, selectedCards: [...prev.selectedCards, card] };
    });
  }, []);

  const submitCards = useCallback(async () => {
    const prev = stateRef.current;
    if (!prev.currentBlackCard) return;
    
    const playerIsCzar = prev.czarId === -1;
    
    // If player is not czar, they must have submitted cards
    if (!playerIsCzar && prev.selectedCards.length < prev.currentBlackCard.pick) return;

    const pick = prev.currentBlackCard.pick;
    setState((s) => ({ ...s, phase: "judging", aiPickingCards: true, aiSubmissions: [] }));

    // AI players that are NOT the czar submit cards
    const nonCzarAIs = prev.aiPlayers.filter(ai => ai.id !== prev.czarId);
    const deckCopy = [...prev.whiteDeck];
    const aiHands = nonCzarAIs.map((ai) => {
      const handSize = Math.min(HAND_SIZE, deckCopy.length);
      const hand = deckCopy.splice(0, handSize);
      return { ai, hand };
    });

    try {
      const { data } = await supabase.functions.invoke("game-ai", {
        body: {
          type: "ai_pick_multi",
          blackCard: prev.currentBlackCard.text,
          pick,
          aiPlayers: aiHands.map((h) => ({
            name: h.ai.name,
            personality: h.ai.personality.personality,
            cards: h.hand.map((c) => c.text),
          })),
        },
      });

      const aiSubmissions: AISubmission[] = aiHands.map(({ ai, hand }) => {
        const aiPick = data?.picks?.find((p: any) => p.name === ai.name);
        let selectedCards: WhiteCard[];
        if (aiPick?.selectedCards) {
          selectedCards = aiPick.selectedCards
            .map((text: string) => hand.find((c) => c.text === text))
            .filter(Boolean)
            .slice(0, pick);
          while (selectedCards.length < pick) {
            const remaining = hand.filter((c) => !selectedCards.includes(c));
            if (remaining.length > 0) selectedCards.push(remaining[0]); else break;
          }
        } else {
          selectedCards = hand.slice(0, pick);
        }
        return { playerId: ai.id, playerName: ai.name, cards: selectedCards };
      });

      setState((s) => ({ ...s, aiSubmissions, aiPickingCards: false, whiteDeck: deckCopy }));
    } catch {
      const aiSubmissions: AISubmission[] = aiHands.map(({ ai, hand }) => ({
        playerId: ai.id, playerName: ai.name, cards: hand.slice(0, pick),
      }));
      setState((s) => ({ ...s, aiSubmissions, aiPickingCards: false, whiteDeck: deckCopy }));
    }
  }, []);

  // When player is czar, they pick the winner manually
  const pickWinnerManual = useCallback((winnerName: string) => {
    setState((prev) => {
      if (prev.czarId !== -1) return prev; // only player-czar can pick manually
      let trashTalk = `${winnerName} takes this round!`;
      return {
        ...prev, phase: "result",
        playerScore: prev.playerScore + (winnerName === "You" ? 1 : 0),
        aiPlayers: prev.aiPlayers.map((ai) => winnerName === ai.name ? { ...ai, score: ai.score + 1 } : ai),
        winner: winnerName, trashTalk, aiJudging: false,
      };
    });
  }, []);

  // AI judges (used when AI is czar)
  const judgeWithAI = useCallback(async () => {
    setState((prev) => ({ ...prev, aiJudging: true }));
    const current = stateRef.current;
    
    // Build submissions list - player only submits if not czar
    const submissions: { name: string; cards: string[] }[] = [];
    if (current.czarId !== -1) {
      submissions.push({ name: "You", cards: current.selectedCards.map((c) => c.text) });
    }
    submissions.push(...current.aiSubmissions.map((s) => ({ name: s.playerName, cards: s.cards.map((c) => c.text) })));

    try {
      const { data, error } = await supabase.functions.invoke("game-ai", {
        body: { type: "judge_multi", blackCard: current.currentBlackCard?.text, submissions },
      });

      const winnerName = !error && data?.winner
        ? submissions.find((s) => s.name.toLowerCase() === data.winner.toLowerCase())?.name ||
          submissions[Math.floor(Math.random() * submissions.length)].name
        : submissions[Math.floor(Math.random() * submissions.length)].name;

      let trashTalk = data?.reason || "";
      try {
        const { data: ttData } = await supabase.functions.invoke("game-ai", {
          body: { type: "trash_talk", blackCard: current.currentBlackCard?.text, playerCards: submissions.find((s) => s.name === winnerName)?.cards || [] },
        });
        if (ttData?.text) trashTalk = ttData.text;
      } catch { /* ignore */ }

      setState((prev) => ({
        ...prev, phase: "result",
        playerScore: prev.playerScore + (winnerName === "You" ? 1 : 0),
        aiPlayers: prev.aiPlayers.map((ai) => winnerName === ai.name ? { ...ai, score: ai.score + 1 } : ai),
        winner: winnerName, trashTalk, aiJudging: false,
      }));
    } catch {
      const randomIdx = Math.floor(Math.random() * submissions.length);
      const winnerName = submissions[randomIdx].name;
      setState((prev) => ({
        ...prev, phase: "result",
        playerScore: prev.playerScore + (winnerName === "You" ? 1 : 0),
        aiPlayers: prev.aiPlayers.map((ai) => winnerName === ai.name ? { ...ai, score: ai.score + 1 } : ai),
        winner: winnerName, trashTalk: null, aiJudging: false,
      }));
    }
  }, []);

  const nextRound = useCallback(() => {
    setState((prev) => {
      const allScores = [
        { name: "You", score: prev.playerScore },
        ...prev.aiPlayers.map((ai) => ({ name: ai.name, score: ai.score })),
      ];
      const topScore = Math.max(...allScores.map((s) => s.score));
      const gameOver = prev.round >= prev.maxRounds || topScore >= prev.pointsToWin;

      if (gameOver) {
        const winners = allScores.filter((s) => s.score === topScore);
        const winnerName = winners.length > 1 ? "Tie" : winners[0].name;
        return { ...prev, phase: "gameover" as const, winner: winnerName, trashTalk: null, blackCardChoices: [], aiSubmissions: [] };
      }

      // Sequential czar rotation
      const nextCzarIndex = prev.czarIndex + 1;
      const { czarId, czarName } = getCzarFromOrder(prev.czarOrder, nextCzarIndex, prev.aiPlayers);

      const newHand = [...prev.hand.filter((c) => !prev.selectedCards.find((s) => s.id === c.id))];
      const deckCopy = [...prev.whiteDeck];
      while (newHand.length < HAND_SIZE && deckCopy.length > 0) newHand.push(deckCopy.shift()!);
      const { choices, remaining } = drawBlackChoices(prev.blackDeck);
      return {
        ...prev, phase: "choosing_black" as const, blackCardChoices: choices, currentBlackCard: null,
        hand: newHand, selectedCards: [], aiSubmissions: [], round: prev.round + 1,
        winner: null, blackDeck: remaining, whiteDeck: deckCopy, trashTalk: null,
        czarId, czarName, czarIndex: nextCzarIndex,
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    setState(createInitialState(maxRounds, packsRef.current, aiPlayerCount, pointsToWin, customCardsRef.current));
  }, [maxRounds, aiPlayerCount, pointsToWin]);

  return { ...state, isCzar, isAICzar, chooseBlackCard, aiCzarPickBlack, selectCard, submitCards, judgeWithAI, pickWinnerManual, nextRound, resetGame };
}
