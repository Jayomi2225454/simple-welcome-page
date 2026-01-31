import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractedPlayerData {
  playerName: string;
  kills?: number;
  points?: number;
  position?: number;
}

interface MatchedTeamData {
  teamId: string;
  teamName: string;
  playerName: string;
  matchedPlayerName: string;
  kills: number;
  points: number;
  position: number;
  confidence: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { imageBase64, tournamentId } = await req.json();

    if (!imageBase64 || !tournamentId) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and tournamentId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing OCR for tournament: ${tournamentId}`);

    // Step 1: Use Lovable AI vision model to extract text from image
    const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an OCR expert that extracts player/team statistics from gaming screenshots or result images.
            
Extract ALL player names and their statistics (kills, points, position/rank) from the image.

Return ONLY a valid JSON array with this exact structure:
[
  {"playerName": "Player1", "kills": 5, "points": 100, "position": 1},
  {"playerName": "Player2", "kills": 3, "points": 75, "position": 2}
]

Rules:
- Extract player names exactly as shown (preserve capitalization and special characters)
- If kills are not visible, set to 0
- If points are not visible, calculate from position (1st=15, 2nd=12, 3rd=10, 4th=8, etc.)
- If position is not clear, estimate from order in the list
- Return ONLY the JSON array, no other text
- If no player data is found, return an empty array: []`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all player names and their game statistics (kills, points, position) from this screenshot:",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error("Vision API error:", visionResponse.status, errorText);
      
      if (visionResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (visionResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Vision API failed: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const extractedText = visionData.choices?.[0]?.message?.content || "[]";
    
    console.log("Extracted text from vision:", extractedText);

    // Parse the JSON response
    let extractedPlayers: ExtractedPlayerData[] = [];
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanJson = extractedText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.slice(7);
      }
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.slice(3);
      }
      if (cleanJson.endsWith("```")) {
        cleanJson = cleanJson.slice(0, -3);
      }
      cleanJson = cleanJson.trim();
      
      extractedPlayers = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Failed to parse vision response:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse extracted data", 
          rawText: extractedText,
          extractedPlayers: [] 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${extractedPlayers.length} players from image`);

    // Step 2: Fetch existing teams from the tournament points table
    const { data: existingTeams, error: teamsError } = await supabase
      .from("tournament_points")
      .select("id, team_id, team_name, points, kills, wins, position")
      .eq("tournament_id", tournamentId);

    if (teamsError) {
      console.error("Error fetching teams:", teamsError);
      throw new Error("Failed to fetch tournament teams");
    }

    // Step 3: Also fetch team members from tournament_team_members to match player names
    const { data: tournamentTeams, error: tournamentTeamsError } = await supabase
      .from("tournament_teams")
      .select(`
        id,
        team_name,
        tournament_team_members (
          user_id
        )
      `)
      .eq("tournament_id", tournamentId);

    // Fetch profiles for player names
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, game_id, name");

    // Create a map of player names to teams
    const playerToTeamMap = new Map<string, { teamId: string; teamName: string }>();
    
    // Add team names directly
    existingTeams?.forEach(team => {
      const normalizedName = team.team_name.toLowerCase().trim();
      playerToTeamMap.set(normalizedName, { 
        teamId: team.id, 
        teamName: team.team_name 
      });
    });

    // Add player names from team members
    if (tournamentTeams && profiles) {
      tournamentTeams.forEach(team => {
        team.tournament_team_members?.forEach((member: any) => {
          const profile = profiles.find(p => p.user_id === member.user_id);
          if (profile) {
            const names = [
              profile.display_name,
              profile.username,
              profile.game_id,
              profile.name,
            ].filter(Boolean);
            
            names.forEach(name => {
              if (name) {
                playerToTeamMap.set(name.toLowerCase().trim(), {
                  teamId: team.id,
                  teamName: team.team_name,
                });
              }
            });
          }
        });
      });
    }

    // Step 4: Match extracted players with teams
    const matchedTeams: MatchedTeamData[] = [];
    const unmatchedPlayers: ExtractedPlayerData[] = [];

    for (const player of extractedPlayers) {
      const playerNameLower = player.playerName.toLowerCase().trim();
      let bestMatch: { teamId: string; teamName: string; matchedName: string; confidence: number } | null = null;

      // Try exact match first
      if (playerToTeamMap.has(playerNameLower)) {
        const team = playerToTeamMap.get(playerNameLower)!;
        bestMatch = { ...team, matchedName: player.playerName, confidence: 1.0 };
      } else {
        // Try fuzzy matching
        for (const [mapName, team] of playerToTeamMap.entries()) {
          // Check if one contains the other
          if (playerNameLower.includes(mapName) || mapName.includes(playerNameLower)) {
            const confidence = Math.min(playerNameLower.length, mapName.length) / 
                              Math.max(playerNameLower.length, mapName.length);
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = { ...team, matchedName: mapName, confidence };
            }
          }
        }
      }

      // Find the existing team entry to get the correct ID
      const existingEntry = existingTeams?.find(t => 
        bestMatch && (t.id === bestMatch.teamId || t.team_name.toLowerCase() === bestMatch.teamName.toLowerCase())
      );

      if (bestMatch && bestMatch.confidence >= 0.5 && existingEntry) {
        matchedTeams.push({
          teamId: existingEntry.id,
          teamName: existingEntry.team_name,
          playerName: player.playerName,
          matchedPlayerName: bestMatch.matchedName,
          kills: player.kills || 0,
          points: player.points || 0,
          position: player.position || 0,
          confidence: bestMatch.confidence,
        });
      } else {
        unmatchedPlayers.push(player);
      }
    }

    console.log(`Matched ${matchedTeams.length} teams, ${unmatchedPlayers.length} unmatched`);

    return new Response(
      JSON.stringify({
        success: true,
        extractedPlayers,
        matchedTeams,
        unmatchedPlayers,
        existingTeams: existingTeams || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OCR extraction error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
