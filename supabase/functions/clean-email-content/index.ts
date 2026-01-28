import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function cleanMIMEContent(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // Supprimer les séparateurs MIME
  cleaned = cleaned.replace(/------=_NextPart_[0-9A-F_\.]+/g, '');
  cleaned = cleaned.replace(/--====AAAA====[0-9A-F]+/g, '');
  cleaned = cleaned.replace(/====+/g, '');
  cleaned = cleaned.replace(/^--[a-zA-Z0-9_-]+$/gm, '');

  // Supprimer les headers MIME
  cleaned = cleaned.replace(/^Content-[^:]+:.*$/gm, '');
  cleaned = cleaned.replace(/^MIME-Version:.*$/gm, '');
  cleaned = cleaned.replace(/^boundary=.*$/gm, '');
  cleaned = cleaned.replace(/^(?:Content-Transfer-Encoding|Content-Disposition|Content-ID):.*$/gm, '');

  // Corriger les caractères UTF-8 mal encodés (double encodage ISO-8859-1 → UTF-8)
  cleaned = cleaned.replace(/Ã\s+/g, 'à ');
  cleaned = cleaned.replace(/Ã©/g, 'é');
  cleaned = cleaned.replace(/Ã¨/g, 'è');
  cleaned = cleaned.replace(/Ãª/g, 'ê');
  cleaned = cleaned.replace(/Ã /g, 'à');
  cleaned = cleaned.replace(/Ã§/g, 'ç');
  cleaned = cleaned.replace(/Ã´/g, 'ô');
  cleaned = cleaned.replace(/Ã¹/g, 'ù');
  cleaned = cleaned.replace(/Ã»/g, 'û');
  cleaned = cleaned.replace(/Ã®/g, 'î');
  cleaned = cleaned.replace(/Â /g, ' ');
  cleaned = cleaned.replace(/Â/g, '');

  // Nettoyer les espaces multiples
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
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
