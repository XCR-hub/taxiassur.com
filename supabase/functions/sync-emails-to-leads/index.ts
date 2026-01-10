import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailMessage {
  id: string;
  message_id: string;
  from_email: string;
  from_name?: string;
  to_emails: string[];
  subject: string;
  body_text: string;
  direction: 'inbound' | 'outbound';
  received_at: string;
  lead_id?: string;
}

interface Lead {
  id: string;
  email: string;
  nom?: string;
  prenom?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting email to leads sync...');

    // 1. Récupérer tous les emails non affectés à un lead
    const { data: emails, error: emailsError } = await supabase
      .from('email_messages')
      .select('*')
      .is('lead_id', null)
      .order('received_at', { ascending: false })
      .limit(1000);

    if (emailsError) {
      throw new Error(`Error fetching emails: ${emailsError.message}`);
    }

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No unassigned emails found',
          stats: { processed: 0, leads_created: 0, interactions_created: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${emails.length} unassigned emails...`);

    let leadsCreated = 0;
    let interactionsCreated = 0;
    let emailsLinked = 0;
    let errors = 0;

    for (const email of emails) {
      try {
        // 2. Déterminer l'email du contact (prospect/client)
        let contactEmail: string;
        let contactName: string | undefined;

        if (email.direction === 'inbound') {
          // Email entrant : le contact est l'expéditeur
          contactEmail = email.from_email;
          contactName = email.from_name;
        } else {
          // Email sortant : le contact est le premier destinataire
          contactEmail = email.to_emails?.[0];
          contactName = email.to_names?.[0];
        }

        if (!contactEmail || contactEmail === 'team@taxiassur.com') {
          console.log(`Skipping email ${email.id} - no valid contact email`);
          continue;
        }

        console.log(`Processing email from/to: ${contactEmail}`);

        // 3. Chercher le lead existant
        const { data: existingLead, error: leadSearchError } = await supabase
          .from('crm_leads')
          .select('id, email, nom, prenom')
          .eq('email', contactEmail)
          .maybeSingle();

        if (leadSearchError && leadSearchError.code !== 'PGRST116') {
          console.error(`Error searching lead for ${contactEmail}:`, leadSearchError);
          errors++;
          continue;
        }

        let leadId: string;

        // 4. Créer le lead si nécessaire
        if (!existingLead) {
          console.log(`Creating new lead for ${contactEmail}`);

          // Extraire nom/prénom du nom complet si possible
          let nom = '';
          let prenom = '';

          if (contactName) {
            const nameParts = contactName.trim().split(' ');
            if (nameParts.length === 1) {
              nom = nameParts[0];
            } else if (nameParts.length >= 2) {
              prenom = nameParts[0];
              nom = nameParts.slice(1).join(' ');
            }
          }

          const newLeadData = {
            email: contactEmail,
            nom: nom || 'Inconnu',
            prenom: prenom || '',
            telephone: '',
            source: 'email',
            statut: 'nouveau',
            type_vehicule: 'taxi',
            pipeline_stage: 'lead',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              created_from_email: true,
              first_contact_subject: email.subject,
              first_contact_date: email.received_at,
            },
          };

          const { data: newLead, error: createError } = await supabase
            .from('crm_leads')
            .insert(newLeadData)
            .select('id')
            .single();

          if (createError) {
            console.error(`Error creating lead for ${contactEmail}:`, createError);
            errors++;
            continue;
          }

          leadId = newLead.id;
          leadsCreated++;
          console.log(`Created lead ${leadId} for ${contactEmail}`);
        } else {
          leadId = existingLead.id;
          console.log(`Found existing lead ${leadId} for ${contactEmail}`);
        }

        // 5. Lier l'email au lead
        const { error: updateError } = await supabase
          .from('email_messages')
          .update({ lead_id: leadId })
          .eq('id', email.id);

        if (updateError) {
          console.error(`Error linking email ${email.id} to lead ${leadId}:`, updateError);
          errors++;
          continue;
        }

        emailsLinked++;

        // 6. Créer une interaction CRM
        const interactionData = {
          lead_id: leadId,
          type: 'email',
          direction: email.direction,
          subject: email.subject,
          content: email.body_text?.substring(0, 5000) || '',
          from_email: email.from_email,
          to_email: email.direction === 'inbound' ? 'team@taxiassur.com' : contactEmail,
          channel: 'email',
          status: 'completed',
          created_at: email.received_at,
          metadata: {
            message_id: email.message_id,
            email_id: email.id,
            has_attachments: email.has_attachments,
          },
        };

        const { error: interactionError } = await supabase
          .from('crm_interactions')
          .insert(interactionData);

        if (interactionError) {
          console.error(`Error creating interaction for email ${email.id}:`, interactionError);
          errors++;
        } else {
          interactionsCreated++;
        }

        // 7. Mettre à jour le last_interaction_at du lead
        await supabase
          .from('crm_leads')
          .update({ 
            last_interaction_at: email.received_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);

      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        errors++;
      }
    }

    const response = {
      success: true,
      message: 'Email to leads sync completed',
      stats: {
        processed: emails.length,
        emails_linked: emailsLinked,
        leads_created: leadsCreated,
        interactions_created: interactionsCreated,
        errors,
      },
    };

    console.log('Sync completed:', response.stats);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-emails-to-leads:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});