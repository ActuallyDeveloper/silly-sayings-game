import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canReceiveDirectMessages, fetchRelationshipContext } from "@/lib/socialPrivacy";

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  message_type: string;
  media_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  read_at: string | null;
  sender_profile?: { display_name: string | null; username: string | null };
  reactions?: { id: string; user_id: string; reaction: string }[];
  reply_to?: DirectMessage | null;
}

export function useDirectMessages(otherUserId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!user || !otherUserId) return;
    const { data } = await (supabase as any)
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      // Fetch reactions
      const msgIds = data.map((m: any) => m.id);
      let reactions: any[] = [];
      if (msgIds.length > 0) {
        const { data: r } = await (supabase as any)
          .from("message_reactions")
          .select("*")
          .in("message_id", msgIds);
        reactions = r || [];
      }
      setMessages(data.map((m: any) => ({
        ...m,
        reactions: reactions.filter((r: any) => r.message_id === m.id),
      })));
    }
    setLoading(false);

    // Mark unread as read
    if (data && data.length > 0) {
      const unread = data.filter((m: any) => m.receiver_id === user.id && !m.read_at);
      if (unread.length > 0) {
        await (supabase as any)
          .from("direct_messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unread.map((m: any) => m.id));
      }
    }
  }, [user, otherUserId]);

  useEffect(() => {
    fetchMessages();
    if (!user || !otherUserId) return;

    const channel = supabase
      .channel(`dm-${user.id}-${otherUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => {
        fetchMessages();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, otherUserId, fetchMessages]);

  const sendMessage = async (text: string, type = "text", mediaUrl?: string, replyToId?: string) => {
    if (!user || !otherUserId) return;
    const relationship = await fetchRelationshipContext(user.id, otherUserId);
    if (relationship.blockedByMe) throw new Error("Unblock this user to send messages.");
    if (relationship.blockedByThem) throw new Error("This user is unavailable right now.");
    if (!canReceiveDirectMessages(relationship.privacy, relationship.isFriend)) {
      throw new Error("This user only accepts direct messages from friends.");
    }

    await (supabase as any).from("direct_messages").insert({
      sender_id: user.id, receiver_id: otherUserId,
      message: text || null, message_type: type,
      media_url: mediaUrl || null, reply_to_id: replyToId || null,
    });
  };

  const toggleReaction = async (messageId: string, reaction = "like") => {
    if (!user) return;
    const existing = messages.find(m => m.id === messageId)?.reactions?.find(
      r => r.user_id === user.id && r.reaction === reaction
    );
    if (existing) {
      await (supabase as any).from("message_reactions").delete().eq("id", existing.id);
    } else {
      await (supabase as any).from("message_reactions").insert({
        message_id: messageId, user_id: user.id, reaction,
      });
    }
  };

  const uploadMedia = async (file: File, type: string) => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || type;
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return data.publicUrl;
  };

  return { messages, loading, sendMessage, toggleReaction, uploadMedia, refresh: fetchMessages };
}
