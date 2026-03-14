import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { useBlockReport } from "@/hooks/useBlockReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MediaCapture from "@/components/MediaCapture";
import MediaMessage from "@/components/MediaMessage";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Heart, Reply, User, ShieldBan } from "lucide-react";
import StatusIndicator from "@/components/StatusIndicator";
import TypingIndicator from "@/components/TypingIndicator";
import { useStatusWithPrivacy, useEnhancedTypingIndicator } from "@/hooks/useRealtimeSubscriptions";

interface DMViewProps {
  otherUserId: string;
  otherUsername: string;
  onBack: () => void;
}

const DMView = ({ otherUserId, otherUsername, onBack }: DMViewProps) => {
  const { user, mpProfile } = useAuth();
  const { messages, sendMessage, toggleReaction, uploadMedia } = useDirectMessages(otherUserId);
  const { isBlocked } = useBlockReport();
  const { status: otherStatus, canView: canViewStatus } = useStatusWithPrivacy(otherUserId);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Get current user's username for typing indicator
  const myUsername = mpProfile?.username || mpProfile?.display_name || "Player";
  
  // Enhanced typing indicator with debouncing
  const { typingUsers, sendTyping } = useEnhancedTypingIndicator(`dm-${[user?.id, otherUserId].sort().join("-")}`, myUsername);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle typing input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    // Send typing start
    sendTyping(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };
  
  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      sendTyping(false);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input.trim(), "text", undefined, replyTo || undefined);
    setInput("");
    setReplyTo(null);
  };

  const handleMediaCapture = async (file: File, type: "voice" | "video" | "image") => {
    setUploading(true);
    const url = await uploadMedia(file, type);
    if (url) {
      await sendMessage("", type, url, replyTo || undefined);
      setReplyTo(null);
    }
    setUploading(false);
  };

  const replyMessage = replyTo ? messages.find(m => m.id === replyTo) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button size="sm" variant="ghost" onClick={onBack} className="h-8 w-8 p-0 active:scale-95 transition-transform">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          {canViewStatus && <StatusIndicator status={(otherStatus as any) || "invisible"} size={8} />}
          <span className="font-bold text-foreground">@{otherUsername}</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Start a conversation!</p>
        )}
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-start">
            <TypingIndicator 
              names={typingUsers} 
              color="hsl(var(--muted-foreground))" 
              variant="wave"
              size="sm"
            />
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === user?.id;
          const hasLiked = msg.reactions?.some(r => r.user_id === user?.id && r.reaction === "like");
          const likeCount = msg.reactions?.filter(r => r.reaction === "like").length || 0;

          return (
            <motion.div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              {/* Reply context */}
              {msg.reply_to_id && (
                <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-0.5 mb-1 max-w-[80%] truncate">
                  <Reply className="w-2.5 h-2.5 inline mr-1" />
                  {messages.find(m => m.id === msg.reply_to_id)?.message || "Media"}
                </div>
              )}

              <div className={`rounded-lg max-w-[85%] ${
                isMine ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"
              }`}>
                {msg.message_type !== "text" && msg.media_url ? (
                  <div className="p-1.5">
                    <MediaMessage type={msg.message_type as any} url={msg.media_url} />
                    {msg.message && <p className="text-sm px-2 py-1">{msg.message}</p>}
                  </div>
                ) : (
                  <p className="text-sm px-3 py-2">{msg.message}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 mt-0.5">
                <button onClick={() => toggleReaction(msg.id)}
                  className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full transition-colors active:scale-90 ${
                    hasLiked ? "text-red-400 bg-red-400/10" : "text-muted-foreground hover:text-red-400"
                  }`}>
                  <Heart className={`w-3 h-3 ${hasLiked ? "fill-current" : ""}`} />
                  {likeCount > 0 && likeCount}
                </button>
                <button onClick={() => setReplyTo(msg.id)}
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 active:scale-90 transition-transform">
                  <Reply className="w-3 h-3" />
                </button>
                <span className="text-[9px] text-muted-foreground/50">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Reply preview */}
      {replyMessage && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 border-t border-border">
          <span className="text-xs text-muted-foreground truncate flex-1">
            <Reply className="w-3 h-3 inline mr-1" /> Replying to: {replyMessage.message || "Media"}
          </span>
          <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground ml-2">
            ×
          </button>
        </div>
      )}

      {/* Input */}
      {isBlocked(otherUserId) ? (
        <div className="p-4 border-t border-border text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <ShieldBan className="w-4 h-4" />
            <span>You have blocked this user. Unblock to send messages.</span>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-border space-y-2">
          <MediaCapture onCapture={handleMediaCapture} disabled={uploading} />
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="text-sm bg-background border-border h-11"
            />
            <Button size="sm" onClick={handleSend} disabled={!input.trim() || uploading}
              className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim h-11 active:scale-95 transition-transform">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DMView;
