import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AIPersonality } from "@/data/aiPersonalities";
import { getRandomReaction } from "@/data/aiPersonalities";

interface ChatMessage {
  id: string;
  sender: string;
  avatar?: string;
  color?: string;
  message: string;
  isPlayer: boolean;
  isAI?: boolean;
  created_at?: string;
}

interface RoomChatProps {
  roomId: string;
  aiPlayers?: AIPersonality[];
  gamePhase?: string;
  roundNumber?: number;
  gameScores?: { name: string; score: number }[];
  lastBlackCard?: string;
  lastWinner?: string;
}

const RoomChat = ({ roomId, aiPlayers = [], gamePhase = "", roundNumber = 0, gameScores = [], lastBlackCard, lastWinner }: RoomChatProps) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [aiResponding, setAiResponding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);
  const lastPhaseRef = useRef("");
  const spontaneousTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerName = profile?.username || profile?.display_name || "Player";

  // Load existing DB messages
  useEffect(() => {
    supabase
      .from("room_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setMessages(data.map((m: any) => ({
            id: m.id,
            sender: m.display_name,
            message: m.message,
            isPlayer: m.user_id === user?.id,
            isAI: false,
            created_at: m.created_at,
          })));
        }
      });

    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as any;
          const chatMsg: ChatMessage = {
            id: msg.id,
            sender: msg.display_name,
            message: msg.message,
            isPlayer: msg.user_id === user?.id,
            isAI: false,
          };
          setMessages((prev) => [...prev, chatMsg]);
          if (!open) setUnread((u) => u + 1);

          // If AI players exist and a human sent a message, AI might reply
          if (aiPlayers.length > 0 && msg.user_id !== user?.id) {
            if (Math.random() > 0.5) {
              setTimeout(() => callAIGroupChat("reply_to_player"), 1000 + Math.random() * 2000);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const getChatHistory = useCallback(() => {
    return messages.slice(-15).map(m => ({ sender: m.sender, message: m.message }));
  }, [messages]);

  const callAIGroupChat = useCallback(async (trigger: string) => {
    if (aiPlayers.length === 0 || aiResponding) return;
    setAiResponding(true);
    try {
      const { data } = await supabase.functions.invoke("game-ai", {
        body: {
          type: "group_chat",
          aiPlayers: aiPlayers.map(ai => ({
            name: ai.name, personality: ai.personality,
            chatStyle: ai.chatStyle, avatar: ai.avatar,
          })),
          chatHistory: getChatHistory(),
          gameContext: {
            phase: gamePhase, round: roundNumber,
            scores: gameScores, lastBlackCard, lastWinner, playerName,
          },
          trigger,
        },
      });
      const aiMsgs = data?.messages || [];
      if (aiMsgs.length > 0) {
        let delay = 300 + Math.random() * 700;
        for (const msg of aiMsgs) {
          const ai = aiPlayers.find(a => a.name === msg.name);
          if (!ai) continue;
          setTimeout(() => {
            const chatMsg: ChatMessage = {
              id: `ai-${msgIdRef.current++}`,
              sender: ai.name, avatar: ai.avatar, color: ai.color,
              message: msg.message, isPlayer: false, isAI: true,
            };
            setMessages(prev => [...prev, chatMsg]);
            if (!open) setUnread(u => u + 1);
          }, delay);
          delay += 800 + Math.random() * 1500;
        }
      }
    } catch {
      // Silent fail for AI chat
    }
    setAiResponding(false);
  }, [aiPlayers, aiResponding, getChatHistory, gamePhase, roundNumber, gameScores, lastBlackCard, lastWinner, playerName, open]);

  // AI reacts to phase changes
  useEffect(() => {
    if (aiPlayers.length === 0) return;
    const phaseKey = `${gamePhase}-${roundNumber}`;
    if (phaseKey === lastPhaseRef.current) return;
    lastPhaseRef.current = phaseKey;
    setTimeout(() => callAIGroupChat("phase_change"), 1000 + Math.random() * 2000);
  }, [gamePhase, roundNumber, aiPlayers.length]);

  // Spontaneous AI banter
  useEffect(() => {
    if (aiPlayers.length === 0) return;
    const scheduleSpontaneous = () => {
      spontaneousTimerRef.current = setTimeout(() => {
        if (Math.random() > 0.4) callAIGroupChat("spontaneous");
        scheduleSpontaneous();
      }, 20000 + Math.random() * 30000);
    };
    scheduleSpontaneous();
    return () => { if (spontaneousTimerRef.current) clearTimeout(spontaneousTimerRef.current); };
  }, [aiPlayers.length]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [open, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    const msgText = input.trim();
    await supabase.from("room_messages").insert({
      room_id: roomId, user_id: user.id,
      display_name: playerName, message: msgText,
    });
    setInput("");

    // AI players respond to the player
    if (aiPlayers.length > 0) {
      setTimeout(() => callAIGroupChat("reply_to_player"), 800 + Math.random() * 1500);
    }
  };

  const hasAI = aiPlayers.length > 0;

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
              <p className="text-sm font-bold text-foreground">Room Chat</p>
              {hasAI && <p className="text-[10px] text-muted-foreground">{aiPlayers.length} AI player{aiPlayers.length !== 1 ? "s" : ""} in chat</p>}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Say something!</p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.isPlayer ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    {msg.isAI && msg.avatar && <span className="text-sm">{msg.avatar}</span>}
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: msg.isAI && msg.color ? msg.color : undefined }}
                    >
                      {msg.sender}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-lg text-sm max-w-[85%] ${
                      msg.isPlayer ? "bg-accent text-accent-foreground" : msg.isAI ? "bg-muted/80 text-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
              {aiResponding && (
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
              <Button size="sm" onClick={sendMessage} disabled={!input.trim()} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RoomChat;
