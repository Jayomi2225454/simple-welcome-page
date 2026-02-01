import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Cost tracking (approximate costs per 1K tokens)
const MODEL_COSTS = {
  "google/gemini-3-flash-preview": { input: 0.00015, output: 0.0006 },
  "google/gemini-2.5-flash": { input: 0.00015, output: 0.0006 },
  "google/gemini-2.5-pro": { input: 0.00125, output: 0.005 },
};

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, executeRegistration, registrationData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle direct registration execution
    if (executeRegistration && registrationData) {
      return await handleDirectRegistration(supabase, userId, registrationData, corsHeaders);
    }

    // Fetch context data for the AI
    const contextData = await fetchContextData(supabase, userId);
    
    const systemPrompt = buildSystemPrompt(contextData, userId);
    
    const startTime = Date.now();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          message: "⚠️ Rate limit reached. Please try again in a moment.",
          error: "rate_limit",
          costInfo: getCostInfo()
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          message: "⚠️ AI credits exhausted. Please contact support.",
          error: "payment_required",
          costInfo: getCostInfo()
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const endTime = Date.now();
    const responseTimeMs = endTime - startTime;

    const aiMessage = data.choices?.[0]?.message?.content || "I'm here to help!";
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };

    // Calculate cost estimate
    const modelCost = MODEL_COSTS[DEFAULT_MODEL];
    const estimatedCost = (
      (usage.prompt_tokens / 1000) * modelCost.input +
      (usage.completion_tokens / 1000) * modelCost.output
    ).toFixed(6);

    // Parse action from AI response
    const action = parseActionFromResponse(aiMessage, contextData);

    // Add user profile for registration
    let userProfile = null;
    if (userId && contextData.profile) {
      userProfile = {
        name: contextData.profile.name || contextData.profile.display_name || "Player",
        gameId: contextData.profile.game_id || "Not set",
      };
    }

    return new Response(JSON.stringify({
      message: aiMessage,
      action,
      userProfile,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens),
        estimatedCost: `$${estimatedCost}`,
        responseTimeMs,
      },
      costInfo: getCostInfo(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(JSON.stringify({ 
      message: "Sorry, I encountered an error. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error",
      costInfo: getCostInfo()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getCostInfo() {
  return {
    model: DEFAULT_MODEL,
    modelDisplayName: "Gemini 3 Flash Preview",
    costPer1kTokens: {
      input: "$0.00015",
      output: "$0.0006",
    },
    note: "Costs are approximate. Actual costs depend on usage.",
    freeIncluded: "Yes - Free tier includes monthly usage",
  };
}

async function fetchContextData(supabase: any, userId?: string) {
  const context: any = {
    tournaments: [],
    profile: null,
    walletBalance: null,
    registrations: [],
  };

  // Fetch upcoming tournaments
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, game, status, entry_fee, prize_pool, start_date, max_participants, current_participants, team_mode, team_size")
    .in("status", ["upcoming", "registration_open", "live"])
    .order("start_date", { ascending: true })
    .limit(10);

  context.tournaments = tournaments || [];

  if (userId) {
    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    context.profile = profile;

    // Fetch wallet balance
    const { data: wallet } = await supabase
      .from("wallet_balances")
      .select("available_balance, pending_balance")
      .eq("user_id", userId)
      .eq("mode", "esports")
      .single();

    context.walletBalance = wallet;

    // Fetch user's registrations
    const { data: registrations } = await supabase
      .from("tournament_registrations")
      .select("tournament_id, status, created_at")
      .eq("user_id", userId)
      .limit(20);

    context.registrations = registrations || [];
  }

  return context;
}

function buildSystemPrompt(context: any, userId?: string) {
  const tournamentList = context.tournaments
    .map((t: any) => `- ${t.name} (${t.game}) - Entry: ${t.entry_fee || "FREE"} - Prize: ${t.prize_pool || "TBA"} - Status: ${t.status} - ID: ${t.id}`)
    .join("\n");

  const userContext = userId && context.profile
    ? `
User Profile:
- Name: ${context.profile.name || context.profile.display_name || "Not set"}
- Game ID: ${context.profile.game_id || "Not set"}
- Wallet Balance: ₹${context.walletBalance?.available_balance || 0}
- Registered Tournaments: ${context.registrations.length}
`
    : "User is not logged in.";

  return `You are Battle Mitra AI 🎮, an intelligent esports assistant for the Battle Mitra gaming platform.

PERSONALITY:
- Friendly, enthusiastic about gaming, use gaming terms naturally
- Use emojis sparingly but effectively (🎮 🏆 💰 ⚔️ 🔥)
- Keep responses concise but helpful
- Be proactive in suggesting actions

CAPABILITIES:
1. Tournament Registration - Help users register for tournaments instantly
2. Wallet Management - Check balance, guide deposits/withdrawals
3. Tournament Info - Provide details about upcoming tournaments
4. Leaderboard & Stats - Show rankings and player statistics
5. Live Match Updates - Information about ongoing matches
6. Profile Management - Help users update their profiles

AVAILABLE TOURNAMENTS:
${tournamentList || "No tournaments available right now."}

${userContext}

RESPONSE FORMAT:
- Keep responses under 200 words
- Use bullet points for lists
- Highlight important info with **bold** or emojis
- When suggesting registration, always mention the tournament name and entry fee

ACTION TRIGGERS:
- If user wants to register for a tournament, include [ACTION:auto_register:TOURNAMENT_ID:TOURNAMENT_NAME:ENTRY_FEE] in your response
- If user wants to see wallet, include [ACTION:show_wallet]
- If user wants tournaments list, include [ACTION:show_tournaments]
- If user wants leaderboards, include [ACTION:show_leaderboards]
- If user wants live matches, include [ACTION:show_live_matches]
- If user wants profile, include [ACTION:show_profile]

IMPORTANT:
- For registration, verify user is logged in first
- For paid tournaments, mention the entry fee clearly
- Always confirm before registering
- If user hasn't set game_id, prompt them to update profile first`;
}

function parseActionFromResponse(response: string, context: any): any {
  // Check for auto_register action
  const registerMatch = response.match(/\[ACTION:auto_register:([^:]+):([^:]+):([^\]]*)\]/);
  if (registerMatch) {
    return {
      action: "auto_register",
      tournamentId: registerMatch[1],
      tournamentName: registerMatch[2],
      entryFee: registerMatch[3] || "0",
    };
  }

  // Check for navigation actions
  const actionPatterns: Record<string, string> = {
    "show_wallet": "show_wallet",
    "show_tournaments": "show_tournaments",
    "show_leaderboards": "show_leaderboards",
    "show_live_matches": "show_live_matches",
    "show_profile": "show_profile",
  };

  for (const [pattern, action] of Object.entries(actionPatterns)) {
    if (response.includes(`[ACTION:${pattern}]`)) {
      return { action };
    }
  }

  return null;
}

async function handleDirectRegistration(
  supabase: any,
  userId: string,
  registrationData: { tournamentId: string },
  corsHeaders: any
) {
  try {
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({
        success: false,
        error: "Please complete your profile first (name and game ID required)",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.game_id) {
      return new Response(JSON.stringify({
        success: false,
        error: "Please set your Game ID in your profile before registering",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", registrationData.tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return new Response(JSON.stringify({
        success: false,
        error: "Tournament not found",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already registered
    const { data: existingReg } = await supabase
      .from("tournament_registrations")
      .select("id")
      .eq("user_id", userId)
      .eq("tournament_id", registrationData.tournamentId)
      .single();

    if (existingReg) {
      return new Response(JSON.stringify({
        success: false,
        error: "You are already registered for this tournament!",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check entry fee
    const entryFee = parseFloat(tournament.entry_fee?.replace(/[^0-9.]/g, "") || "0");
    
    if (entryFee > 0) {
      // Check wallet balance
      const { data: wallet } = await supabase
        .from("wallet_balances")
        .select("available_balance")
        .eq("user_id", userId)
        .eq("mode", "esports")
        .single();

      const balance = wallet?.available_balance || 0;

      if (balance < entryFee) {
        return new Response(JSON.stringify({
          success: false,
          requiresPayment: true,
          message: `Entry fee is ₹${entryFee}. Your balance: ₹${balance}. Please add funds to your wallet first.`,
          tournamentId: registrationData.tournamentId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Register for tournament
    const { error: regError } = await supabase
      .from("tournament_registrations")
      .insert({
        user_id: userId,
        tournament_id: registrationData.tournamentId,
        player_name: profile.name || profile.display_name || "Player",
        game_id: profile.game_id,
        status: "registered",
        payment_status: entryFee > 0 ? "pending" : "completed",
        payment_amount: entryFee,
      });

    if (regError) {
      console.error("Registration error:", regError);
      return new Response(JSON.stringify({
        success: false,
        error: "Registration failed. Please try again.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update tournament participant count
    await supabase
      .from("tournaments")
      .update({ current_participants: (tournament.current_participants || 0) + 1 })
      .eq("id", registrationData.tournamentId);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully registered for ${tournament.name}! 🎮`,
      details: {
        tournamentName: tournament.name,
        playerName: profile.name || profile.display_name,
        gameId: profile.game_id,
        game: tournament.game,
        entryFee: entryFee > 0 ? `₹${entryFee}` : "FREE",
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Registration execution error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "An unexpected error occurred",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
