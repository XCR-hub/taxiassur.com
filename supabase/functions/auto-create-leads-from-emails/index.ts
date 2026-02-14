import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function extractNameFromEmail(email: string, fromName?: string): { firstName: string; lastName: string } {
  // Si on a déjà un nom formaté (ex: "Jeb Nab")
  if (fromName && fromName.trim() && !fromName.includes('@')) {
    const parts = fromName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
      };
    }
    return {
      firstName: fromName.trim(),
      lastName: ''
    };
  }

  // Extraire depuis l'email
  const username = email.split('@')[0];
  const cleaned = username
    .replace(/[._-]/g, ' ')
    .replace(/\d+/g, '')
    .trim();

  const parts = cleaned.split(/\s+/).filter(p => p.length > 1);

  if (parts.length >= 2) {
    return {
      firstName: parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase(),
      lastName: parts.slice(1).join(' ').charAt(0).toUpperCase() + parts.slice(1).join(' ').slice(1).toLowerCase()
    };
  }

  return {
    firstName: cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase(),
    lastName: ''
  };
}

function extractPhoneFromContent(content: string): string | null {
  const phonePatterns = [
    /(?:^|\s)(\+?33|0)[1-9](?:[\s.-]?\d{2}){4}(?:\s|$)/g,
    /(?:^|\s)(0[1-9]\d{8})(?:\s|$)/g,
  ];

  for (const pattern of phonePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      return matches[0].trim().replace(/[\s.-]/g, '');
    }
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    console.log('🔄 Création automatique des leads depuis les emails...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer les emails sans lead_id (emails non liés à un lead)
    const { data: emails, error: fetchError } = await supabase
      .from('email_messages')
      .select('*')
      .is('lead_id', null)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📧 ${emails?.length || 0} emails à traiter`);

    let created = 0;
    let linked = 0;
    let skipped = 0;
    const results: any[] = [];

    for (const email of emails || []) {
      try {
        console.log(`📬 Traitement email: ${email.from_email} - "${email.subject}"`);

        // Ignorer les emails automatiques
        if (email.from_email.includes('@taxiassur.com') ||
            email.from_email.includes('noreply@') ||
            email.from_email.includes('no-reply@') ||
            email.from_email.includes('pinterest.com')) {
          console.log(`⏭️ Email ignoré: ${email.from_email}`);
          skipped++;
          continue;
        }

        // Vérifier si un lead existe déjà avec cet email
        const { data: existingLead, error: searchError } = await supabase
          .from('crm_leads')
          .select('id')
          .eq('email', email.from_email)
          .maybeSingle();

        if (searchError) {
          console.error(`❌ Erreur recherche lead pour ${email.from_email}:`, searchError);
          continue;
        }

        // Utiliser upsert_lead pour éviter les doublons
        const { firstName, lastName } = extractNameFromEmail(email.from_email, email.from_name);
        const phone = extractPhoneFromContent(email.body_text || '');

        console.log(`🔄 Upsert lead: ${firstName} ${lastName} (${email.from_email})`);

        const { data: upsertResult, error: upsertError } = await supabase
          .rpc('upsert_lead', {
            p_email: email.from_email,
            p_first_name: firstName || 'Prospect',
            p_last_name: lastName || 'Email',
            p_phone: phone || '0000000000',
            p_city: null,
            p_source: 'email_inbound',
            p_metadata: {
              first_email_id: email.id,
              first_email_subject: email.subject,
              first_email_date: email.received_at,
              auto_created: true,
              created_from: 'auto-create-leads-from-emails',
              initial_message: email.subject,
              phone_missing: !phone
            }
          });

        if (upsertError) {
          console.error(`❌ Erreur upsert lead pour ${email.from_email}:`, upsertError);
          console.error('Détails erreur:', JSON.stringify(upsertError, null, 2));
          continue;
        }

        const leadId = upsertResult[0].lead_id;
        const isNew = upsertResult[0].is_new;

        if (isNew) {
          created++;
          console.log(`✨ Nouveau lead créé: ${firstName} ${lastName} (${email.from_email}) - ID: ${leadId}`);

          // Créer une notification pour nouveau lead seulement
          try {
            await supabase.from('crm_event_notifications').insert({
              lead_id: leadId,
              event_type: 'new_lead',
              title: 'Nouveau contact par email',
              message: `${firstName} ${lastName} a envoyé un email: "${email.subject}"`,
              priority: 1,
              read: false
            });
          } catch (notifError) {
            console.error('Erreur notification:', notifError);
          }
        } else {
          linked++;
          console.log(`✅ Lead existant mis à jour pour ${email.from_email}: ${leadId}`);
        }

        // Lier l'email au lead
        const { error: linkError } = await supabase
          .from('email_messages')
          .update({ lead_id: leadId })
          .eq('id', email.id);

        if (linkError) {
          console.error(`❌ Erreur liaison email ${email.id} au lead ${leadId}:`, linkError);
        } else {
          console.log(`🔗 Email ${email.id} lié au lead ${leadId}`);
        }

        // Créer une interaction CRM
        try {
          await supabase.from('crm_interactions').insert({
            lead_id: leadId,
            type: 'email',
            direction: 'inbound',
            subject: email.subject,
            content: email.body_text?.substring(0, 5000),
            metadata: {
              email_id: email.id,
              from: email.from_email,
              received_at: email.received_at
            }
          });
          console.log(`📝 Interaction créée pour lead ${leadId}`);
        } catch (interactionError) {
          console.error('Erreur interaction:', interactionError);
        }

        results.push({
          email: email.from_email,
          lead_id: leadId,
          action: existingLead ? 'linked' : 'created'
        });

      } catch (emailError) {
        console.error(`❌ Erreur traitement email ${email.from_email}:`, emailError);
        console.error('Stack:', emailError.stack);
      }
    }

    const executionTime = Date.now() - startTime;
    const summary = {
      total_emails: emails?.length || 0,
      leads_created: created,
      emails_linked: linked,
      skipped,
      execution_time_ms: executionTime,
      results: results.slice(0, 20)
    };

    console.log('📊 Résumé:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${created} leads créés, ${linked} emails liés`,
        summary
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("❌ Erreur:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
