import { useState, useRef, useEffect } from "react";
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

interface GameChatProps {
  aiPlayers: AIPersonality[];
  gamePhase: string;
  roundNumber: number;
  playerName?: string;
}

const GameChat = ({ aiPlayers, gamePhase, roundNumber, playerName = "You" }: GameChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [responding, setResponding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastPhaseRef = useRef("");
  const lastRoundRef = useRef(0);
  const msgIdRef = useRef(0);

  const addMessage = (sender: string, avatar: string, color: string, message: string, isPlayer = false) => {
    const msg: ChatMessage = { id: `msg-${msgIdRef.current++}`, sender, avatar, color, message, isPlayer };
    setMessages((prev) => [...prev, msg]);
    if (!open) setUnread((u) => u + 1);
  };

  // React to game phase changes
  useEffect(() => {
    const phaseKey = `${gamePhase}-${roundNumber}`;
    if (phaseKey === lastPhaseRef.current) return;
    lastPhaseRef.current = phaseKey;

    if (aiPlayers.length === 0) return;

    if (gamePhase === "choosing_black" && roundNumber > 1) {
      const ai = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
      setTimeout(() => addMessage(ai.name, ai.avatar, ai.color, getRandomReaction(ai, "roundStart")), 1000 + Math.random() * 2000);
    } else if (gamePhase === "result") {
      const ai = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
      const type = Math.random() > 0.5 ? "wonRound" : "lostRound";
      setTimeout(() => addMessage(ai.name, ai.avatar, ai.color, getRandomReaction(ai, type)), 500 + Math.random() * 1500);
    }
  }, [gamePhase, roundNumber, aiPlayers]);

  // Game start message
  useEffect(() => {
    if (aiPlayers.length > 0 && messages.length === 0) {
      const ai = aiPlayers[0];
      addMessage(ai.name, ai.avatar, ai.color, getRandomReaction(ai, "gameStart"));
    }
  }, [aiPlayers]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [open, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || responding) return;
    const msg = input.trim();
    addMessage(playerName, "👤", "hsl(var(--accent))", msg, true);
    setInput("");
    setResponding(true);

    // Pick a random AI to respond
    const ai = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];

    try {
      const { data } = await supabase.functions.invoke("game-ai", {
        body: {
          type: "chat",
          playerMessage: msg,
          aiName: ai.name,
          aiPersonality: ai.personality,
          aiChatStyle: ai.chatStyle,
        },
      });
      const response = data?.response || getRandomReaction(ai, "roundStart");
      setTimeout(() => {
        addMessage(ai.name, ai.avatar, ai.color, response);
        setResponding(false);
      }, 500 + Math.random() * 1000);
    } catch {
      setTimeout(() => {
        addMessage(ai.name, ai.avatar, ai.color, getRandomReaction(ai, "roundStart"));
        setResponding(false);
      }, 500);
    }
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
            {unread}
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
              <p className="text-[10px] text-muted-foreground">{aiPlayers.length} AI player{aiPlayers.length !== 1 ? "s" : ""}</p>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Chat with AI players!</p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.isPlayer ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-sm">{msg.avatar}</span>
                    <span className="text-[10px] text-muted-foreground font-bold">{msg.sender}</span>
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
