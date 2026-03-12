import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  message: string;
  created_at: string;
}

interface RoomChatProps {
  roomId: string;
}

const RoomChat = ({ roomId }: RoomChatProps) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load existing messages
    supabase
      .from("room_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, msg]);
          if (!open) setUnread((u) => u + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [open, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    const displayName = profile?.display_name || user.email || "Player";
    await supabase.from("room_messages").insert({
      room_id: roomId,
      user_id: user.id,
      display_name: displayName,
      message: input.trim(),
    });
    setInput("");
  };

  return (
    <>
      {/* Chat toggle button */}
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

      {/* Chat panel */}
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
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Say something!</p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.user_id === user?.id ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] text-muted-foreground mb-0.5">{msg.display_name}</span>
                  <div
                    className={`px-3 py-1.5 rounded-lg text-sm max-w-[85%] ${
                      msg.user_id === user?.id
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
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
