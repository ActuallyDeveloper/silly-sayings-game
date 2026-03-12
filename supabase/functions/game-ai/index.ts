import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const callAI = async (messages: { role: string; content: string }[], temp = 0.9) => {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages, temperature: temp }),
      });
      if (!resp.ok) {
        if (resp.status === 429) throw { status: 429, message: "Rate limited" };
        if (resp.status === 402) throw { status: 402, message: "Payment required" };
        throw new Error("AI gateway error");
      }
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "";
    };

    const jsonResponse = (data: any) =>
      new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const parseJSON = (text: string) => {
      try {
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
        return JSON.parse(match ? (match[1] || match[0]).trim() : text.trim());
      } catch { return null; }
    };

    if (type === "ai_pick_multi") {
      const { blackCard, pick, aiPlayers } = body;
      const prompt = `Cards Against Humanity. Black card: "${blackCard}". Pick ${pick} card(s) each.\n\n${aiPlayers.map((p: any) => `"${p.name}" (${p.personality || 'funny'}): ${p.cards.join(", ")}`).join("\n")}\n\nReturn JSON: {"picks": [{"name": "Name", "selectedCards": ["card"]}]}. ONLY valid JSON.`;
      const result = await callAI([{ role: "user", content: prompt }]);
      return jsonResponse(parseJSON(result) || { picks: [] });
    }

    if (type === "judge_multi") {
      const { blackCard, submissions } = body;
      const prompt = `Cards Against Humanity judge. Black card: "${blackCard}"\n\n${submissions.map((s: any) => `${s.name}: ${s.cards.join(", ")}`).join("\n")}\n\nPick funniest. JSON: {"winner": "exact name", "reason": "short reason"}. ONLY JSON.`;
      const result = await callAI([{ role: "user", content: prompt }]);
      return jsonResponse(parseJSON(result) || { winner: submissions[0]?.name, reason: "Random" });
    }

    if (type === "trash_talk") {
      const { blackCard, playerCards } = body;
      const prompt = `Cards Against Humanity. Black: "${blackCard}". Winner: "${playerCards.join(", ")}". Write a SHORT (max 15 words) funny comment. No quotes.`;
      const result = await callAI([{ role: "user", content: prompt }]);
      return jsonResponse({ text: result.trim() });
    }

    // Intelligent group chat - AI players chat like real humans
    if (type === "group_chat") {
      const { aiPlayers, chatHistory, gameContext, trigger } = body;
      // aiPlayers: [{name, personality, chatStyle, avatar}]
      // chatHistory: [{sender, message}] last ~20 messages
      // gameContext: {phase, round, scores: [{name, score}], lastBlackCard, lastWinner, playerName}
      // trigger: "spontaneous" | "reply_to_player" | "phase_change" | "ai_reply"

      const playersList = aiPlayers.map((p: any) => `- ${p.name}: ${p.personality}. Chat style: ${p.chatStyle}`).join("\n");
      const historyText = (chatHistory || []).slice(-20).map((m: any) => `${m.sender}: ${m.message}`).join("\n") || "(no messages yet)";
      const ctx = gameContext || {};
      const scoresText = (ctx.scores || []).map((s: any) => `${s.name}: ${s.score}pts`).join(", ") || "no scores yet";

      const systemPrompt = `You are controlling multiple AI players in a Cards Against Humanity game chat. These are DISTINCT characters who act like real humans in a group chat.

CHARACTERS:
${playersList}

RULES:
- Each character has their OWN voice, slang, and vibe. Never break character.
- They shit-talk, roast each other, hype themselves up, react to the game, reply to each other naturally.
- They can be petty, competitive, funny, dramatic, or wholesome - whatever fits their personality.
- Messages should be SHORT (5-25 words max each). Like real texting.
- They DON'T always agree. They argue, tease, clap back.
- Sometimes only 1 character talks. Sometimes 2-3 reply to each other. Never force all to speak.
- Reference the actual game state: scores, who's winning/losing, what cards were played.
- If replying to a player or another AI, ACTUALLY respond to what was said. Don't just say generic stuff.
- NO quotes around messages. NO emojis in names. Be raw and real.
- Vary energy: sometimes chill, sometimes chaotic, sometimes just a one-word reaction.

GAME STATE:
- Phase: ${ctx.phase || "unknown"} | Round: ${ctx.round || "?"} 
- Scores: ${scoresText}
- Last black card: "${ctx.lastBlackCard || "none"}"
- Last winner: ${ctx.lastWinner || "nobody yet"}
- Human player: ${ctx.playerName || "Player"}

RECENT CHAT:
${historyText}

TRIGGER: ${trigger}
${trigger === "reply_to_player" ? `The human player just said something. Reply naturally - roast them, agree, clap back, whatever fits.` : ""}
${trigger === "phase_change" ? `The game phase just changed to "${ctx.phase}". React naturally.` : ""}
${trigger === "spontaneous" ? `Generate natural banter. Maybe someone comments on scores, roasts the leader, or starts random drama.` : ""}
${trigger === "ai_reply" ? `An AI character just said something. Another character should reply/react to it.` : ""}

Return a JSON array of messages. Return 1-3 messages max.
Format: [{"name": "ExactCharacterName", "message": "their message"}]
ONLY return valid JSON array. No markdown, no explanation.`;

      const result = await callAI([{ role: "system", content: systemPrompt }, { role: "user", content: "Generate the next chat messages." }], 1.0);
      const parsed = parseJSON(result);
      return jsonResponse({ messages: Array.isArray(parsed) ? parsed : [] });
    }

    // Legacy single chat (kept for backward compat)
    if (type === "chat") {
      const { playerMessage, aiName, aiPersonality, aiChatStyle } = body;
      const prompt = `You are ${aiName} in Cards Against Humanity. Personality: ${aiPersonality}. Style: ${aiChatStyle}.\nPlayer said: "${playerMessage}"\nRespond in character, max 20 words. Be funny. No quotes.`;
      const result = await callAI([{ role: "user", content: prompt }]);
      return jsonResponse({ response: result.trim() });
    }

    if (type === "judge") {
      const { blackCard, playerCards, aiCards } = body;
      const prompt = `Cards Against Humanity judge. Black: "${blackCard}"\nPlayer: "${playerCards.join(", ")}"\nAI: "${aiCards.join(", ")}"\nWhich is funnier? JSON: {"winner": "player" or "ai", "reason": "short reason"}`;
      const result = await callAI([{ role: "user", content: prompt }]);
      return jsonResponse(parseJSON(result) || { winner: "player", reason: "Random" });
    }

    return jsonResponse({ error: "Unknown type" });
  } catch (e: any) {
    const status = e?.status || 500;
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
