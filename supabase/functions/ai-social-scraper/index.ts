import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, content, platform, author } = await req.json();

    if (action === "analyze") {
      const patterns = [];
      if (content.match(/cherche.*assurance|besoin.*assurance/i)) patterns.push('recherche_assurance');
      if (content.match(/urgent|vite/i)) patterns.push('urgence');

      const response = patterns.includes('urgence') ?
        `Bonjour ! 👋 Réponse rapide sur taxiassur.com - Devis en 2h 📞` :
        `Bonjour ! 🚕 TaxiAssur: à partir de 89€/mois. Devis personnalisé ? 😊`;

      await supabase.from('ai_social_intelligence').insert({
        platform,
        content,
        author_info: { name: author },
        sentiment: 'neutral',
        topics_detected: patterns,
        ai_response_generated: response,
        priority_score: patterns.includes('urgence') ? 80 : 50
      });

      return new Response(
        JSON.stringify({ success: true, response, patterns }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unknown action");
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
