import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, blackCard, playerCards, aiCards, submissions, pick, aiPlayers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "judge") {
      systemPrompt = `You are the judge in a Cards Against Humanity-style game called "Exotic". You must pick the funnier answer. Be edgy, irreverent, and have a dark sense of humor. You appreciate unexpected, absurd, and darkly funny combinations. Respond with ONLY valid JSON: {"winner": "player" or "ai", "reason": "one witty sentence explaining your choice"}`;
      userPrompt = `Black card (prompt): "${blackCard}"\n\nPlayer's answer: "${playerCards.join(", ")}"\nAI's answer: "${aiCards.join(", ")}"\n\nWhich answer is funnier? Pick one.`;
    } else if (type === "judge_multi") {
      systemPrompt = `You are the judge in a Cards Against Humanity-style game called "Exotic". Pick the FUNNIEST answer from multiple submissions. Be edgy, irreverent, and have a dark sense of humor. You appreciate unexpected, absurd, and darkly funny combinations. Respond with ONLY valid JSON: {"winner": "exact player name", "reason": "one witty sentence explaining your choice"}`;
      const submissionsList = submissions.map((s: any) => `${s.name}: "${s.cards.join(", ")}"`).join("\n");
      userPrompt = `Black card: "${blackCard}"\n\nSubmissions:\n${submissionsList}\n\nWhich is the funniest? Pick one. Use the EXACT player name in your response.`;
    } else if (type === "ai_pick_multi") {
      systemPrompt = `You are helping AI players in a Cards Against Humanity-style game called "Exotic" pick cards. For each AI player, pick the funniest ${pick || 1} card(s) from their available hand to play against the black card prompt. Pick cards that create the funniest, most absurd, or most unexpected combinations. Respond with ONLY valid JSON: {"picks": [{"name": "player name", "selectedCards": ["card text"]}]}`;
      const playersList = aiPlayers.map((p: any) => `${p.name}'s hand: ${p.cards.join(", ")}`).join("\n");
      userPrompt = `Black card: "${blackCard}"\nEach AI needs to pick ${pick || 1} card(s).\n\n${playersList}\n\nPick the funniest cards for each AI player.`;
    } else if (type === "trash_talk") {
      systemPrompt = `You are a savage, witty commentator for a Cards Against Humanity-style game called "Exotic". Give a SHORT (max 15 words), brutally funny one-liner commenting on the card that was just played. Be sarcastic, edgy, and entertaining. No emojis. Just raw wit.`;
      userPrompt = `The prompt was: "${blackCard}"\nThe card played was: "${playerCards.join(", ")}"\n\nGive your hot take.`;
    } else if (type === "generate_cards") {
      systemPrompt = `You generate new cards for a Cards Against Humanity-style game called "Exotic". Generate edgy, irreverent, darkly funny cards. Respond with ONLY valid JSON.`;
      userPrompt = `Generate 5 new black cards (prompts with "_" blanks) and 10 new white cards (funny answers). Format: {"blackCards": [{"text": "...", "pick": 1}], "whiteCards": [{"text": "..."}]}. Make them original, shocking, and hilarious.`;
    } else {
      throw new Error("Invalid type");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let result;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      result = JSON.parse(jsonStr);
    } catch {
      result = { text: content };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("game-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
