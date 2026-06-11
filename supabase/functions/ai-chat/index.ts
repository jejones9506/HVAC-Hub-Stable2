// HVAC Hub - Supabase Edge Function: ai-chat (Step 17)
// Deploy via Supabase CLI: supabase functions deploy ai-chat
// Or Dashboard > Edge Functions > New function (paste code, name ai-chat)
// SECRETS: Add in Dashboard > Edge Functions > Secrets:
//   - OPENAI_API_KEY=sk-...
// This keeps keys secure server-side. Client never sees them.
// Handles personality injection from user profile, multi-turn via chatSummary,
// explicit search awareness, and returns structured response for client.
// Fallback in client if Edge not deployed or error.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, userPrefs, context, history } = await req.json();

    if (!OPENAI_API_KEY) {
      // No key configured in Edge secrets: return guidance + fallback signal
      return new Response(
        JSON.stringify({
          text: `Edge AI not fully configured (no OPENAI_API_KEY secret). Using client simulation fallback.\n\nSimulated response for: "${query}"\n\n[In real deployment: Add secret and this Edge will call OpenAI with your per-user personality prefix + chatSummary for adaptive, multi-turn HVAC advice.]`,
          source: "edge-fallback-no-key",
          functionCall: query.toLowerCase().includes("search") ? { name: "search_web", args: { q: query } } : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt with personality (from PLAN.md AI workflow)
    const personality = userPrefs?.personality || "friendly technical mentor";
    const chatSummary = userPrefs?.chatSummary || "New user.";
    const custom = userPrefs?.customInstructions || "";
    const roleLevel = context?.userRole || "technician";

    const systemPrompt = `You are an expert HVAC assistant. ${personality}. 
User level: ${roleLevel}. 
Learned preferences/summary: ${chatSummary}
${custom ? "Additional instructions: " + custom : ""}
Always: 
- Prioritize safety (PPE, lockout/tagout, EPA).
- Reference codes (NEC, ASHRAE, local if location known).
- Be newcomer-friendly but detailed for masters.
- Cite sources or note "simulated/verified".
- If user says "search web", note function call and provide real-ish data.
- Keep responses practical for field techs.
- End with verification prompt if suggesting new DB data: "Is this accurate? Confirm to submit for admin review (no duplicates)."

Current context: ${JSON.stringify(context || {})}`;

    // For demo, we use a simple fetch to OpenAI (gpt-4o-mini cheap for HVAC)
    // In production use structured outputs or tools for search.
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(history || []).slice(-6), // last few turns for multi-turn
          { role: "user", content: query },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!openaiRes.ok) {
      throw new Error(`OpenAI error: ${await openaiRes.text()}`);
    }

    const openaiData = await openaiRes.json();
    const aiText = openaiData.choices?.[0]?.message?.content || "No response generated.";

    // Detect explicit search intent (per Step 14 plan)
    const functionCall = query.toLowerCase().includes("search") || query.toLowerCase().includes("web") || query.toLowerCase().includes("internet")
      ? { name: "search_web", args: { q: query } }
      : null;

    // Return structured for client (text + optional function note + usage for costs)
    return new Response(
      JSON.stringify({
        text: aiText,
        source: "supabase-edge-openai",
        functionCall,
        usage: openaiData.usage, // for cost monitoring
        model: "gpt-4o-mini",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("ai-chat edge error:", error);
    return new Response(
      JSON.stringify({
        text: `Edge error: ${error.message}. Falling back to client simulation. Check Edge logs and secrets.`,
        source: "edge-error",
        error: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 } // 200 so client can fallback gracefully
    );
  }
});