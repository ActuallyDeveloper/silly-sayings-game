import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MediaCapture from "@/components/MediaCapture";
import MediaMessage from "@/components/MediaMessage";
import { MessageCircle, Send, X, User, Heart, Reply } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AIPersonality } from "@/data/aiPersonalities";
import { getRandomReaction } from "@/data/aiPersonalities";
import AIIcon from "@/components/AIIcon";

interface ReactionCount {
  messageId: string;
  count: number;
  liked: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  icon?: string;
  color?: string;
  message: string;
  isPlayer: boolean;
  isAI?: boolean;
  message_type?: string;
  media_url?: string;
  reply_to_id?: string;
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
  const { user, mpProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Map<string, ReactionCount>>(new Map());
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [aiResponding, setAiResponding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);
  const lastPhaseRef = useRef("");
  const spontaneousTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerName = mpProfile?.username || mpProfile?.display_name || "Player";

  // Fetch reactions for all messages
  const fetchReactions = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    const { data } = await (supabase as any)
      .from("room_message_reactions")
      .select("message_id, user_id")
      .in("message_id", messageIds);

    if (data) {
      const map = new Map<string, ReactionCount>();
      for (const r of data) {
        const existing = map.get(r.message_id) || { messageId: r.message_id, count: 0, liked: false };
        existing.count++;
        if (r.user_id === user?.id) existing.liked = true;
        map.set(r.message_id, existing);
      }
      setReactions(map);
    }
  }, [user]);

  useEffect(() => {
    supabase
      .from("room_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) {
          const msgs = data.map((m: any) => ({
            id: m.id, sender: m.display_name, message: m.message,
            isPlayer: m.user_id === user?.id, isAI: false,
            message_type: m.message_type || "text",
            media_url: m.media_url,
            reply_to_id: m.reply_to_id,
          }));
          setMessages(msgs);
          fetchReactions(msgs.filter((m: any) => !m.id.startsWith("ai-")).map((m: any) => m.id));
        }
      });

    const channel = supabase
      .channel(`chat-${roomId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "room_messages",
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const msg = payload.new as any;
        setMessages(prev => [...prev, {
          id: msg.id, sender: msg.display_name, message: msg.message,
          isPlayer: msg.user_id === user?.id, isAI: false,
          message_type: msg.message_type || "text",
          media_url: msg.media_url,
          reply_to_id: msg.reply_to_id,
        }]);
        if (!open) setUnread(u => u + 1);
        if (aiPlayers.length > 0 && msg.user_id !== user?.id && Math.random() > 0.5) {
          setTimeout(() => callAIGroupChat("reply_to_player"), 1000 + Math.random() * 2000);
        }
      })
      .subscribe();

    // Real-time reactions
    const reactionsChannel = supabase
      .channel(`chat-reactions-${roomId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "room_message_reactions",
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          const r = payload.new as any;
          setReactions(prev => {
            const map = new Map(prev);
            const existing = map.get(r.message_id) || { messageId: r.message_id, count: 0, liked: false };
            existing.count++;
            if (r.user_id === user?.id) existing.liked = true;
            map.set(r.message_id, existing);
            return map;
          });
        } else if (payload.eventType === "DELETE") {
          const r = payload.old as any;
          setReactions(prev => {
            const map = new Map(prev);
            const existing = map.get(r.message_id);
            if (existing) {
              existing.count = Math.max(0, existing.count - 1);
              if (r.user_id === user?.id) existing.liked = false;
              if (existing.count === 0) map.delete(r.message_id);
              else map.set(r.message_id, existing);
            }
            return map;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(reactionsChannel);
    };
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
            name: ai.name, personality: ai.personality, chatStyle: ai.chatStyle, icon: ai.icon,
          })),
          chatHistory: getChatHistory(),
          gameContext: { phase: gamePhase, round: roundNumber, scores: gameScores, lastBlackCard, lastWinner, playerName },
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
            setMessages(prev => [...prev, {
              id: `ai-${msgIdRef.current++}`, sender: ai.name, icon: ai.icon,
              color: ai.color, message: msg.message, isPlayer: false, isAI: true,
            }]);
            if (!open) setUnread(u => u + 1);
          }, delay);
          delay += 800 + Math.random() * 1500;
        }
      }
    } catch { /* silent */ }
    setAiResponding(false);
  }, [aiPlayers, aiResponding, getChatHistory, gamePhase, roundNumber, gameScores, lastBlackCard, lastWinner, playerName, open]);

  useEffect(() => {
    if (aiPlayers.length === 0) return;
    const phaseKey = `${gamePhase}-${roundNumber}`;
    if (phaseKey === lastPhaseRef.current) return;
    lastPhaseRef.current = phaseKey;
    setTimeout(() => callAIGroupChat("phase_change"), 1000 + Math.random() * 2000);
  }, [gamePhase, roundNumber, aiPlayers.length]);

  useEffect(() => {
    if (aiPlayers.length === 0) return;
    const schedule = () => {
      spontaneousTimerRef.current = setTimeout(() => {
        if (Math.random() > 0.4) callAIGroupChat("spontaneous");
        schedule();
      }, 20000 + Math.random() * 30000);
    };
    schedule();
    return () => { if (spontaneousTimerRef.current) clearTimeout(spontaneousTimerRef.current); };
  }, [aiPlayers.length]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [open, messages.length]);

  const sendMessage = async (text?: string, type = "text", mediaUrl?: string) => {
    const msg = text?.trim() || input.trim();
    if (!msg && !mediaUrl) return;
    if (!user) return;
    
    // Optimistic local add so message shows immediately
    const optimisticId = `local-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      sender: playerName,
      message: msg || "",
      isPlayer: true,
      isAI: false,
      message_type: type,
      media_url: mediaUrl || undefined,
      reply_to_id: replyTo || undefined,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    const { data } = await (supabase as any).from("room_messages").insert({
      room_id: roomId, user_id: user.id,
      display_name: playerName, message: msg || "",
      message_type: type, media_url: mediaUrl || null,
      reply_to_id: replyTo || null,
    }).select().single();
    
    // Replace optimistic message with real one if returned
    if (data) {
      setMessages(prev => prev.map(m => m.id === optimisticId ? {
        ...m, id: data.id,
      } : m));
    }
    
    setInput("");
    setReplyTo(null);
    if (aiPlayers.length > 0 && type === "text") {
      setTimeout(() => callAIGroupChat("reply_to_player"), 800 + Math.random() * 1500);
    }
  };

  const handleMediaCapture = async (file: File, type: "voice" | "video" | "image") => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || type;
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
      await sendMessage("", type, data.publicUrl);
    }
    setUploading(false);
  };

  const handleLike = async (msgId: string) => {
    if (!user || msgId.startsWith("ai-")) return;
    const reaction = reactions.get(msgId);
    if (reaction?.liked) {
      // Unlike - find and delete
      const { data: existing } = await (supabase as any)
        .from("room_message_reactions")
        .select("id")
        .eq("message_id", msgId)
        .eq("user_id", user.id)
        .single();
      if (existing) {
        await (supabase as any).from("room_message_reactions").delete().eq("id", existing.id);
      }
    } else {
      await (supabase as any).from("room_message_reactions").insert({
        message_id: msgId, user_id: user.id, reaction: "like",
      });
    }
  };

  const replyMessage = replyTo ? messages.find(m => m.id === replyTo) : null;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 bg-accent text-accent-foreground rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95"
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
            className="fixed bottom-20 right-4 z-50 w-80 max-h-[28rem] bg-secondary border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-bold text-foreground">Room Chat</p>
              {aiPlayers.length > 0 && <p className="text-[10px] text-muted-foreground">{aiPlayers.length} AI player{aiPlayers.length !== 1 ? "s" : ""} in chat</p>}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Say something!</p>
              )}
              {messages.map(msg => {
                const reaction = reactions.get(msg.id);
                return (
                  <div key={msg.id} className={`flex flex-col ${msg.isPlayer ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-1 mb-0.5">
                      {msg.isAI && msg.icon ? (
                        <AIIcon icon={msg.icon} size={12} color={msg.color} animated={false} />
                      ) : (
                        <User className="w-3 h-3 text-muted-foreground" />
                      )}
                      <span className="text-[10px] font-bold" style={{ color: msg.isAI && msg.color ? msg.color : undefined }}>
                        {msg.sender}
                      </span>
                    </div>

                    {msg.reply_to_id && (
                      <div className="text-[9px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 mb-0.5 max-w-[80%] truncate">
                        <Reply className="w-2 h-2 inline mr-0.5" />
                        {messages.find(m => m.id === msg.reply_to_id)?.message || "Media"}
                      </div>
                    )}

                    <div className={`rounded-lg max-w-[85%] ${
                      msg.isPlayer ? "bg-accent text-accent-foreground" : msg.isAI ? "bg-muted/80 text-foreground" : "bg-muted text-foreground"
                    }`}>
                      {msg.message_type && msg.message_type !== "text" && msg.media_url ? (
                        <div className="p-1">
                          <MediaMessage type={msg.message_type as any} url={msg.media_url} />
                          {msg.message && <p className="text-sm px-2 py-0.5">{msg.message}</p>}
                        </div>
                      ) : (
                        <p className="px-3 py-1.5 text-sm">{msg.message}</p>
                      )}
                    </div>

                    {!msg.isAI && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <button onClick={() => handleLike(msg.id)}
                          className={`text-[10px] flex items-center gap-0.5 active:scale-90 transition-transform ${reaction?.liked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}>
                          <Heart className={`w-3 h-3 ${reaction?.liked ? "fill-red-400" : ""}`} />
                          {reaction && reaction.count > 0 && <span>{reaction.count}</span>}
                        </button>
                        <button onClick={() => setReplyTo(msg.id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground active:scale-90 transition-transform">
                          <Reply className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {aiResponding && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                    AI is typing...
                  </motion.span>
                </div>
              )}
            </div>

            {replyMessage && (
              <div className="flex items-center justify-between px-3 py-1 bg-muted/50 border-t border-border">
                <span className="text-[10px] text-muted-foreground truncate flex-1">
                  <Reply className="w-2.5 h-2.5 inline mr-0.5" /> {replyMessage.message || "Media"}
                </span>
                <button onClick={() => setReplyTo(null)} className="text-muted-foreground text-xs ml-1">×</button>
              </div>
            )}

            <div className="p-2 border-t border-border space-y-1.5">
              <MediaCapture onCapture={handleMediaCapture} disabled={uploading} mode="multiplayer" />
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="text-sm bg-background border-border"
                />
                <Button size="sm" onClick={() => sendMessage()} disabled={!input.trim() || uploading}
                  className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim active:scale-95 transition-transform">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RoomChat;
