import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const { message_id, context } = await req.json();

    if (!message_id) {
      throw new Error('message_id requis');
    }

    console.log('🤖 Génération réponse IA pour message:', message_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY non configurée');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: email, error: emailError } = await supabase
      .from('email_inbox')
      .select('*')
      .eq('id', message_id)
      .single();

    if (emailError || !email) {
      throw new Error('Email introuvable: ' + (emailError?.message || 'not found'));
    }

    console.log('📧 Email trouvé:', email.from_email, '|', email.subject);

    let leadInfo = '';
    if (email.lead_id) {
      const { data: lead } = await supabase
        .from('crm_leads')
        .select('first_name, last_name, company_name, status')
        .eq('id', email.lead_id)
        .maybeSingle();

      if (lead) {
        leadInfo = `\n\nInformations du prospect:\n- Nom: ${lead.first_name} ${lead.last_name}\n- Entreprise: ${lead.company_name || 'N/A'}\n- Statut: ${lead.status}`;
      }
    }

    let systemPrompt = '';
    let responseInstructions = '';

    switch (email.intent) {
      case 'quote_request':
        systemPrompt = 'Tu es un conseiller commercial expert en assurance taxi chez TaxiAssur.';
        responseInstructions = `\n1. Remercie chaleureusement pour la demande\n2. Confirme que tu peux établir un devis personnalisé\n3. Demande les informations manquantes si nécessaire:\n   - Type de véhicule (taxi, VTC, moto-taxi)\n   - Ville d'exercice\n   - Depuis combien de temps chauffeur\n   - Sinistres dans les 3 dernières années\n4. Mentionne nos avantages: 30% d'économie, attestation 24h, RC Pro incluse\n5. Propose un rappel téléphonique ou un RDV visio\n6. Signe "L'équipe TaxiAssur - contact@taxiassur.com - 01 XX XX XX XX"`;
        break;

      case 'information':
        systemPrompt = 'Tu es un conseiller en assurance taxi chez TaxiAssur.';
        responseInstructions = `\n1. Réponds précisément à la question posée\n2. Apporte des informations complémentaires utiles\n3. Propose d'approfondir par téléphone si nécessaire\n4. Reste disponible pour d'autres questions\n5. Signe "L'équipe TaxiAssur - contact@taxiassur.com"`;
        break;

      case 'interested':
        systemPrompt = 'Tu es un commercial enthousiaste chez TaxiAssur.';
        responseInstructions = `\n1. Montre ton enthousiasme pour sa décision\n2. Explique les prochaines étapes claires:\n   - Validation du devis\n   - Signature électronique du contrat\n   - Réception de l'attestation sous 24h\n3. Rassure sur la simplicité et rapidité du processus\n4. Propose un accompagnement personnalisé\n5. Signe "L'équipe TaxiAssur - contact@taxiassur.com"`;
        break;

      case 'complaint':
        systemPrompt = 'Tu es un responsable service client empathique chez TaxiAssur.';
        responseInstructions = `\n1. Présente des excuses sincères pour le désagrément\n2. Montre que tu prends le problème au sérieux\n3. Explique les actions immédiates que tu vas entreprendre\n4. Donne un délai de résolution réaliste\n5. Propose un contact direct (téléphone) pour suivi\n6. Signe "L'équipe TaxiAssur - Service Client"`;
        break;

      default:
        systemPrompt = 'Tu es un conseiller professionnel chez TaxiAssur.';
        responseInstructions = `\n1. Réponds de manière professionnelle et courtoise\n2. Adapte ton ton au message reçu\n3. Propose ton aide pour toute question\n4. Signe "L'équipe TaxiAssur - contact@taxiassur.com"`;
    }

    let toneGuidance = '';
    if (email.sentiment === 'positive') {
      toneGuidance = '\n\nTon: Enthousiaste et chaleureux, profite de la dynamique positive.';
    } else if (email.sentiment === 'negative') {
      toneGuidance = '\n\nTon: Empathique et apaisant, focus sur la résolution du problème.';
    } else {
      toneGuidance = '\n\nTon: Professionnel et avenant.';
    }

    const userPrompt = `Email reçu de: ${email.from_name || email.from_email}\nSujet: ${email.subject || 'Sans objet'}\n\nContenu:\n${email.body}${leadInfo}\n\n${responseInstructions}${toneGuidance}\n\nIMPORTANT:\n- Réponds UNIQUEMENT en HTML (sans balises <html>, <body>, juste le contenu)\n- Utilise des paragraphes <p>, des listes <ul><li> si besoin\n- Style professionnel mais chaleureux\n- Maximum 200 mots\n- Ne jamais inventer d'informations techniques ou de prix\n- Si une info manque, demande-la poliment`;

    console.log('🤖 Appel OpenAI...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ Erreur OpenAI:', errorText);
      throw new Error('Erreur OpenAI: ' + errorText);
    }

    const openaiData = await openaiResponse.json();
    const generatedResponse = openaiData.choices[0].message.content;

    console.log('✅ Réponse générée:', generatedResponse.substring(0, 100));

    const responseSubject = email.subject?.startsWith('Re:')
      ? email.subject
      : `Re: ${email.subject || 'Votre demande'}`;

    await supabase
      .from('email_inbox')
      .update({
        ai_response: generatedResponse,
        ai_response_generated_at: new Date().toISOString()
      })
      .eq('id', message_id);

    return new Response(
      JSON.stringify({
        success: true,
        response: generatedResponse,
        subject: responseSubject,
        metadata: {
          intent: email.intent,
          sentiment: email.sentiment,
          model: 'gpt-4o-mini'
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('❌ Erreur génération réponse IA:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur lors de la génération'
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