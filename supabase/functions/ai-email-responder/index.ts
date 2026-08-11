import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ResponderRequest {
  conversation_id: string;
  contact_id: string;
  classification: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const payload: ResponderRequest = await req.json();
    
    console.log('🤖 IA Responder: Génération réponse', payload.conversation_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const brevoKey = Deno.env.get('BREVO_API_KEY');

    if (!openaiKey || !brevoKey) {
      throw new Error('OPENAI_API_KEY ou BREVO_API_KEY non configuré');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer la conversation et le contact
    const { data: conversation } = await supabase
      .from('email_conversations')
      .select('*')
      .eq('id', payload.conversation_id)
      .single();

    const { data: contact } = await supabase
      .from('unified_contacts')
      .select('*')
      .eq('id', payload.contact_id)
      .single();

    if (!conversation || !contact) {
      throw new Error('Conversation ou contact introuvable');
    }

    // Déterminer le type de réponse à générer
    const contactType = payload.classification.contact_type;
    const intent = payload.classification.intent;

    let responsePrompt = '';
    const responseSubject = `Re: ${conversation.subject}`;

    switch (contactType) {
      case 'prospect_taxi':
        responsePrompt = `Tu es un conseiller TaxiAssur. Un prospect taxi a envoyé cet email:

Sujet: ${conversation.subject}
Contenu: ${conversation.content}

Rédige une réponse professionnelle, chaleureuse et convaincante qui :
1. Remercie le prospect pour son intérêt
2. Propose un devis gratuit personnalisé
3. Mentionne nos avantages clés (30% d'économies, attestation en 24h, RC Pro incluse)
4. Inclut un lien vers notre formulaire de devis: https://taxiassur.com/devis
5. Signe "L'équipe TaxiAssur - contact@taxiassur.com"

Réponse en HTML professionnel (sans balises <html>, juste le contenu du body).`;
        break;

      case 'client':
        responsePrompt = `Tu es un conseiller TaxiAssur. Un client existant a envoyé cet email:

Sujet: ${conversation.subject}
Contenu: ${conversation.content}

Rédige une réponse professionnelle et empathique qui :
1. Accuse réception de sa demande
2. Confirme que son dossier est pris en charge
3. Indique qu'un conseiller reviendra vers lui sous 24h
4. Rappelle notre service client disponible
5. Signe "L'équipe TaxiAssur - contact@taxiassur.com"

Réponse en HTML professionnel (sans balises <html>, juste le contenu du body).`;
        break;

      case 'partner_media':
        responsePrompt = `Tu es responsable partenariats chez TaxiAssur. Un média/magazine a envoyé cet email:

Sujet: ${conversation.subject}
Contenu: ${conversation.content}

Rédige une réponse professionnelle et enthousiaste qui :
1. Remercie pour cette opportunité de collaboration
2. Exprime notre intérêt pour un partenariat
3. Propose une brève présentation de TaxiAssur (leader assurance taxi, 15K+ clients)
4. Suggère un appel de 15min pour discuter des modalités
5. Signe "L'équipe Partenariats TaxiAssur - partners@taxiassur.com"

Réponse en HTML professionnel (sans balises <html>, juste le contenu du body).`;
        break;

      case 'partner_directory':
        responsePrompt = `Tu es responsable SEO chez TaxiAssur. Un annuaire propose un référencement:

Sujet: ${conversation.subject}
Contenu: ${conversation.content}

Rédige une réponse professionnelle qui :
1. Remercie pour la proposition
2. Confirme notre intérêt pour un listing de qualité
3. Demande les conditions (tarif, type de lien, etc.)
4. Mentionne notre site: taxiassur.com (15K visiteurs/mois)
5. Signe "L'équipe SEO TaxiAssur - seo@taxiassur.com"

Réponse en HTML professionnel (sans balises <html>, juste le contenu du body).`;
        break;

      case 'backlink_site':
        responsePrompt = `Tu es SEO Manager chez TaxiAssur. Un webmaster répond à notre demande de backlink:

Sujet: ${conversation.subject}
Contenu: ${conversation.content}

Rédige une réponse professionnelle qui :
1. Remercie pour la réponse
2. Confirme notre intérêt pour l'échange de liens
3. Propose une collaboration mutuellement bénéfique
4. Suggère les prochaines étapes
5. Signe "L'équipe SEO TaxiAssur - seo@taxiassur.com"

Réponse en HTML professionnel (sans balises <html>, juste le contenu du body).`;
        break;

      default:
        responsePrompt = `Tu es un assistant TaxiAssur. Un contact a envoyé cet email:

Sujet: ${conversation.subject}
Contenu: ${conversation.content}

Rédige une réponse professionnelle et polie qui :
1. Accuse réception de l'email
2. Indique qu'un membre de l'équipe reviendra vers lui rapidement
3. Signe "L'équipe TaxiAssur - contact@taxiassur.com"

Réponse en HTML professionnel (sans balises <html>, juste le contenu du body).`;
    }

    // Générer la réponse avec OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu es un excellent rédacteur d\'emails professionnels en français. Tu écris de manière claire, concise et engageante.' },
          { role: 'user', content: responsePrompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedResponse = openaiData.choices[0].message.content.trim();

    console.log('📝 Réponse générée:', generatedResponse.substring(0, 100) + '...');

    // Envelopper dans un template HTML complet
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .email-content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 5px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-content">
      ${generatedResponse}
    </div>
    <div class="footer">
      <p><strong>TaxiAssur</strong> - L'assurance taxi qui vous fait économiser<br>
      🌐 <a href="https://taxiassur.com">taxiassur.com</a><br>
      📧 contact@taxiassur.com</p>
    </div>
  </div>
</body>
</html>`;

    // Envoyer l'email via Brevo
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'TaxiAssur', email: 'contact@taxiassur.com' },
        to: [{ email: contact.email, name: contact.name || '' }],
        subject: responseSubject,
        htmlContent: emailHtml,
        replyTo: { email: conversation.recipient_email }
      })
    });

    if (!brevoResponse.ok) {
      const error = await brevoResponse.text();
      throw new Error(`Brevo API error: ${error}`);
    }

    const brevoData = await brevoResponse.json();
    console.log('✉️ Email envoyé via Brevo:', brevoData.messageId);

    // Enregistrer la réponse envoyée
    await supabase
      .from('email_conversations')
      .insert({
        contact_id: contact.id,
        thread_id: conversation.thread_id,
        direction: 'outbound',
        subject: responseSubject,
        content: generatedResponse,
        html_content: emailHtml,
        sender_email: 'contact@taxiassur.com',
        recipient_email: contact.email,
        brevo_message_id: brevoData.messageId,
        classification: contactType,
        ai_analysis: {
          generated_by: 'ai-email-responder',
          based_on_classification: payload.classification,
          generated_at: new Date().toISOString()
        }
      });

    // Marquer la conversation initiale comme ayant une réponse automatique
    await supabase
      .from('email_conversations')
      .update({ 
        auto_response_sent: true,
        replied_at: new Date().toISOString()
      })
      .eq('id', payload.conversation_id);

    // Logger la décision IA
    await supabase
      .from('ai_decision_log')
      .insert({
        decision_type: 'response',
        ai_agent: 'responder',
        input_data: {
          conversation_id: payload.conversation_id,
          classification: payload.classification
        },
        decision_made: {
          response_sent: true,
          brevo_message_id: brevoData.messageId
        },
        confidence_score: 100,
        execution_time_ms: Date.now() - startTime,
        success: true
      });

    const executionTime = Date.now() - startTime;
    console.log(`✅ Réponse automatique envoyée en ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Réponse automatique envoyée',
        brevo_message_id: brevoData.messageId,
        execution_time_ms: executionTime
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error("❌ Erreur réponse automatique:", error);
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