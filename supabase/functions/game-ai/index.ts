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

    const callAI = async (messages: { role: string; content: string }[]) => {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages, temperature: 0.9 }),
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
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
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
