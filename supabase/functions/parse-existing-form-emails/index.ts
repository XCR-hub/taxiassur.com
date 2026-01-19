import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🔄 Parsing des emails de formulaire existants...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer tous les emails de formulaire non liés à un lead
    const { data: emails, error: fetchError } = await supabase
      .from('email_messages')
      .select('*')
      .eq('from_email', 'noreply@taxiassur.com')
      .like('subject', '%[TAXIASSUR]%')
      .is('lead_id', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📧 ${emails?.length || 0} emails à traiter`);

    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const email of emails || []) {
      try {
        const content = email.body_text || '';
        const subject = email.subject || '';

        console.log('📧 Traitement email:', email.id);
        console.log('📝 Contenu (100 premiers chars):', content.substring(0, 100));

        // Parser le contenu du formulaire (gérer différents formats)
        const nameMatch = content.match(/Nom complet\s*[:\-=]\s*([^\n\r]+)/i);
        const emailMatch = content.match(/Email\s*[:\-=]\s*([^\s\n\r]+)/i);
        const phoneMatch = content.match(/Téléphone\s*[:\-=]\s*([^\s\n\r]+)/i);
        const cityMatch = content.match(/Ville d'activité\s*[:\-=]\s*([^\n\r]+)/i);
        const statusMatch = content.match(/Statut professionnel\s*[:\-=]\s*([^\n\r]+)/i);

        console.log('🔍 Résultats parsing:', {
          nameMatch: nameMatch ? nameMatch[1] : null,
          emailMatch: emailMatch ? emailMatch[1] : null,
          phoneMatch: phoneMatch ? phoneMatch[1] : null,
          cityMatch: cityMatch ? cityMatch[1] : null
        });

        if (nameMatch && emailMatch) {
          const fullName = nameMatch[1].trim();
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          const leadEmail = emailMatch[1].trim();
          const phone = phoneMatch ? phoneMatch[1].trim() : '';
          const city = cityMatch ? cityMatch[1].trim() : '';
          const status = statusMatch ? statusMatch[1].trim() : '';

          console.log(`📋 Traitement: ${firstName} ${lastName} - ${leadEmail}`);

          // Vérifier si le lead existe déjà
          const { data: existingLead } = await supabase
            .from('crm_leads')
            .select('id')
            .eq('email', leadEmail)
            .maybeSingle();

          if (!existingLead) {
            // Créer le lead
            const { data: newLead, error: leadError } = await supabase
              .from('crm_leads')
              .insert({
                first_name: firstName,
                last_name: lastName,
                email: leadEmail,
                phone: phone,
                city: city,
                status: 'NEW_LEAD',
                source: 'formulaire_web',
                internal_notes: `Statut: ${status}\n\nEmail de formulaire reçu le ${new Date(email.created_at).toLocaleString('fr-FR')}`,
                lead_score: 50,
                documents_complete: false,
                created_at: email.created_at
              })
              .select()
              .single();

            if (leadError) {
              console.error('❌ Erreur création lead:', leadError);
              errorDetails.push(`Lead ${leadEmail}: ${leadError.message}`);
              errors++;
            } else {
              console.log(`✅ Lead créé: ${newLead.id}`);
              created++;

              // Lier l'email au lead
              await supabase
                .from('email_messages')
                .update({
                  lead_id: newLead.id,
                  classification: 'lead',
                  auto_matched: true
                })
                .eq('id', email.id);

              // Créer interaction CRM
              await supabase.from('crm_interactions').insert({
                lead_id: newLead.id,
                type: 'email',
                direction: 'inbound',
                subject: subject,
                content: content,
                from_email: leadEmail,
                to_email: 'contact@taxiassur.com',
                created_at: email.created_at
              });
            }
          } else {
            console.log(`ℹ️ Lead existe déjà: ${existingLead.id}`);
            updated++;

            // Lier l'email au lead existant
            await supabase
              .from('email_messages')
              .update({
                  lead_id: existingLead.id,
                  classification: 'lead',
                  auto_matched: true
                })
              .eq('id', email.id);

            // Créer interaction CRM si pas déjà existante
            const { data: existingInteraction } = await supabase
              .from('crm_interactions')
              .select('id')
              .eq('from_email', leadEmail)
              .eq('subject', subject)
              .maybeSingle();

            if (!existingInteraction) {
              await supabase.from('crm_interactions').insert({
                lead_id: existingLead.id,
                type: 'email',
                direction: 'inbound',
                subject: subject,
                content: content,
                from_email: leadEmail,
                to_email: 'contact@taxiassur.com',
                created_at: email.created_at
              });
            }
          }
        } else {
          const errorMsg = `Impossible de parser ${email.id}: nom=${!!nameMatch}, email=${!!emailMatch}`;
          console.log(`⚠️ ${errorMsg}`);
          errorDetails.push(errorMsg);
          errors++;
        }
      } catch (error) {
        const errorMsg = `Erreur ${email.id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`, error);
        errorDetails.push(errorMsg);
        errors++;
      }
    }

    const summary = {
      total: emails?.length || 0,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10) // Limiter à 10 erreurs
    };

    console.log('📊 Résumé:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Parsing des emails terminé',
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
