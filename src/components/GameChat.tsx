import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AIPersonality } from "@/data/aiPersonalities";
import { getRandomReaction } from "@/data/aiPersonalities";

interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  color: string;
  message: string;
  isPlayer: boolean;
}

interface GameContext {
  phase: string;
  round: number;
  scores: { name: string; score: number }[];
  lastBlackCard?: string;
  lastWinner?: string;
  playerName: string;
}

interface GameChatProps {
  aiPlayers: AIPersonality[];
  gamePhase: string;
  roundNumber: number;
  playerName?: string;
  gameContext?: Omit<GameContext, "playerName">;
}

const GameChat = ({ aiPlayers, gamePhase, roundNumber, playerName = "You", gameContext }: GameChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [responding, setResponding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastPhaseRef = useRef("");
  const msgIdRef = useRef(0);
  const spontaneousTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getCtx = useCallback((): GameContext => ({
    phase: gamePhase,
    round: roundNumber,
    scores: gameContext?.scores || [],
    lastBlackCard: gameContext?.lastBlackCard,
    lastWinner: gameContext?.lastWinner,
    playerName,
  }), [gamePhase, roundNumber, gameContext, playerName]);

  const getChatHistory = useCallback(() => {
    return messages.slice(-20).map(m => ({ sender: m.sender, message: m.message }));
  }, [messages]);

  const addMessages = useCallback((newMsgs: ChatMessage[]) => {
    setMessages(prev => [...prev, ...newMsgs]);
    setUnread(prev => prev + newMsgs.filter(m => !m.isPlayer).length);
  }, []);

  const findAI = (name: string) => aiPlayers.find(ai => ai.name === name);

  const callGroupChat = useCallback(async (trigger: string) => {
    if (aiPlayers.length === 0 || responding) return;
    setResponding(true);
    try {
      const { data } = await supabase.functions.invoke("game-ai", {
        body: {
          type: "group_chat",
          aiPlayers: aiPlayers.map(ai => ({
            name: ai.name,
            personality: ai.personality,
            chatStyle: ai.chatStyle,
            avatar: ai.avatar,
          })),
          chatHistory: getChatHistory(),
          gameContext: getCtx(),
          trigger,
        },
      });
      const aiMsgs = data?.messages || [];
      if (aiMsgs.length > 0) {
        // Stagger messages for natural feel
        let delay = 300 + Math.random() * 700;
        for (const msg of aiMsgs) {
          const ai = findAI(msg.name);
          if (!ai) continue;
          setTimeout(() => {
            const chatMsg: ChatMessage = {
              id: `msg-${msgIdRef.current++}`,
              sender: ai.name,
              avatar: ai.avatar,
              color: ai.color,
              message: msg.message,
              isPlayer: false,
            };
            addMessages([chatMsg]);
          }, delay);
          delay += 800 + Math.random() * 1500;
        }
        // Maybe trigger AI-to-AI reply chain
        if (Math.random() > 0.6 && trigger !== "ai_reply") {
          aiReplyTimerRef.current = setTimeout(() => {
            setResponding(false);
            callGroupChat("ai_reply");
          }, delay + 2000 + Math.random() * 3000);
          return;
        }
      }
    } catch {
      // Fallback to scripted reaction
      if (aiPlayers.length > 0) {
        const ai = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
        const fallback: ChatMessage = {
          id: `msg-${msgIdRef.current++}`,
          sender: ai.name, avatar: ai.avatar, color: ai.color,
          message: getRandomReaction(ai, "roundStart"), isPlayer: false,
        };
        addMessages([fallback]);
      }
    }
    setResponding(false);
  }, [aiPlayers, responding, getChatHistory, getCtx, addMessages]);

  // React to game phase changes
  useEffect(() => {
    const phaseKey = `${gamePhase}-${roundNumber}`;
    if (phaseKey === lastPhaseRef.current) return;
    lastPhaseRef.current = phaseKey;
    if (aiPlayers.length === 0) return;

    const delay = 1000 + Math.random() * 2000;
    setTimeout(() => callGroupChat("phase_change"), delay);
  }, [gamePhase, roundNumber, aiPlayers.length]);

  // Game start message
  useEffect(() => {
    if (aiPlayers.length > 0 && messages.length === 0) {
      setTimeout(() => callGroupChat("phase_change"), 500);
    }
  }, [aiPlayers.length]);

  // Spontaneous chatter - AI players randomly talk every 15-40 seconds
  useEffect(() => {
    if (aiPlayers.length === 0) return;

    const scheduleSpontaneous = () => {
      const delay = 15000 + Math.random() * 25000;
      spontaneousTimerRef.current = setTimeout(() => {
        if (Math.random() > 0.4) { // 60% chance to actually say something
          callGroupChat("spontaneous");
        }
        scheduleSpontaneous();
      }, delay);
    };

    scheduleSpontaneous();
    return () => {
      if (spontaneousTimerRef.current) clearTimeout(spontaneousTimerRef.current);
      if (aiReplyTimerRef.current) clearTimeout(aiReplyTimerRef.current);
    };
  }, [aiPlayers.length]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [open, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || responding) return;
    const msg = input.trim();
    const playerMsg: ChatMessage = {
      id: `msg-${msgIdRef.current++}`,
      sender: playerName, avatar: "👤", color: "hsl(var(--accent))",
      message: msg, isPlayer: true,
    };
    addMessages([playerMsg]);
    setInput("");

    // AI responds to player
    setTimeout(() => callGroupChat("reply_to_player"), 500 + Math.random() * 1000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 bg-accent text-accent-foreground rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 z-50 w-80 max-h-96 bg-secondary border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-bold text-foreground">Game Chat</p>
              <p className="text-[10px] text-muted-foreground">
                {aiPlayers.length} AI player{aiPlayers.length !== 1 ? "s" : ""} • Round {roundNumber}
              </p>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Chat with AI players!</p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.isPlayer ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-sm">{msg.avatar}</span>
                    <span className="text-[10px] font-bold" style={{ color: msg.isPlayer ? undefined : msg.color }}>
                      {msg.sender}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-lg text-sm max-w-[85%] ${
                      msg.isPlayer ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
              {responding && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="animate-pulse">●</span> AI is typing...
                </div>
              )}
            </div>

            <div className="p-2 border-t border-border flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="text-sm bg-background border-border"
              />
              <Button size="sm" onClick={sendMessage} disabled={!input.trim() || responding}
                className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GameChat;
