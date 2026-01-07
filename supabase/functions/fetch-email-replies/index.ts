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
      port: 993,
      secure: true,
      auth: {
        user: Deno.env.get('IONOS_SMTP_USER') || 'team@taxiassur.com',
        pass: Deno.env.get('IONOS_SMTP_PASSWORD') || ''
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
      // Récupérer les emails non lus des 7 derniers jours
      const messages = [];
      const searchCriteria = {
        since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 jours
        unseen: true
      };

      for await (const message of client.fetch(searchCriteria, { envelope: true, source: true })) {
        messages.push(message);
      }

      console.log(`📧 ${messages.length} emails non lus trouvés`);

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

          // Chercher si c'est une réponse à un de nos emails
          const { data: lead } = await supabase
            .from('leads')
            .select('id')
            .eq('email', fromEmail)
            .maybeSingle();

          if (!lead) {
            console.log('⚠️ Pas de lead correspondant pour:', fromEmail);
            continue;
          }

          // Chercher l'email envoyé correspondant
          const { data: emailSend } = await supabase
            .from('email_sends')
            .select('id')
            .eq('lead_id', lead.id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Analyse du sentiment basique
          let sentiment = 'neutral';
          const lowerBody = body.toLowerCase();
          if (lowerBody.match(/intéressé|merci|parfait|super|excellent|oui/)) {
            sentiment = 'positive';
          } else if (lowerBody.match(/non|pas intéressé|stop|désabonner/)) {
            sentiment = 'negative';
          }

          // Enregistrer la réponse
          const { data: reply, error: insertError } = await supabase
            .from('email_replies')
            .insert({
              email_send_id: emailSend?.id || null,
              lead_id: lead.id,
              from_email: fromEmail,
              subject: subject,
              body: body,
              replied_at: parsed.date || new Date().toISOString(),
              sentiment: sentiment,
              is_processed: false,
              metadata: {
                message_id: parsed.messageId,
                in_reply_to: parsed.inReplyTo
              }
            })
            .select()
            .single();

          if (insertError) {
            console.error('❌ Erreur insertion réponse:', insertError);
          } else {
            console.log('✅ Réponse enregistrée:', reply.id);
            processedReplies.push(reply);

            // Marquer l'email comme lu
            await client.messageFlagsAdd(message.uid, ['\\Seen']);
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
          message: `${processedReplies.length} réponses traitées`,
          replies: processedReplies
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