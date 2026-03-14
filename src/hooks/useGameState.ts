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

function pickRandomCzar(aiPlayers: AIPlayerState[]): { czarId: number; czarName: string } {
  // -1 = human player, positive = AI player id
  const allParticipants = [
    { id: -1, name: "You" },
    ...aiPlayers.map(ai => ({ id: ai.id, name: ai.name })),
  ];
  const pick = allParticipants[Math.floor(Math.random() * allParticipants.length)];
  return { czarId: pick.id, czarName: pick.name };
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

  const { czarId, czarName } = pickRandomCzar(aiPlayers);

  return {
    phase: "choosing_black", blackCardChoices: choices, currentBlackCard: null,
    hand, selectedCards: [], aiPlayers, aiSubmissions: [],
    playerScore: 0, round: 1, maxRounds, pointsToWin, winner: null,
    blackDeck: remaining, whiteDeck, trashTalk: null, aiJudging: false, aiPickingCards: false,
    czarId, czarName,
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
    
    // Ensure we have enough cards for all AI players
    const aiHands = nonCzarAIs.map((ai) => {
      const handSize = Math.min(HAND_SIZE, deckCopy.length);
      const hand = deckCopy.splice(0, handSize);
      return { ai, hand };
    });

    // Filter out AI players with no cards
    const validAiHands = aiHands.filter(h => h.hand.length >= pick);

    try {
      const { data } = await supabase.functions.invoke("game-ai", {
        body: {
          type: "ai_pick_multi",
          blackCard: prev.currentBlackCard.text,
          pick,
          aiPlayers: validAiHands.map((h) => ({
            name: h.ai.name,
            personality: h.ai.personality.personality,
            cards: h.hand.map((c) => c.text),
          })),
        },
      });

      const aiSubmissions: AISubmission[] = validAiHands.map(({ ai, hand }) => {
        const aiPick = data?.picks?.find((p: any) => p.name === ai.name);
        let selectedCards: WhiteCard[];
        if (aiPick?.selectedCards && Array.isArray(aiPick.selectedCards)) {
          selectedCards = aiPick.selectedCards
            .map((text: string) => hand.find((c) => c.text.toLowerCase().trim() === text.toLowerCase().trim()))
            .filter(Boolean)
            .slice(0, pick);
          // Fill missing cards with random from hand
          while (selectedCards.length < pick && hand.length > selectedCards.length) {
            const remaining = hand.filter((c) => !selectedCards.includes(c));
            if (remaining.length > 0) {
              selectedCards.push(remaining[Math.floor(Math.random() * remaining.length)]);
            } else break;
          }
        } else {
          // Fallback: pick random cards from hand
          const shuffledHand = [...hand].sort(() => Math.random() - 0.5);
          selectedCards = shuffledHand.slice(0, pick);
        }
        return { playerId: ai.id, playerName: ai.name, cards: selectedCards };
      });

      // Ensure all AI submissions have valid cards
      const validSubmissions = aiSubmissions.filter(sub => sub.cards.length > 0 && sub.cards.every(c => c && c.text));
      
      setState((s) => ({ ...s, aiSubmissions: validSubmissions, aiPickingCards: false, whiteDeck: deckCopy }));
    } catch {
      const aiSubmissions: AISubmission[] = validAiHands.map(({ ai, hand }) => {
        const shuffledHand = [...hand].sort(() => Math.random() - 0.5);
        return { playerId: ai.id, playerName: ai.name, cards: shuffledHand.slice(0, pick) };
      });
      const validSubmissions = aiSubmissions.filter(sub => sub.cards.length > 0 && sub.cards.every(c => c && c.text));
      setState((s) => ({ ...s, aiSubmissions: validSubmissions, aiPickingCards: false, whiteDeck: deckCopy }));
    }
  }, []);

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

      const { czarId, czarName } = pickRandomCzar(prev.aiPlayers);

      const newHand = [...prev.hand.filter((c) => !prev.selectedCards.find((s) => s.id === c.id))];
      const deckCopy = [...prev.whiteDeck];
      while (newHand.length < HAND_SIZE && deckCopy.length > 0) newHand.push(deckCopy.shift()!);
      const { choices, remaining } = drawBlackChoices(prev.blackDeck);
      return {
        ...prev, phase: "choosing_black" as const, blackCardChoices: choices, currentBlackCard: null,
        hand: newHand, selectedCards: [], aiSubmissions: [], round: prev.round + 1,
        winner: null, blackDeck: remaining, whiteDeck: deckCopy, trashTalk: null,
        czarId, czarName,
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    setState(createInitialState(maxRounds, packsRef.current, aiPlayerCount, pointsToWin, customCardsRef.current));
  }, [maxRounds, aiPlayerCount, pointsToWin]);

  return { ...state, isCzar, isAICzar, chooseBlackCard, aiCzarPickBlack, selectCard, submitCards, judgeWithAI, nextRound, resetGame };
}
