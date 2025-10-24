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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email } = await req.json();

    if (!email || !email.from || !email.subject || !email.body) {
      return new Response(
        JSON.stringify({ error: 'Missing email data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer/Récupérer thread email
    const threadId = email.thread_id || `thread-${Date.now()}`;

    const { data: existingThread } = await supabase
      .from('email_threads')
      .select('*')
      .eq('thread_id', threadId)
      .maybeSingle();

    if (!existingThread) {
      await supabase
        .from('email_threads')
        .insert({
          thread_id: threadId,
          from_email: email.from,
          to_email: email.to || 'contact@taxiassur.com',
          subject: email.subject,
          messages: [{ from: email.from, body: email.body, timestamp: new Date().toISOString() }],
          last_message_at: new Date().toISOString(),
        });
    } else {
      // Ajouter message au thread
      const messages = existingThread.messages || [];
      messages.push({ from: email.from, body: email.body, timestamp: new Date().toISOString() });

      await supabase
        .from('email_threads')
        .update({
          messages,
          last_message_at: new Date().toISOString(),
        })
        .eq('thread_id', threadId);
    }

    // Analyser le contenu pour déterminer si on peut répondre automatiquement
    const analysis = analyzeEmail(email.subject, email.body);

    if (!analysis.requiresHuman && analysis.confidence > 0.7) {
      // Générer réponse automatique
      const response = generateEmailResponse(email.subject, email.body, analysis);

      // Enregistrer la réponse générée
      await supabase
        .from('ai_responses_generated')
        .insert({
          target_type: 'email',
          target_id: existingThread?.id,
          original_content: email.body,
          generated_response: response.text,
          confidence_score: response.confidence,
          tone: response.tone,
          includes_link: response.includesLink,
          link_url: response.linkUrl,
          status: response.confidence > 0.8 ? 'approved' : 'pending'
        });

      // Marquer email comme auto-répondu
      await supabase
        .from('email_threads')
        .update({
          auto_responded: true,
          sentiment: analysis.sentiment,
          priority: analysis.priority
        })
        .eq('thread_id', threadId);

      // TODO: Envoyer l'email via SendGrid/SMTP
      // await sendEmail(email.from, response.text);

      return new Response(
        JSON.stringify({
          success: true,
          auto_responded: true,
          response: response.text,
          confidence: response.confidence
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Nécessite intervention humaine
      await supabase
        .from('email_threads')
        .update({
          requires_human: true,
          sentiment: analysis.sentiment,
          priority: analysis.priority
        })
        .eq('thread_id', threadId);

      return new Response(
        JSON.stringify({
          success: true,
          auto_responded: false,
          requires_human: true,
          reason: analysis.reason
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in ai-email-responder:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Analyser email pour déterminer type et urgence
function analyzeEmail(subject: string, body: string) {
  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase();
  const combined = lowerSubject + ' ' + lowerBody;

  let requiresHuman = false;
  let confidence = 0.5;
  let sentiment = 'neutral';
  let priority = 'normal';
  let reason = '';

  // Détection de sentiment négatif/urgence
  if (combined.includes('urgent') || combined.includes('immédiat') || combined.includes('problème grave')) {
    requiresHuman = true;
    priority = 'urgent';
    reason = 'Urgent - requires immediate human attention';
    confidence = 0.3;
  }

  // Détection réclamation/colère
  if (combined.includes('mécontent') || combined.includes('inacceptable') || combined.includes('réclamation')) {
    requiresHuman = true;
    sentiment = 'negative';
    priority = 'high';
    reason = 'Complaint - requires empathetic human response';
    confidence = 0.2;
  }

  // Détection question complexe
  if (combined.includes('cas particulier') || combined.includes('situation spécifique') || combined.includes('exception')) {
    requiresHuman = true;
    priority = 'high';
    reason = 'Complex case - requires expert human judgment';
    confidence = 0.4;
  }

  // Questions simples FAQ
  if (combined.includes('devis') || combined.includes('tarif') || combined.includes('prix')) {
    confidence = 0.9;
    sentiment = 'positive';
  }

  if (combined.includes('documents') || combined.includes('pièces à fournir') || combined.includes('attestation')) {
    confidence = 0.85;
    sentiment = 'neutral';
  }

  return {
    requiresHuman,
    confidence,
    sentiment,
    priority,
    reason
  };
}

// Générer réponse email automatique
function generateEmailResponse(subject: string, body: string, analysis: any) {
  const lowerBody = body.toLowerCase();
  let response = '';
  let tone = 'professional';
  let includesLink = true;
  let linkUrl = 'https://taxiassur.com/devis';

  if (lowerBody.includes('devis') || lowerBody.includes('tarif') || lowerBody.includes('prix')) {
    response = `Bonjour,

Merci pour votre demande de devis d'assurance taxi.

Pour obtenir un devis personnalisé en 2 minutes, je vous invite à compléter notre formulaire en ligne :
https://taxiassur.com/devis

Vous recevrez une réponse sous 15 minutes avec plusieurs propositions adaptées à votre situation.

Si vous préférez un échange téléphonique, n'hésitez pas à nous appeler au 01 80 85 57 86.

Cordialement,
L'équipe TaxiAssur
Courtier ORIAS 11 061 425`;
  }
  else if (lowerBody.includes('documents') || lowerBody.includes('pièces') || lowerBody.includes('justificatif')) {
    response = `Bonjour,

Pour constituer votre dossier d'assurance taxi, nous avons besoin des documents suivants :

✅ Copie carte grise du véhicule
✅ Copie permis de conduire
✅ Copie carte professionnelle taxi/VTC
✅ RIB pour prélèvement automatique

Vous pouvez les envoyer directement en réponse à cet email ou via notre formulaire sécurisé :
https://taxiassur.com/documents

Notre équipe traitera votre dossier sous 24h.

Cordialement,
L'équipe TaxiAssur`;
    linkUrl = 'https://taxiassur.com/documents';
  }
  else if (lowerBody.includes('attestation') || lowerBody.includes('certificat') || lowerBody.includes('preuve')) {
    response = `Bonjour,

Votre attestation d'assurance est disponible immédiatement après souscription.

Elle vous sera envoyée par email au format PDF et sera également accessible dans votre espace client.

Pour toute demande d'attestation urgente, contactez-nous au 01 80 85 57 86.

Cordialement,
L'équipe TaxiAssur`;
    includesLink = false;
  }
  else {
    // Réponse générique
    response = `Bonjour,

Merci pour votre message concernant votre assurance taxi.

Notre équipe traite votre demande et reviendra vers vous sous 24h.

Pour toute urgence, contactez-nous au 01 80 85 57 86.

En attendant, vous pouvez consulter notre FAQ : https://taxiassur.com/faq

Cordialement,
L'équipe TaxiAssur`;
    linkUrl = 'https://taxiassur.com/faq';
  }

  return {
    text: response,
    tone,
    includesLink,
    linkUrl,
    confidence: analysis.confidence
  };
}
