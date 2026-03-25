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

interface StartGameOptions {
  aiPlayerCount?: number;
  aiPlayersData?: any[];
  maxRounds?: number;
  pointsToWin?: number;
}

type Phase = "lobby" | "submitting" | "judging" | "round_result" | "game_over";

const HAND_SIZE = 7;

function parseAiSubmissionsFromRoom(room: Room | null): AISubmissionMP[] {
  if (!room?.ai_players_data?.length) return [];

  return room.ai_players_data
    .filter((ai: any) => ai?.submission_round === room.current_round && Array.isArray(ai?.current_submission_ids) && ai.current_submission_ids.length > 0)
    .map((ai: any, index: number) => ({
      aiIndex: typeof ai.id === "number" ? ai.id - 1 : index,
      aiName: ai.name || `AI Player ${index + 1}`,
      white_card_ids: ai.current_submission_ids,
    }));
}

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
  const [countdownStarted, setCountdownStarted] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isCzar = room?.czar_user_id === user?.id;
  const myPlayer = players.find((p) => p.user_id === user?.id);
  const currentBlackCard = room?.current_black_card_id
    ? blackCards.find((c) => c.id === room.current_black_card_id) || null
    : null;
  const myHand: WhiteCard[] = (myPlayer?.hand || [])
    .map((id: number) => whiteCards.find((c) => c.id === id))
    .filter(Boolean) as WhiteCard[];
  const mySubmission = submissions.find((s) => s.user_id === user?.id && s.round_number === room?.current_round);

  const aiPlayerCount = room?.ai_player_count || 0;
  const humanNonCzar = players.filter((p) => p.user_id !== room?.czar_user_id);
  const currentRoundSubs = submissions.filter((s) => s.round_number === room?.current_round);
  const allSubmitted =
    room?.status === "playing" &&
    humanNonCzar.length > 0 &&
    currentRoundSubs.length >= humanNonCzar.length &&
    (aiPlayerCount === 0 || aiSubmissions.length >= aiPlayerCount);

  // Reset countdown when room transitions out of waiting
  useEffect(() => {
    if (room && room.status !== "waiting") {
      setCountdownStarted(false);
    }
  }, [room?.status]);

  // Derive phase
  useEffect(() => {
    if (!room) {
      setPhase("lobby");
      return;
    }
    if (room.status === "waiting") {
      setPhase("lobby");
      return;
    }
    if (room.status === "finished") {
      setPhase("game_over");
      return;
    }
    if (roundWinner) {
      setPhase("round_result");
      return;
    }
    if (allSubmitted) {
      setPhase("judging");
      return;
    }
    setPhase("submitting");
  }, [room, allSubmitted, roundWinner]);

  // Fetch players helper - used on join and for periodic refresh
  const fetchPlayers = useCallback(async (roomId: string) => {
    const { data: ps } = await supabase.from("room_players").select("*").eq("room_id", roomId);
    if (ps) {
      setPlayers(
        ps.map((p: any) => ({
          ...p,
          hand: Array.isArray(p.hand) ? p.hand : JSON.parse(p.hand || "[]"),
          ready: !!p.ready,
        })),
      );
    }
  }, []);

  // Fetch submissions helper
  const fetchSubmissions = useCallback(async (roomId: string) => {
    const { data: subs } = await supabase.from("room_submissions").select("*").eq("room_id", roomId);
    if (subs) {
      setSubmissions(
        subs.map((s: any) => ({
          ...s,
          white_card_ids: Array.isArray(s.white_card_ids) ? s.white_card_ids : JSON.parse(s.white_card_ids || "[]"),
        })),
      );
    }
  }, []);

  useEffect(() => {
    setAiSubmissions(parseAiSubmissionsFromRoom(room));
  }, [room?.current_round, room?.ai_players_data, room?.status]);

  // Realtime subscriptions
  useEffect(() => {
    if (!room?.id) return;

    // Fetch current state immediately when room is set
    fetchPlayers(room.id);
    if (room.status === "playing") {
      fetchSubmissions(room.id);
    }

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const newRoom = payload.new as any;
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    ...newRoom,
                    used_black_card_ids: Array.isArray(newRoom.used_black_card_ids)
                      ? newRoom.used_black_card_ids
                      : JSON.parse(newRoom.used_black_card_ids || "[]"),
                    used_white_card_ids: Array.isArray(newRoom.used_white_card_ids)
                      ? newRoom.used_white_card_ids
                      : JSON.parse(newRoom.used_white_card_ids || "[]"),
                    ai_players_data: Array.isArray(newRoom.ai_players_data)
                      ? newRoom.ai_players_data
                      : JSON.parse(newRoom.ai_players_data || "[]"),
                  }
                : prev,
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const p = payload.new as any;
            setPlayers((prev) => {
              if (prev.some((x) => x.user_id === p.user_id)) return prev;
              return [
                ...prev,
                { ...p, hand: Array.isArray(p.hand) ? p.hand : JSON.parse(p.hand || "[]"), ready: !!p.ready },
              ];
            });
          } else if (payload.eventType === "UPDATE") {
            const p = payload.new as any;
            setPlayers((prev) =>
              prev.map((x) =>
                x.id === p.id
                  ? { ...p, hand: Array.isArray(p.hand) ? p.hand : JSON.parse(p.hand || "[]"), ready: !!p.ready }
                  : x,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) => prev.filter((x) => x.id !== (payload.old as any).id));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_submissions", filter: `room_id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const s = payload.new as any;
            setSubmissions((prev) => {
              if (prev.some((x) => x.id === s.id)) return prev;
              return [
                ...prev,
                {
                  ...s,
                  white_card_ids: Array.isArray(s.white_card_ids)
                    ? s.white_card_ids
                    : JSON.parse(s.white_card_ids || "[]"),
                },
              ];
            });
          } else if (payload.eventType === "UPDATE") {
            const s = payload.new as any;
            setSubmissions((prev) =>
              prev.map((x) =>
                x.id === s.id
                  ? {
                      ...s,
                      white_card_ids: Array.isArray(s.white_card_ids)
                        ? s.white_card_ids
                        : JSON.parse(s.white_card_ids || "[]"),
                    }
                  : x,
              ),
            );
          }
        },
      )
      // Listen for AI submissions broadcast from host
      .on("broadcast", { event: "ai_submissions" }, (payload) => {
        if (payload.payload?.submissions) {
          setAiSubmissions(payload.payload.submissions as AISubmissionMP[]);
        }
      })
      // Listen for round winner broadcast
      .on("broadcast", { event: "round_winner" }, (payload) => {
        if (payload.payload?.winner) {
          setRoundWinner(payload.payload.winner);
        }
      })
      // Listen for countdown broadcast from host
      .on("broadcast", { event: "countdown_start" }, () => {
        setCountdownStarted(true);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, fetchPlayers, fetchSubmissions]);

  // Re-fetch players periodically while in lobby to catch any missed updates
  useEffect(() => {
    if (!room?.id || room.status !== "waiting") return;
    const interval = setInterval(() => fetchPlayers(room.id), 5000);
    return () => clearInterval(interval);
  }, [room?.id, room?.status, fetchPlayers]);

  // Auto-generate AI submissions when a new round starts (host only)
  useEffect(() => {
    if (!room || room.status !== "playing" || !user || room.created_by !== user.id) return;
    if (aiPlayerCount <= 0 || !currentBlackCard) return;

    const persistedAiSubmissions = parseAiSubmissionsFromRoom(room);
    if (persistedAiSubmissions.length >= aiPlayerCount) {
      if (aiSubmissions.length !== persistedAiSubmissions.length) {
        setAiSubmissions(persistedAiSubmissions);
      }
      return;
    }

    const timeout = setTimeout(
      async () => {
        const pick = currentBlackCard.pick || 1;
        const usedWhites = [...room.used_white_card_ids];
        const handsInUse = players.flatMap((p) => p.hand);
        const newAiSubs: AISubmissionMP[] = [];
        const roundReservedIds = new Set<number>([...handsInUse]);

        for (let i = 0; i < aiPlayerCount; i++) {
          const availableUnused = whiteCards.filter(
            (c) => !usedWhites.includes(c.id) && !roundReservedIds.has(c.id),
          );
          const supplement = whiteCards.filter(
            (c) => !roundReservedIds.has(c.id) && !availableUnused.some((entry) => entry.id === c.id),
          );
          const picked = shuffle([...availableUnused, ...supplement])
            .slice(0, pick)
            .map((c) => c.id);

          picked.forEach((id) => roundReservedIds.add(id));
          usedWhites.push(...picked);

          const aiData = room.ai_players_data?.[i];
          newAiSubs.push({
            aiIndex: i,
            aiName: aiData?.name || `AI Player ${i + 1}`,
            white_card_ids: picked,
          });
        }

        const nextAiPlayersData = (room.ai_players_data || []).map((ai: any, index: number) => ({
          ...ai,
          current_submission_ids: newAiSubs[index]?.white_card_ids || [],
          submission_round: room.current_round,
        }));

        setAiSubmissions(newAiSubs);
        await supabase
          .from("game_rooms")
          .update({
            ai_players_data: nextAiPlayersData as any,
            used_white_card_ids: usedWhites as any,
          })
          .eq("id", room.id);

        // Broadcast AI submissions to all players in the room
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "ai_submissions",
            payload: { submissions: newAiSubs },
          });
        }
      },
      1500 + Math.random() * 1000,
    );

    return () => clearTimeout(timeout);
  }, [room?.current_round, room?.status, aiPlayerCount, currentBlackCard?.id, room?.ai_players_data, players, user?.id, aiSubmissions.length]);

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
        .insert({
          room_id: r.id,
          user_id: user.id,
          display_name: mpProfile?.username || mpProfile?.display_name || "Player",
        });
      if (joinErr) throw joinErr;

      // Players will be fetched by the realtime effect when room is set
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [user, mpProfile]);

  const joinRoom = useCallback(
    async (code: string) => {
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
          used_black_card_ids: Array.isArray(r.used_black_card_ids)
            ? r.used_black_card_ids
            : JSON.parse(r.used_black_card_ids || "[]"),
          used_white_card_ids: Array.isArray(r.used_white_card_ids)
            ? r.used_white_card_ids
            : JSON.parse(r.used_white_card_ids || "[]"),
          ai_players_data: Array.isArray(r.ai_players_data) ? r.ai_players_data : JSON.parse(r.ai_players_data || "[]"),
        });

        const { error: joinErr } = await supabase
          .from("room_players")
          .insert({
            room_id: r.id,
            user_id: user.id,
            display_name: mpProfile?.username || mpProfile?.display_name || "Player",
          });
        if (joinErr && !joinErr.message.includes("duplicate")) throw joinErr;

        // Players will be fetched by the realtime effect when room is set
      } catch (e: any) {
        setError(e.message);
      }
      setLoading(false);
    },
    [user, mpProfile],
  );

  const startGame = useCallback(async (options?: StartGameOptions) => {
    if (!room || !user || players.length < 1) return;
    setLoading(true);
    try {
      const shuffledBlack = shuffle(blackCards);
      const firstBlack = shuffledBlack[0];
      const czar = players[0].user_id;
      const nextAiPlayersData = (options?.aiPlayersData ?? room.ai_players_data ?? []).map((ai: any) => ({
        ...ai,
        score: 0,
        current_submission_ids: [],
        submission_round: null,
      }));

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

      const updatedFields = {
        status: "playing" as const,
        current_round: 1,
        czar_user_id: czar,
        current_black_card_id: firstBlack.id,
        ai_player_count: options?.aiPlayerCount ?? room.ai_player_count,
        used_black_card_ids: [firstBlack.id],
        used_white_card_ids: usedWhiteIds,
        ai_players_data: nextAiPlayersData,
        points_to_win: options?.pointsToWin ?? room.points_to_win,
        max_rounds: options?.maxRounds ?? room.max_rounds,
      };

      await supabase
        .from("game_rooms")
        .update(updatedFields as any)
        .eq("id", room.id);

      // Immediately update local room state so the phase transitions
      // without waiting for the realtime subscription to deliver the update
      setRoom((prev) => prev ? { ...prev, ...updatedFields } : prev);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [room, user, players]);

  const submitCards = useCallback(
    async (cardIds: number[]) => {
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
          await supabase
            .from("room_players")
            .update({ hand: newHand as any })
            .eq("id", myPlayer.id);
        }
      } catch (e: any) {
        setError(e.message);
      }
    },
    [room, user, myPlayer],
  );

  const pickWinner = useCallback(
    async (submissionId: string) => {
      if (!room || !isCzar) return;
      try {
        let winner: { userId: string; name: string };

        if (submissionId.startsWith("ai-")) {
          const aiIndex = parseInt(submissionId.replace("ai-", ""));
          const aiSub = aiSubmissions[aiIndex];
          if (aiSub) {
            winner = { userId: `ai-${aiIndex}`, name: aiSub.aiName };
            // Increment AI player score in ai_players_data
            const updatedAiData = (room.ai_players_data || []).map((ai: any) =>
              ai.name === aiSub.aiName ? { ...ai, score: (ai.score || 0) + 1 } : ai
            );
            await supabase
              .from("game_rooms")
              .update({ ai_players_data: updatedAiData as any })
              .eq("id", room.id);
            setRoom((prev) => prev ? { ...prev, ai_players_data: updatedAiData } : prev);
          } else return;
        } else {
          await supabase.from("room_submissions").update({ is_winner: true }).eq("id", submissionId);

          const winnerSub = submissions.find((s) => s.id === submissionId);
          if (!winnerSub) return;

          const winnerPlayer = players.find((p) => p.user_id === winnerSub.user_id);
          if (winnerPlayer) {
            await supabase
              .from("room_players")
              .update({ score: winnerPlayer.score + 1 })
              .eq("id", winnerPlayer.id);
          }
          winner = { userId: winnerSub.user_id, name: winnerPlayer?.display_name || "Unknown" };
        }

        setRoundWinner(winner);
        // Broadcast winner to all players
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "round_winner",
            payload: { winner },
          });
        }
      } catch (e: any) {
        setError(e.message);
      }
    },
    [room, isCzar, submissions, players, aiSubmissions],
  );

  const nextRound = useCallback(async () => {
    if (!room) return;
    setRoundWinner(null);
    setAiSubmissions([]);

    const nextRoundNum = room.current_round + 1;
    const allAiScores = (room.ai_players_data || []).map((ai: any) => ai.score || 0);
    if (nextRoundNum > room.max_rounds) {
      // Save scores for all players (include AI scores in top score calc)
      const topScore = Math.max(...players.map((p) => p.score), ...allAiScores);
      for (const player of players) {
        const won = player.score === topScore;
        const otherScores = [...players.filter((p) => p.user_id !== player.user_id).map((p) => p.score), ...allAiScores];
        await supabase.rpc("save_multiplayer_score", {
          _user_id: player.user_id,
          _player_score: player.score,
          _ai_score: Math.max(...otherScores, 0),
          _rounds: room.current_round,
          _won: won,
        });
      }
      await supabase.from("game_rooms").update({ status: "finished" }).eq("id", room.id);
      return;
    }

    // Check if someone hit points_to_win (include AI scores)
    const aiScores = (room.ai_players_data || []).map((ai: any) => ai.score || 0);
    const maxScore = Math.max(...players.map((p) => p.score), ...aiScores);
    if (maxScore >= room.points_to_win) {
      for (const player of players) {
        const won = player.score === maxScore;
        const otherScores = [...players.filter((p) => p.user_id !== player.user_id).map((p) => p.score), ...aiScores];
        await supabase.rpc("save_multiplayer_score", {
          _user_id: player.user_id,
          _player_score: player.score,
          _ai_score: Math.max(...otherScores, 0),
          _rounds: room.current_round,
          _won: won,
        });
      }
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
        const newCards = shuffle(availableWhites)
          .slice(0, needed)
          .map((c) => c.id);
        const newHand = [...currentHand, ...newCards];
        usedWhites.push(...newCards);
        await supabase
          .from("room_players")
          .update({ hand: newHand as any })
          .eq("id", player.id);
      }
    }

    await supabase
      .from("game_rooms")
      .update({
        current_round: nextRoundNum,
        czar_user_id: nextCzar,
        current_black_card_id: nextBlack.id,
        used_black_card_ids: [...usedBlacks, nextBlack.id] as any,
        used_white_card_ids: usedWhites as any,
        ai_players_data: (room.ai_players_data || []).map((ai: any) => ({
          ...ai,
          current_submission_ids: [],
          submission_round: null,
        })) as any,
      })
      .eq("id", room.id);
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
    const newReady = !myPlayer.ready;
    setPlayers((prev) => prev.map((p) => (p.id === myPlayer.id ? { ...p, ready: newReady } : p)));
    const { error } = await (supabase as any).from("room_players").update({ ready: newReady }).eq("id", myPlayer.id);
    if (error) {
      console.error("Toggle ready error:", error);
      setError("Failed to toggle ready state");
      setPlayers((prev) => prev.map((p) => (p.id === myPlayer.id ? { ...p, ready: !newReady } : p)));
    }
  }, [myPlayer]);

  const allReady = players.length >= 1 && players.every((p) => p.ready);
  const totalParticipants = players.length + (room?.ai_player_count || 0);
  // canStart: 2+ humans all ready — AI count is configured locally in lobby and applied on start
  const canStart = allReady && players.length >= 2;

  const broadcastCountdown = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "countdown_start",
        payload: {},
      });
    }
    setCountdownStarted(true);
  }, []);

  // Reset countdown flag when game starts
  useEffect(() => {
    if (room?.status === "playing") {
      setCountdownStarted(false);
    }
  }, [room?.status]);

  return {
    room,
    players,
    submissions,
    aiSubmissions,
    phase,
    error,
    loading,
    isCzar,
    myPlayer,
    myHand,
    currentBlackCard,
    mySubmission,
    allSubmitted,
    roundWinner,
    allReady,
    canStart,
    totalParticipants,
    countdownStarted,
    createRoom,
    joinRoom,
    startGame,
    submitCards,
    pickWinner,
    nextRound,
    leaveRoom,
    toggleReady,
    broadcastCountdown,
  };
}
