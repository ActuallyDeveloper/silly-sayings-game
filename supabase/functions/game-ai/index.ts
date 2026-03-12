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

    const callAI = async (messages: { role: string; content: string }[], model = "google/gemini-3-flash-preview", temp = 0.9) => {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature: temp }),
      });
      if (!resp.ok) {
        if (resp.status === 429) throw { status: 429, message: "Rate limited" };
        if (resp.status === 402) throw { status: 402, message: "Payment required" };
        const errText = await resp.text();
        console.error("AI gateway error:", resp.status, errText);
        throw new Error("AI gateway error");
      }
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "";
    };

    const jsonResponse = (data: any) =>
      new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const parseJSON = (text: string) => {
      try {
        // Try direct parse first
        return JSON.parse(text.trim());
      } catch {
        try {
          // Try extracting from markdown code blocks
          const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (match) return JSON.parse(match[1].trim());
          // Try finding array or object
          const arrMatch = text.match(/\[[\s\S]*\]/);
          if (arrMatch) return JSON.parse(arrMatch[0]);
          const objMatch = text.match(/\{[\s\S]*\}/);
          if (objMatch) return JSON.parse(objMatch[0]);
        } catch { /* fall through */ }
        return null;
      }
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

    // Intelligent group chat - uses a stronger model
    if (type === "group_chat") {
      const { aiPlayers, chatHistory, gameContext, trigger } = body;
      const ctx = gameContext || {};
      const scoresText = (ctx.scores || []).map((s: any) => `${s.name}: ${s.score}pts`).join(", ");
      const historyText = (chatHistory || []).slice(-15).map((m: any) => `${m.sender}: ${m.message}`).join("\n") || "(empty)";

      // Pick 1-2 random AI players to speak (not all)
      const shuffled = [...aiPlayers].sort(() => Math.random() - 0.5);
      const speakerCount = Math.random() > 0.5 ? 2 : 1;
      const speakers = shuffled.slice(0, Math.min(speakerCount, shuffled.length));
      const speakerNames = speakers.map((s: any) => `${s.name} (${s.personality}, style: ${s.chatStyle})`).join(" and ");

      let situationPrompt = "";
      if (trigger === "reply_to_player") {
        const lastPlayerMsg = (chatHistory || []).filter((m: any) => m.sender === ctx.playerName).pop();
        situationPrompt = `The human player "${ctx.playerName}" just said: "${lastPlayerMsg?.message || "hey"}". Reply to them naturally - roast, agree, clap back, whatever fits the character.`;
      } else if (trigger === "phase_change") {
        situationPrompt = `Game phase changed to "${ctx.phase}". Round ${ctx.round}. ${ctx.lastWinner ? `Last round winner: ${ctx.lastWinner}.` : ""} ${ctx.lastBlackCard ? `Last black card: "${ctx.lastBlackCard}".` : ""} React naturally to the game state.`;
      } else if (trigger === "spontaneous") {
        situationPrompt = `Generate random banter. Comment on scores, roast the leader, start drama, or just vibe. Scores: ${scoresText}.`;
      } else if (trigger === "ai_reply") {
        const lastMsg = (chatHistory || []).slice(-1)[0];
        situationPrompt = `Another AI just said: "${lastMsg?.sender}: ${lastMsg?.message}". Reply/react to it.`;
      }

      const prompt = `You are writing chat messages for AI players in Cards Against Humanity.

Characters speaking: ${speakerNames}

Situation: ${situationPrompt}

Recent chat:
${historyText}

Write ${speakers.length} short message(s) (5-20 words each). Be funny, in-character, competitive. Shit-talk is encouraged.

RESPOND WITH ONLY A JSON ARRAY, nothing else:
[{"name":"${speakers[0]?.name}"${speakers.length > 1 ? `},{"name":"${speakers[1]?.name}"` : ""},"message":"your message here"}]`;

      console.log("group_chat prompt:", prompt.substring(0, 200));
      const result = await callAI(
        [{ role: "user", content: prompt }],
        "google/gemini-3-flash-preview",
        1.0
      );
      console.log("group_chat raw result:", result);
      
      const parsed = parseJSON(result);
      console.log("group_chat parsed:", JSON.stringify(parsed));
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validate entries have name and message
        const valid = parsed.filter((m: any) => m.name && m.message).map((m: any) => ({
          name: m.name,
          message: String(m.message).slice(0, 200),
        }));
        return jsonResponse({ messages: valid });
      }
      
      // Fallback: if parsed is an object with messages array
      if (parsed?.messages && Array.isArray(parsed.messages)) {
        return jsonResponse({ messages: parsed.messages });
      }

      // Last resort fallback - generate a simple scripted response
      const fallbackAi = speakers[0] || aiPlayers[0];
      if (fallbackAi) {
        const fallbacks: Record<string, string[]> = {
          "phase_change": ["Let's go!", "New round, new drama.", "I'm feeling this one.", "Alright alright alright."],
          "reply_to_player": ["Lol okay.", "Bold move.", "Sure thing, champ.", "You wish."],
          "spontaneous": ["Anyone else bored?", "I'm winning this next one for sure.", "This game is chaos and I love it.", "Who's even leading?"],
          "ai_reply": ["Facts.", "Nah.", "You're trippin.", "Tell me more."],
        };
        const options = fallbacks[trigger] || fallbacks["spontaneous"];
        return jsonResponse({ messages: [{ name: fallbackAi.name, message: options[Math.floor(Math.random() * options.length)] }] });
      }
      
      return jsonResponse({ messages: [] });
    }

    // Legacy single chat
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
    console.error("game-ai error:", e);
    const status = e?.status || 500;
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
