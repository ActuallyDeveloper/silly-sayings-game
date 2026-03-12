import { useState, useCallback } from "react";
import { BlackCard, WhiteCard, blackCards, whiteCards, shuffle } from "@/data/cards";

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
}

const HAND_SIZE = 7;
const MAX_ROUNDS = 10;

export function useGameState() {
  const [state, setState] = useState<GameState>(() => initGame());

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
      // AI picks random cards from deck
      const aiPick = prev.currentBlackCard.pick;
      const deckCopy = [...prev.whiteDeck];
      const aiCards = deckCopy.splice(0, aiPick);
      return { ...prev, phase: "judging", aiCards, whiteDeck: deckCopy };
    });
  }, []);

  const judge = useCallback((playerWins: boolean) => {
    setState((prev) => {
      // ~45% chance player wins (AI judge is slightly harsh)
      const result = Math.random() < 0.55;
      const actualWin = result;
      return {
        ...prev,
        phase: "result",
        playerScore: prev.playerScore + (actualWin ? 1 : 0),
        aiScore: prev.aiScore + (actualWin ? 0 : 1),
        winner: actualWin ? "You" : "AI",
      };
    });
  }, []);

  const nextRound = useCallback(() => {
    setState((prev) => {
      if (prev.round >= prev.maxRounds) {
        return {
          ...prev,
          phase: "gameover",
          winner: prev.playerScore > prev.aiScore ? "You" : prev.playerScore === prev.aiScore ? "Tie" : "AI",
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
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    setState(initGame());
  }, []);

  return { ...state, selectCard, submitCards, judge, nextRound, resetGame };
}
