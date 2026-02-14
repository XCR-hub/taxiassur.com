import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParsedLead {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  city?: string;
  message?: string;
  vehicle_registration?: string;
  professional_status?: string;
}

function parseFormEmail(emailBody: string, subject: string): ParsedLead | null {
  console.log('[parse-form] Parsing email:', { subject });

  // Pattern pour les emails de formulaire TaxiAssur
  const patterns = {
    fullName: /Nom complet\s*:\s*([^\n\r]+)|nom\s*:\s*([^\n\r]+)/i,
    email: /Email\s*:\s*([^\s\n\r]+@[^\s\n\r]+)|e-?mail\s*:\s*([^\s\n\r]+@[^\s\n\r]+)/i,
    phone: /(?:Téléphone|telephone|phone|tel)\s*:\s*([0-9\s\.\-\+]+)/i,
    city: /Ville d'activité\s*:\s*([^\n\r\(]+)|ville\s*:\s*([^\n\r\(]+)/i,
    registration: /Immatriculation\s*:\s*([^\n\r]+)/i,
    status: /Statut professionnel\s*:\s*([^\n\r]+)/i,
    message: /(?:Message|Commentaire|Notes?)\s*:\s*([^\n\r]+(?:\n(?!(?:Nom|Email|Tel|Ville))[^\n]*)*)/i
  };

  try {
    const fullNameMatch = emailBody.match(patterns.fullName);
    const emailMatch = emailBody.match(patterns.email);
    const phoneMatch = emailBody.match(patterns.phone);
    const cityMatch = emailBody.match(patterns.city);
    const registrationMatch = emailBody.match(patterns.registration);
    const statusMatch = emailBody.match(patterns.status);
    const messageMatch = emailBody.match(patterns.message);

    // Extraction du nom complet
    const fullName = (fullNameMatch?.[1] || fullNameMatch?.[2] || '').trim();
    const email = (emailMatch?.[1] || emailMatch?.[2] || '').trim();

    if (!fullName || !email) {
      console.log('[parse-form] Missing required fields:', { fullName, email });
      return null;
    }

    // Séparation prénom/nom
    const nameParts = fullName.split(/\s+/);
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || nameParts[0];

    // Nettoyage du téléphone
    let phone = (phoneMatch?.[1] || '').trim().replace(/\s/g, '');
    if (phone && !phone.startsWith('0') && !phone.startsWith('+')) {
      phone = '0' + phone;
    }

    // Nettoyage de la ville
    let city = (cityMatch?.[1] || cityMatch?.[2] || '').trim();
    // Retirer le code postal entre parenthèses
    city = city.replace(/\s*\([0-9]+\).*$/, '').trim();

    const parsedLead: ParsedLead = {
      first_name,
      last_name,
      email,
      phone: phone || undefined,
      city: city || undefined,
      message: messageMatch?.[1]?.trim() || undefined,
      vehicle_registration: registrationMatch?.[1]?.trim() || undefined,
      professional_status: statusMatch?.[1]?.trim() || undefined
    };

    console.log('[parse-form] Successfully parsed lead:', parsedLead);
    return parsedLead;
  } catch (error) {
    console.error('[parse-form] Error parsing email:', error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[parse-form-emails] Starting form email parsing...");

    // Récupérer tous les emails de team@taxiassur.com ou noreply@taxiassur.com
    // qui contiennent "NOUVELLE DEMANDE" ou "DEVIS" dans le sujet
    const { data: formEmails, error: fetchError } = await supabase
      .from('email_messages')
      .select('id, from_email, subject, body_text, received_at, lead_id')
      .or('from_email.eq.team@taxiassur.com,from_email.eq.noreply@taxiassur.com')
      .or('subject.ilike.%NOUVELLE DEMANDE%,subject.ilike.%DEVIS%,subject.ilike.%lead%')
      .is('lead_id', null)
      .order('received_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!formEmails || formEmails.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No form emails to process",
          created: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[parse-form-emails] Found ${formEmails.length} form emails to process`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const email of formEmails) {
      try {
        // Parser l'email
        const parsedLead = parseFormEmail(email.body_text, email.subject);

        if (!parsedLead) {
          console.log(`[parse-form-emails] Could not parse email ${email.id}`);
          skipped++;
          continue;
        }

        // Vérifier si l'email doit créer un lead (filtrage spam)
        const { data: shouldCreate, error: filterError } = await supabase
          .rpc('should_create_lead_from_email', {
            p_email: parsedLead.email,
            p_subject: email.subject,
            p_body: email.body_text,
            p_has_attachments: false
          });

        if (filterError) {
          console.error(`[parse-form-emails] Filter error:`, filterError);
        }

        if (!shouldCreate) {
          console.log(`[parse-form-emails] Email filtered as spam/service: ${parsedLead.email}`);
          skipped++;
          continue;
        }

        // Utiliser upsert_lead pour éviter les doublons
        const notesContent = parsedLead.message ? `Message initial: ${parsedLead.message}` : null;

        const { data: upsertResult, error: upsertError } = await supabase
          .rpc('upsert_lead', {
            p_email: parsedLead.email,
            p_first_name: parsedLead.first_name,
            p_last_name: parsedLead.last_name,
            p_phone: parsedLead.phone || '0000000000',
            p_city: parsedLead.city,
            p_source: 'website',
            p_metadata: {
              vehicle_registration: parsedLead.vehicle_registration,
              professional_status: parsedLead.professional_status,
              initial_message: parsedLead.message,
              parsed_from: 'form_email',
              form_email_id: email.id
            }
          });

        if (upsertError) {
          console.error(`[parse-form-emails] Error upserting lead:`, upsertError);
          errors++;
          continue;
        }

        const leadId = upsertResult[0].lead_id;
        const isNew = upsertResult[0].is_new;

        if (isNew) {
          created++;
          console.log(`[parse-form-emails] Created lead ${leadId} for ${parsedLead.email}`);
        } else {
          skipped++;
          console.log(`[parse-form-emails] Updated existing lead ${leadId} for ${parsedLead.email}`);
        }

        // Lier l'email au lead (nouveau ou existant)
        await supabase
          .from('email_messages')
          .update({ lead_id: leadId })
          .eq('id', email.id);

        // Créer une interaction
        await supabase
          .from('crm_interactions')
          .insert({
            lead_id: newLead.id,
            type: 'email',
            direction: 'inbound',
            content: `Demande initiale reçue depuis le formulaire web`,
            status: 'completed'
          });

        created++;
      } catch (error) {
        console.error(`[parse-form-emails] Error processing email ${email.id}:`, error);
        errors++;
      }
    }

    console.log(`[parse-form-emails] Complete: ${created} created, ${skipped} skipped, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${formEmails.length} form emails`,
        created,
        skipped,
        errors,
        total_processed: formEmails.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[parse-form-emails] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
