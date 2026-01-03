import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ClassificationRequest {
  conversation_id: string;
  contact_id: string;
  email_content: string;
  subject: string;
  sender_email: string;
}

interface ClassificationResult {
  contact_type: 'prospect_taxi' | 'client' | 'partner_media' | 'partner_directory' | 'backlink_site' | 'unknown';
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  intent: string;
  requires_human_review: boolean;
  suggested_response_type: string;
  key_points: string[];
  reasoning: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const payload: ClassificationRequest = await req.json();
    
    console.log('🤖 IA Classifier: Analyse email', payload.conversation_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY non configurée');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Appel à OpenAI pour classification intelligente
    const prompt = `Tu es un expert en classification d'emails pour TaxiAssur, une entreprise d'assurance pour taxis.

Analyse cet email et détermine :
1. Le type de contact (prospect_taxi, client, partner_media, partner_directory, backlink_site, unknown)
2. La confiance de ta classification (0-100)
3. Le sentiment (positive, neutral, negative, urgent)
4. L'intention de l'expéditeur
5. Si une revue humaine est nécessaire
6. Le type de réponse suggéré
7. Les points clés de l'email
8. Ton raisonnement

**EMAIL:**
De: ${payload.sender_email}
Sujet: ${payload.subject}
Contenu: ${payload.email_content}

**CRITÈRES:**
- prospect_taxi: Chauffeur de taxi, société de taxi, demande de devis, questions sur assurance taxi
- client: Référence à un contrat existant, numéro de police, demande de modification
- partner_media: Magazine, blog, média, proposition de publication, interview
- partner_directory: Annuaire, listing, proposition de référencement
- backlink_site: Webmaster, SEO, échange de liens, guest post
- unknown: Aucun critère clair

Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "contact_type": "prospect_taxi",
  "confidence": 85,
  "sentiment": "positive",
  "intent": "demande de devis",
  "requires_human_review": false,
  "suggested_response_type": "devis_auto",
  "key_points": ["point 1", "point 2"],
  "reasoning": "explication"
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu es un expert en classification d\'emails. Réponds UNIQUEMENT en JSON valide.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const classificationText = openaiData.choices[0].message.content.trim();
    
    // Extraire le JSON de la réponse
    let classification: ClassificationResult;
    try {
      const jsonMatch = classificationText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[0]);
      } else {
        classification = JSON.parse(classificationText);
      }
    } catch (e) {
      console.error('❌ Erreur parsing JSON OpenAI:', classificationText);
      // Fallback
      classification = {
        contact_type: 'unknown',
        confidence: 0,
        sentiment: 'neutral',
        intent: 'non déterminé',
        requires_human_review: true,
        suggested_response_type: 'manual',
        key_points: [],
        reasoning: 'Erreur de classification'
      };
    }

    console.log('🎯 Classification:', classification);

    // Mettre à jour le contact
    await supabase
      .from('unified_contacts')
      .update({
        contact_type: classification.contact_type,
        classification_confidence: classification.confidence,
        status: classification.contact_type === 'client' ? 'converted' : 'contacted',
        ai_notes: {
          last_classification: classification,
          classified_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.contact_id);

    // Mettre à jour la conversation
    await supabase
      .from('email_conversations')
      .update({
        classification: classification.contact_type,
        sentiment: classification.sentiment,
        requires_human_review: classification.requires_human_review,
        ai_analysis: {
          classification: classification,
          classified_by: 'ai-email-classifier',
          classified_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.conversation_id);

    // Logger la décision IA
    await supabase
      .from('ai_decision_log')
      .insert({
        decision_type: 'classification',
        ai_agent: 'classifier',
        input_data: {
          conversation_id: payload.conversation_id,
          subject: payload.subject,
          sender: payload.sender_email
        },
        decision_made: classification,
        confidence_score: classification.confidence,
        execution_time_ms: Date.now() - startTime,
        success: true
      });

    // Si confiance élevée et pas de revue humaine nécessaire, envoyer au Responder
    if (classification.confidence >= 70 && !classification.requires_human_review) {
      const responderUrl = `${supabaseUrl}/functions/v1/ai-email-responder`;
      
      fetch(responderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          conversation_id: payload.conversation_id,
          contact_id: payload.contact_id,
          classification: classification
        })
      }).catch(err => console.error('⚠️ Erreur appel responder:', err));
    } else {
      console.log('⚠️ Revue humaine requise ou confiance faible');
    }

    const executionTime = Date.now() - startTime;
    console.log(`✅ Classification terminée en ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        classification: classification,
        execution_time_ms: executionTime
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error("❌ Erreur classification IA:", error);
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