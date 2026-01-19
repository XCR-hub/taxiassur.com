import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function cleanMIMEContent(content: string): string {
  if (!content) return '';

  // Supprimer les frontières MIME (commence par --)
  let cleaned = content.replace(/^--[a-zA-Z0-9_-]+$/gm, '');

  // Supprimer les headers MIME (Content-Type, Content-Transfer-Encoding, etc.)
  cleaned = cleaned.replace(/^Content-[^:]+:.*$/gm, '');
  cleaned = cleaned.replace(/^MIME-Version:.*$/gm, '');
  cleaned = cleaned.replace(/^boundary=.*$/gm, '');

  // Supprimer les encodages base64 ou quoted-printable vides
  cleaned = cleaned.replace(/^(?:Content-Transfer-Encoding|Content-Disposition|Content-ID):.*$/gm, '');

  // Nettoyer les lignes vides multiples
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim
  cleaned = cleaned.trim();

  return cleaned;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[clean-email-content] Starting cleanup of MIME content...");

    // Récupérer tous les emails avec du contenu MIME brut
    const { data: emails, error: fetchError } = await supabase
      .from('email_messages')
      .select('id, body_text')
      .like('body_text', '%--0000000000%')
      .limit(100);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No emails to clean",
          cleaned: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${emails.length} emails to clean`);

    let cleaned = 0;
    let errors = 0;

    for (const email of emails) {
      try {
        const cleanedText = cleanMIMEContent(email.body_text);

        const { error: updateError } = await supabase
          .from('email_messages')
          .update({ body_text: cleanedText })
          .eq('id', email.id);

        if (updateError) {
          console.error(`Error updating email ${email.id}:`, updateError);
          errors++;
        } else {
          cleaned++;
        }
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        errors++;
      }
    }

    console.log(`Cleanup complete: ${cleaned} cleaned, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned ${cleaned} emails`,
        cleaned,
        errors,
        total_processed: emails.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[clean-email-content] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
