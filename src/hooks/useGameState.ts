import { useState, useCallback, useRef } from "react";
import { BlackCard, WhiteCard, blackCards, whiteCards, shuffle } from "@/data/cards";
import { supabase } from "@/integrations/supabase/client";

interface GameState {
  phase: "playing" | "judging" | "result" | "gameover";
  currentBlackCard: BlackCard | null;
  hand: WhiteCard[];
  selectedCards: WhiteCard[];
  aiCards: WhiteCard[];
  playerScore: number;
  aiScore: number;
  round: number;
  maxRounds: number;
  winner: string | null;
  blackDeck: BlackCard[];
  whiteDeck: WhiteCard[];
  trashTalk: string | null;
  aiJudging: boolean;
}

const HAND_SIZE = 7;
const MAX_ROUNDS = 10;

export function useGameState() {
  const [state, setState] = useState<GameState>(() => initGame());
  const dynamicCardsAdded = useRef(false);

  function initGame(): GameState {
    const blackDeck = shuffle(blackCards);
    const whiteDeck = shuffle(whiteCards);
    const hand = whiteDeck.splice(0, HAND_SIZE);
    const currentBlackCard = blackDeck.shift() || null;
    return {
      phase: "playing",
      currentBlackCard,
      hand,
      selectedCards: [],
      aiCards: [],
      playerScore: 0,
      aiScore: 0,
      round: 1,
      maxRounds: MAX_ROUNDS,
      winner: null,
      blackDeck,
      whiteDeck,
      trashTalk: null,
      aiJudging: false,
    };
  }

  const selectCard = useCallback((card: WhiteCard) => {
    setState((prev) => {
      if (prev.phase !== "playing" || !prev.currentBlackCard) return prev;
      const pick = prev.currentBlackCard.pick;
      const alreadySelected = prev.selectedCards.find((c) => c.id === card.id);
      if (alreadySelected) {
        return { ...prev, selectedCards: prev.selectedCards.filter((c) => c.id !== card.id) };
      }
      if (prev.selectedCards.length >= pick) return prev;
      return { ...prev, selectedCards: [...prev.selectedCards, card] };
    });
  }, []);

  const submitCards = useCallback(() => {
    setState((prev) => {
      if (!prev.currentBlackCard) return prev;
      if (prev.selectedCards.length < prev.currentBlackCard.pick) return prev;
      const aiPick = prev.currentBlackCard.pick;
      const deckCopy = [...prev.whiteDeck];
      const aiCards = deckCopy.splice(0, aiPick);
      return { ...prev, phase: "judging", aiCards, whiteDeck: deckCopy, trashTalk: null, aiJudging: false };
    });
  }, []);

  // AI-powered judge
  const judgeWithAI = useCallback(async () => {
    setState((prev) => ({ ...prev, aiJudging: true }));

    const currentState = state;
    try {
      const { data, error } = await supabase.functions.invoke("game-ai", {
        body: {
          type: "judge",
          blackCard: currentState.currentBlackCard?.text,
          playerCards: currentState.selectedCards.map((c) => c.text),
          aiCards: currentState.aiCards.map((c) => c.text),
        },
      });

      const playerWins = !error && data?.winner === "player";
      const reason = data?.reason || data?.text || "";

      // Also get trash talk
      let trashTalk = reason;
      try {
        const { data: ttData } = await supabase.functions.invoke("game-ai", {
          body: {
            type: "trash_talk",
            blackCard: currentState.currentBlackCard?.text,
            playerCards: playerWins ? currentState.selectedCards.map((c) => c.text) : currentState.aiCards.map((c) => c.text),
          },
        });
        if (ttData?.text) trashTalk = ttData.text;
      } catch { /* ignore trash talk errors */ }

      setState((prev) => ({
        ...prev,
        phase: "result",
        playerScore: prev.playerScore + (playerWins ? 1 : 0),
        aiScore: prev.aiScore + (playerWins ? 0 : 1),
        winner: playerWins ? "You" : "AI",
        trashTalk,
        aiJudging: false,
      }));
    } catch {
      // Fallback to random if AI fails
      const playerWins = Math.random() < 0.55;
      setState((prev) => ({
        ...prev,
        phase: "result",
        playerScore: prev.playerScore + (playerWins ? 1 : 0),
        aiScore: prev.aiScore + (playerWins ? 0 : 1),
        winner: playerWins ? "You" : "AI",
        trashTalk: null,
        aiJudging: false,
      }));
    }
  }, [state]);

  const nextRound = useCallback(() => {
    setState((prev) => {
      if (prev.round >= prev.maxRounds) {
        return {
          ...prev,
          phase: "gameover",
          winner: prev.playerScore > prev.aiScore ? "You" : prev.playerScore === prev.aiScore ? "Tie" : "AI",
          trashTalk: null,
        };
      }
      const newHand = [...prev.hand.filter((c) => !prev.selectedCards.find((s) => s.id === c.id))];
      const deckCopy = [...prev.whiteDeck];
      while (newHand.length < HAND_SIZE && deckCopy.length > 0) {
        newHand.push(deckCopy.shift()!);
      }
      const nextBlack = prev.blackDeck.length > 0 ? prev.blackDeck[0] : null;
      const newBlackDeck = prev.blackDeck.slice(1);
      return {
        ...prev,
        phase: "playing",
        currentBlackCard: nextBlack,
        hand: newHand,
        selectedCards: [],
        aiCards: [],
        round: prev.round + 1,
        winner: null,
        blackDeck: newBlackDeck,
        whiteDeck: deckCopy,
        trashTalk: null,
      };
    });
  }, []);

  // Generate new AI cards mid-game to keep variety
  const generateNewCards = useCallback(async () => {
    if (dynamicCardsAdded.current) return;
    try {
      const { data } = await supabase.functions.invoke("game-ai", {
        body: { type: "generate_cards" },
      });
      if (data?.blackCards && data?.whiteCards) {
        dynamicCardsAdded.current = true;
        setState((prev) => {
          const maxBlackId = Math.max(...prev.blackDeck.map((c) => c.id), ...blackCards.map((c) => c.id));
          const maxWhiteId = Math.max(...prev.whiteDeck.map((c) => c.id), ...prev.hand.map((c) => c.id), ...whiteCards.map((c) => c.id));
          const newBlacks: BlackCard[] = data.blackCards.map((c: any, i: number) => ({
            id: maxBlackId + i + 1,
            text: c.text,
            pick: c.pick || 1,
          }));
          const newWhites: WhiteCard[] = data.whiteCards.map((c: any, i: number) => ({
            id: maxWhiteId + i + 1,
            text: c.text,
          }));
          return {
            ...prev,
            blackDeck: [...prev.blackDeck, ...shuffle(newBlacks)],
            whiteDeck: [...prev.whiteDeck, ...shuffle(newWhites)],
          };
        });
      }
    } catch { /* ignore card generation errors */ }
  }, []);

  const resetGame = useCallback(() => {
    dynamicCardsAdded.current = false;
    setState(initGame());
  }, []);

  return { ...state, selectCard, submitCards, judgeWithAI, nextRound, resetGame, generateNewCards };
}
