import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ImapFlow } from 'npm:imapflow@1.0.164';
import { simpleParser } from 'npm:mailparser@3.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Configuration IMAP IONOS
    const imapConfig = {
      host: Deno.env.get('IONOS_IMAP_HOST') || 'imap.ionos.fr',
      port: parseInt(Deno.env.get('IONOS_IMAP_PORT') || '993'),
      secure: true,
      auth: {
        user: Deno.env.get('IONOS_EMAIL_USER') || 'team@taxiassur.com',
        pass: Deno.env.get('IONOS_EMAIL_PASSWORD') || ''
      },
      logger: false
    };

    console.log('🔌 Connexion IMAP à:', imapConfig.host);

    const client = new ImapFlow(imapConfig);
    await client.connect();

    console.log('✅ Connecté à IMAP');

    // Ouvrir la boîte de réception
    const lock = await client.getMailboxLock('INBOX');
    
    try {
      // Récupérer TOUS les emails des 30 derniers jours (lus et non-lus)
      const messages = [];
      const searchCriteria = {
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
      };

      for await (const message of client.fetch(searchCriteria, { envelope: true, source: true })) {
        messages.push(message);
      }

      console.log(`📧 ${messages.length} emails trouvés (30 derniers jours)`);

      const processedReplies = [];

      for (const message of messages) {
        try {
          // Parser l'email
          const parsed = await simpleParser(message.source);
          
          const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase() || '';
          const subject = parsed.subject || '';
          const body = parsed.text || parsed.html || '';

          console.log('📨 Email de:', fromEmail, '| Sujet:', subject);

          // Ignorer les emails de notre propre domaine
          if (fromEmail.includes('@taxiassur.com')) {
            console.log('⚠️ Ignoré (notre domaine)');
            continue;
          }

          // Chercher si c'est une réponse à un de nos emails (CRM ou ancien système)
          const { data: lead } = await supabase
            .from('crm_leads')
            .select('id')
            .eq('email', fromEmail)
            .maybeSingle();

          if (!lead) {
            console.log('⚠️ Pas de lead correspondant pour:', fromEmail);
            // Tenter dans l'ancienne table leads
            const { data: oldLead } = await supabase
              .from('leads')
              .select('id')
              .eq('email', fromEmail)
              .maybeSingle();

            if (!oldLead) {
              console.log('⚠️ Pas de lead dans leads non plus');
              continue;
            }
          }

          const leadId = lead?.id;

          // Analyse du sentiment basique
          let sentiment = 'neutral';
          const lowerBody = body.toLowerCase();
          if (lowerBody.match(/intéressé|merci|parfait|super|excellent|oui/)) {
            sentiment = 'positive';
          } else if (lowerBody.match(/non|pas intéressé|stop|désabonner/)) {
            sentiment = 'negative';
          }

          // Vérifier si cet email n'existe pas déjà dans email_inbox
          const { data: existingInbox } = await supabase
            .from('email_inbox')
            .select('id')
            .eq('from_email', fromEmail)
            .eq('subject', subject)
            .eq('received_at', parsed.date || new Date().toISOString())
            .maybeSingle();

          if (existingInbox) {
            console.log('⚠️ Email déjà enregistré dans inbox, ignoré');
            continue;
          }

          // Déterminer l'intention basique
          let intent = 'general';
          const lowerSubjectBody = (subject + ' ' + body).toLowerCase();
          if (lowerSubjectBody.match(/devis|tarif|prix|combien/)) {
            intent = 'quote_request';
          } else if (lowerSubjectBody.match(/question|renseignement|info/)) {
            intent = 'information';
          } else if (lowerSubjectBody.match(/intéressé|souscri|contrat/)) {
            intent = 'interested';
          } else if (lowerSubjectBody.match(/réclama|problème|erreur/)) {
            intent = 'complaint';
          }

          // Enregistrer dans email_inbox (table utilisée par le dashboard)
          const { data: inboxEmail, error: insertError } = await supabase
            .from('email_inbox')
            .insert({
              from_email: fromEmail,
              from_name: parsed.from?.value?.[0]?.name || fromEmail,
              to_email: 'team@taxiassur.com',
              subject: subject,
              body: body,
              html_body: parsed.html || null,
              received_at: parsed.date || new Date().toISOString(),
              processed: false,
              intent: intent,
              sentiment: sentiment,
              priority: sentiment === 'negative' ? 9 : (sentiment === 'positive' ? 3 : 5),
              auto_reply_sent: false,
              lead_id: leadId || null,
              metadata: {
                message_id: parsed.messageId,
                in_reply_to: parsed.inReplyTo,
                from_name: parsed.from?.value?.[0]?.name
              }
            })
            .select()
            .single();

          if (insertError) {
            console.error('❌ Erreur insertion inbox:', insertError);
          } else {
            console.log('✅ Email enregistré dans inbox:', inboxEmail.id);
            processedReplies.push(inboxEmail);
          }

        } catch (parseError) {
          console.error('❌ Erreur parsing email:', parseError);
        }
      }

      lock.release();
      await client.logout();

      return new Response(
        JSON.stringify({
          success: true,
          message: `${processedReplies.length} emails récupérés`,
          emails: processedReplies,
          count: processedReplies.length
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );

    } finally {
      if (lock) {
        lock.release();
      }
    }

  } catch (error) {
    console.error('❌ Erreur dans fetch-email-replies:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});