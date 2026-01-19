import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BrevoInboundEmail {
  uuid: string;
  sender: { email: string; name?: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  text?: string;
  html?: string;
  date: string;
  messageId: string;
  inReplyTo?: string;
  headers?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const payload: BrevoInboundEmail = await req.json();
    
    console.log('📧 Email entrant reçu:', {
      from: payload.sender.email,
      to: payload.to[0]?.email,
      subject: payload.subject,
      messageId: payload.messageId
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const senderEmail = payload.sender.email.toLowerCase();
    const senderName = payload.sender.name || '';
    const recipientEmail = payload.to[0]?.email || 'contact@taxiassur.com';
    const subject = payload.subject || '(Sans objet)';
    const content = payload.text || '';
    const htmlContent = payload.html || '';
    const threadId = payload.inReplyTo || payload.messageId;

    // Étape 1: Trouver ou créer le contact
    let contact;
    const { data: existingContact } = await supabase
      .from('unified_contacts')
      .select('*')
      .eq('email', senderEmail)
      .maybeSingle();

    if (existingContact) {
      contact = existingContact;
      console.log('✅ Contact existant trouvé:', contact.id);
      
      // Mettre à jour last_contact_at
      await supabase
        .from('unified_contacts')
        .update({ 
          last_contact_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', contact.id);
    } else {
      // Créer nouveau contact
      const { data: newContact, error: createError } = await supabase
        .from('unified_contacts')
        .insert({
          email: senderEmail,
          name: senderName,
          contact_type: 'unknown',
          status: 'new',
          source: 'inbound_email',
          last_contact_at: new Date().toISOString(),
          classification_confidence: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erreur création contact:', createError);
        throw createError;
      }

      contact = newContact;
      console.log('🆕 Nouveau contact créé:', contact.id);
    }

    // Étape 2: Enregistrer la conversation
    const { data: conversation, error: convError } = await supabase
      .from('email_conversations')
      .insert({
        contact_id: contact.id,
        thread_id: threadId,
        direction: 'inbound',
        subject: subject,
        content: content,
        html_content: htmlContent,
        sender_email: senderEmail,
        recipient_email: recipientEmail,
        brevo_message_id: payload.messageId,
        classification: 'pending',
        sentiment: 'neutral',
        auto_response_sent: false,
        requires_human_review: false
      })
      .select()
      .single();

    if (convError) {
      console.error('❌ Erreur enregistrement conversation:', convError);
      throw convError;
    }

    console.log('💾 Conversation enregistrée:', conversation.id);

    // PARSER AUTOMATIQUE DES EMAILS DU FORMULAIRE TAXIASSUR
    if (senderEmail === 'noreply@taxiassur.com' && subject.includes('[TAXIASSUR]')) {
      console.log('🎯 Email de formulaire détecté - Parsing automatique...');

      try {
        // Parser le contenu du formulaire
        const nameMatch = content.match(/Nom complet\s*[:\-]\s*([^\n]+)/i);
        const emailMatch = content.match(/Email\s*[:\-]\s*([^\s\n]+)/i);
        const phoneMatch = content.match(/Téléphone\s*[:\-]\s*([^\s\n]+)/i);
        const cityMatch = content.match(/Ville d'activité\s*[:\-]\s*([^\n]+)/i);
        const statusMatch = content.match(/Statut professionnel\s*[:\-]\s*([^\n]+)/i);

        if (nameMatch && emailMatch) {
          const fullName = nameMatch[1].trim();
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          const leadEmail = emailMatch[1].trim();
          const phone = phoneMatch ? phoneMatch[1].trim() : '';
          const city = cityMatch ? cityMatch[1].trim() : '';
          const status = statusMatch ? statusMatch[1].trim() : '';

          console.log('📋 Informations extraites:', { firstName, lastName, leadEmail, phone, city });

          // Vérifier si le lead existe déjà
          const { data: existingLead } = await supabase
            .from('crm_leads')
            .select('id')
            .eq('email', leadEmail)
            .maybeSingle();

          if (!existingLead) {
            // Créer le lead automatiquement
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
                internal_notes: `Statut: ${status}\n\nEmail de formulaire reçu le ${new Date().toLocaleString('fr-FR')}`,
                lead_score: 50,
                documents_complete: false
              })
              .select()
              .single();

            if (leadError) {
              console.error('❌ Erreur création lead:', leadError);
            } else {
              console.log('✅ Lead créé automatiquement:', newLead.id);

              // Lier la conversation au lead
              await supabase
                .from('email_conversations')
                .update({ lead_id: newLead.id })
                .eq('id', conversation.id);

              // Créer interaction CRM
              await supabase.from('crm_interactions').insert({
                lead_id: newLead.id,
                type: 'email',
                direction: 'inbound',
                subject: subject,
                content: content,
                from_email: leadEmail,
                to_email: recipientEmail,
                brevo_message_id: payload.messageId
              });

              console.log('✅ Lead créé et lié à la conversation');
            }
          } else {
            console.log('ℹ️ Lead existe déjà:', existingLead.id);

            // Lier la conversation au lead existant
            await supabase
              .from('email_conversations')
              .update({ lead_id: existingLead.id })
              .eq('id', conversation.id);

            // Créer interaction CRM
            await supabase.from('crm_interactions').insert({
              lead_id: existingLead.id,
              type: 'email',
              direction: 'inbound',
              subject: subject,
              content: content,
              from_email: leadEmail,
              to_email: recipientEmail,
              brevo_message_id: payload.messageId
            });
          }
        } else {
          console.log('⚠️ Impossible d\'extraire les informations du formulaire');
        }
      } catch (parseError) {
        console.error('⚠️ Erreur parsing formulaire:', parseError);
      }
    } else {
      // Pour les autres emails, enregistrer interaction avec le contact_id
      await supabase.from('crm_interactions').insert({
        lead_id: contact.id,
        type: 'email',
        direction: 'inbound',
        subject: subject,
        content: content,
        from_email: senderEmail,
        to_email: recipientEmail,
        brevo_message_id: payload.messageId
      });
      console.log('✅ Interaction CRM enregistrée');
    }

    // Étape 3: Appeler l'IA Classifier de manière asynchrone
    const classifierUrl = `${supabaseUrl}/functions/v1/ai-email-classifier`;
    
    // Fire and forget - pas besoin d'attendre la réponse
    fetch(classifierUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        conversation_id: conversation.id,
        contact_id: contact.id,
        email_content: content,
        subject: subject,
        sender_email: senderEmail
      })
    }).catch(err => console.error('⚠️ Erreur appel classifier:', err));

    const executionTime = Date.now() - startTime;
    console.log(`✅ Email traité en ${executionTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email reçu et traité',
        contact_id: contact.id,
        conversation_id: conversation.id,
        execution_time_ms: executionTime
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error("❌ Erreur traitement email entrant:", error);
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