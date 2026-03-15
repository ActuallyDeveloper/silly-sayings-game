import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { blackCards, whiteCards, shuffle } from "@/data/cards";
import type { BlackCard, WhiteCard } from "@/data/cards";

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  score: number;
  hand: number[];
  ready: boolean;
}

export interface Room {
  id: string;
  room_code: string;
  status: "waiting" | "playing" | "finished";
  current_round: number;
  max_rounds: number;
  czar_user_id: string | null;
  current_black_card_id: number | null;
  created_by: string;
  used_black_card_ids: number[];
  used_white_card_ids: number[];
  ai_player_count: number;
  ai_players_data: any[];
  points_to_win: number;
}

export interface Submission {
  id: string;
  room_id: string;
  round_number: number;
  user_id: string;
  white_card_ids: number[];
  is_winner: boolean;
}

export interface AISubmissionMP {
  aiIndex: number;
  aiName: string;
  white_card_ids: number[];
}

type Phase = "lobby" | "submitting" | "judging" | "round_result" | "game_over";

const HAND_SIZE = 7;

export function useMultiplayerGame() {
  const { user, mpProfile } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [aiSubmissions, setAiSubmissions] = useState<AISubmissionMP[]>([]);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [roundWinner, setRoundWinner] = useState<{ userId: string; name: string } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isCzar = room?.czar_user_id === user?.id;
  const myPlayer = players.find((p) => p.user_id === user?.id);
  const currentBlackCard = room?.current_black_card_id
    ? blackCards.find((c) => c.id === room.current_black_card_id) || null
    : null;
  const myHand: WhiteCard[] = (myPlayer?.hand || [])
    .map((id: number) => whiteCards.find((c) => c.id === id))
    .filter(Boolean) as WhiteCard[];
  const mySubmission = submissions.find(
    (s) => s.user_id === user?.id && s.round_number === room?.current_round
  );

  const aiPlayerCount = room?.ai_player_count || 0;
  const humanNonCzar = players.filter((p) => p.user_id !== room?.czar_user_id);
  const currentRoundSubs = submissions.filter((s) => s.round_number === room?.current_round);
  // All submitted when human non-czars submitted + AI cards are ready
  const allSubmitted = room?.status === "playing" &&
    humanNonCzar.length > 0 &&
    currentRoundSubs.length >= humanNonCzar.length &&
    (aiPlayerCount === 0 || aiSubmissions.length >= aiPlayerCount);

  // Derive phase
  useEffect(() => {
    if (!room) { setPhase("lobby"); return; }
    if (room.status === "waiting") { setPhase("lobby"); return; }
    if (room.status === "finished") { setPhase("game_over"); return; }
    if (roundWinner) { setPhase("round_result"); return; }
    if (allSubmitted) { setPhase("judging"); return; }
    setPhase("submitting");
  }, [room, allSubmitted, roundWinner]);

  // Realtime subscriptions
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const newRoom = payload.new as any;
            setRoom((prev) => prev ? {
              ...prev,
              ...newRoom,
              used_black_card_ids: Array.isArray(newRoom.used_black_card_ids) ? newRoom.used_black_card_ids : JSON.parse(newRoom.used_black_card_ids || "[]"),
              used_white_card_ids: Array.isArray(newRoom.used_white_card_ids) ? newRoom.used_white_card_ids : JSON.parse(newRoom.used_white_card_ids || "[]"),
              ai_players_data: Array.isArray(newRoom.ai_players_data) ? newRoom.ai_players_data : JSON.parse(newRoom.ai_players_data || "[]"),
            } : prev);
          }
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const p = payload.new as any;
            setPlayers((prev) => [...prev.filter((x) => x.user_id !== p.user_id), { ...p, hand: Array.isArray(p.hand) ? p.hand : JSON.parse(p.hand || "[]"), ready: !!p.ready }]);
          } else if (payload.eventType === "UPDATE") {
            const p = payload.new as any;
            setPlayers((prev) => prev.map((x) => x.id === p.id ? { ...p, hand: Array.isArray(p.hand) ? p.hand : JSON.parse(p.hand || "[]"), ready: !!p.ready } : x));
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) => prev.filter((x) => x.id !== (payload.old as any).id));
          }
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "room_submissions", filter: `room_id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const s = payload.new as any;
            setSubmissions((prev) => [...prev, { ...s, white_card_ids: Array.isArray(s.white_card_ids) ? s.white_card_ids : JSON.parse(s.white_card_ids || "[]") }]);
          } else if (payload.eventType === "UPDATE") {
            const s = payload.new as any;
            setSubmissions((prev) => prev.map((x) => x.id === s.id ? { ...s, white_card_ids: Array.isArray(s.white_card_ids) ? s.white_card_ids : JSON.parse(s.white_card_ids || "[]") } : x));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [room?.id]);

  // Auto-generate AI submissions when a new round starts (host only)
  useEffect(() => {
    if (!room || room.status !== "playing" || !user || room.created_by !== user.id) return;
    if (aiPlayerCount <= 0 || !currentBlackCard) return;

    const timeout = setTimeout(() => {
      const pick = currentBlackCard.pick || 1;
      const usedWhites = [...room.used_white_card_ids];
      const handsInUse = players.flatMap(p => p.hand);
      const newAiSubs: AISubmissionMP[] = [];

      for (let i = 0; i < aiPlayerCount; i++) {
        const available = whiteCards.filter(
          (c) => !usedWhites.includes(c.id) && !handsInUse.includes(c.id)
        );
        const picked = shuffle(available).slice(0, pick).map((c) => c.id);
        usedWhites.push(...picked);
        
        const aiData = room.ai_players_data?.[i];
        newAiSubs.push({
          aiIndex: i,
          aiName: aiData?.name || `AI Player ${i + 1}`,
          white_card_ids: picked,
        });
      }

      setAiSubmissions(newAiSubs);
    }, 1500 + Math.random() * 1000);

    return () => clearTimeout(timeout);
  }, [room?.current_round, room?.status, aiPlayerCount, currentBlackCard?.id]);

  const createRoom = useCallback(async () => {
    if (!user || !mpProfile) return;
    setLoading(true);
    setError("");
    try {
      const { data: codeData, error: codeErr } = await supabase.rpc("generate_room_code");
      if (codeErr) throw codeErr;
      const code = codeData as string;

      const { data: roomData, error: roomErr } = await supabase
        .from("game_rooms")
        .insert({ room_code: code, created_by: user.id })
        .select()
        .single();
      if (roomErr) throw roomErr;

      const r = roomData as any;
      setRoom({
        ...r,
        used_black_card_ids: Array.isArray(r.used_black_card_ids) ? r.used_black_card_ids : [],
        used_white_card_ids: Array.isArray(r.used_white_card_ids) ? r.used_white_card_ids : [],
        ai_players_data: Array.isArray(r.ai_players_data) ? r.ai_players_data : [],
      });

      const { error: joinErr } = await supabase
        .from("room_players")
        .insert({ room_id: r.id, user_id: user.id, display_name: mpProfile?.username || mpProfile?.display_name || "Player" });
      if (joinErr) throw joinErr;

      const { data: ps } = await supabase.from("room_players").select("*").eq("room_id", r.id);
      setPlayers((ps || []).map((p: any) => ({ ...p, hand: Array.isArray(p.hand) ? p.hand : [], ready: !!p.ready })));
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [user, mpProfile]);

  const joinRoom = useCallback(async (code: string) => {
    if (!user || !mpProfile) return;
    setLoading(true);
    setError("");
    try {
      const { data: roomData, error: roomErr } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("room_code", code.toUpperCase())
        .single();
      if (roomErr) throw new Error("Room not found");
      if (roomData.status !== "waiting") throw new Error("Game already started");

      const r = roomData as any;
      setRoom({
        ...r,
        used_black_card_ids: Array.isArray(r.used_black_card_ids) ? r.used_black_card_ids : JSON.parse(r.used_black_card_ids || "[]"),
        used_white_card_ids: Array.isArray(r.used_white_card_ids) ? r.used_white_card_ids : JSON.parse(r.used_white_card_ids || "[]"),
        ai_players_data: Array.isArray(r.ai_players_data) ? r.ai_players_data : JSON.parse(r.ai_players_data || "[]"),
      });

      const { error: joinErr } = await supabase
        .from("room_players")
        .insert({ room_id: r.id, user_id: user.id, display_name: mpProfile?.username || mpProfile?.display_name || "Player" });
      if (joinErr && !joinErr.message.includes("duplicate")) throw joinErr;

      const { data: ps } = await supabase.from("room_players").select("*").eq("room_id", r.id);
      setPlayers((ps || []).map((p: any) => ({ ...p, hand: Array.isArray(p.hand) ? p.hand : [], ready: !!p.ready })));
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [user, mpProfile]);

  const startGame = useCallback(async () => {
    if (!room || !user || players.length < 1) return;
    setLoading(true);
    try {
      const shuffledBlack = shuffle(blackCards);
      const firstBlack = shuffledBlack[0];
      const czar = players[0].user_id;

      const shuffledWhite = shuffle(whiteCards);
      let cardIndex = 0;
      const usedWhiteIds: number[] = [];

      for (const player of players) {
        const hand = shuffledWhite.slice(cardIndex, cardIndex + HAND_SIZE).map((c) => c.id);
        usedWhiteIds.push(...hand);
        cardIndex += HAND_SIZE;

        await supabase
          .from("room_players")
          .update({ hand: hand as any })
          .eq("id", player.id);
      }

      await supabase
        .from("game_rooms")
        .update({
          status: "playing",
          current_round: 1,
          czar_user_id: czar,
          current_black_card_id: firstBlack.id,
          used_black_card_ids: [firstBlack.id] as any,
          used_white_card_ids: usedWhiteIds as any,
        })
        .eq("id", room.id);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [room, user, players]);

  const submitCards = useCallback(async (cardIds: number[]) => {
    if (!room || !user) return;
    try {
      await supabase.from("room_submissions").insert({
        room_id: room.id,
        round_number: room.current_round,
        user_id: user.id,
        white_card_ids: cardIds as any,
      });

      if (myPlayer) {
        const newHand = myPlayer.hand.filter((id) => !cardIds.includes(id));
        await supabase.from("room_players").update({ hand: newHand as any }).eq("id", myPlayer.id);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [room, user, myPlayer]);

  const pickWinner = useCallback(async (submissionId: string) => {
    if (!room || !isCzar) return;
    try {
      // Check if it's an AI submission (local state)
      if (submissionId.startsWith("ai-")) {
        const aiIndex = parseInt(submissionId.replace("ai-", ""));
        const aiSub = aiSubmissions[aiIndex];
        if (aiSub) {
          setRoundWinner({
            userId: `ai-${aiIndex}`,
            name: aiSub.aiName,
          });
        }
        return;
      }

      await supabase.from("room_submissions").update({ is_winner: true }).eq("id", submissionId);

      const winnerSub = submissions.find((s) => s.id === submissionId);
      if (!winnerSub) return;

      const winnerPlayer = players.find((p) => p.user_id === winnerSub.user_id);
      if (winnerPlayer) {
        await supabase.from("room_players").update({ score: winnerPlayer.score + 1 }).eq("id", winnerPlayer.id);
      }

      setRoundWinner({
        userId: winnerSub.user_id,
        name: winnerPlayer?.display_name || "Unknown",
      });
    } catch (e: any) {
      setError(e.message);
    }
  }, [room, isCzar, submissions, players, aiSubmissions]);

  const nextRound = useCallback(async () => {
    if (!room) return;
    setRoundWinner(null);
    setAiSubmissions([]);

    const nextRoundNum = room.current_round + 1;
    if (nextRoundNum > room.max_rounds) {
      await supabase.from("game_rooms").update({ status: "finished" }).eq("id", room.id);
      return;
    }

    const czarIndex = players.findIndex((p) => p.user_id === room.czar_user_id);
    const nextCzar = players[(czarIndex + 1) % players.length].user_id;

    const usedBlacks = room.used_black_card_ids;
    const available = blackCards.filter((c) => !usedBlacks.includes(c.id));
    const nextBlack = available.length > 0 ? shuffle(available)[0] : blackCards[0];

    const usedWhites = [...room.used_white_card_ids];
    for (const player of players) {
      const currentHand = player.hand;
      if (currentHand.length < HAND_SIZE) {
        const availableWhites = whiteCards.filter((c) => !usedWhites.includes(c.id) && !currentHand.includes(c.id));
        const needed = HAND_SIZE - currentHand.length;
        const newCards = shuffle(availableWhites).slice(0, needed).map((c) => c.id);
        const newHand = [...currentHand, ...newCards];
        usedWhites.push(...newCards);
        await supabase.from("room_players").update({ hand: newHand as any }).eq("id", player.id);
      }
    }

    await supabase.from("game_rooms").update({
      current_round: nextRoundNum,
      czar_user_id: nextCzar,
      current_black_card_id: nextBlack.id,
      used_black_card_ids: [...usedBlacks, nextBlack.id] as any,
      used_white_card_ids: usedWhites as any,
    }).eq("id", room.id);
  }, [room, players]);

  const leaveRoom = useCallback(async () => {
    if (!room || !user) return;
    await supabase.from("room_players").delete().eq("room_id", room.id).eq("user_id", user.id);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    setRoom(null);
    setPlayers([]);
    setSubmissions([]);
    setAiSubmissions([]);
    setPhase("lobby");
  }, [room, user]);

  const toggleReady = useCallback(async () => {
    if (!myPlayer) return;
    const { error } = await (supabase as any).from("room_players").update({ ready: !myPlayer.ready }).eq("id", myPlayer.id);
    if (error) {
      console.error("Toggle ready error:", error);
      setError("Failed to toggle ready state");
    }
  }, [myPlayer]);

  const allReady = players.length >= 1 && players.every((p) => p.ready);

  return {
    room, players, submissions, aiSubmissions, phase, error, loading,
    isCzar, myPlayer, myHand, currentBlackCard, mySubmission, allSubmitted, roundWinner,
    allReady,
    createRoom, joinRoom, startGame, submitCards, pickWinner, nextRound, leaveRoom, toggleReady,
  };
}
