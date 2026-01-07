import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Lead {
  id: string;
  email: string;
  phone: string;
  first_name?: string;
  last_name?: string;
  lead_status: string;
  lead_score: number;
  conversion_probability: number;
  estimated_value?: number;
  created_at: string;
  last_contact_at?: string;
  behavioral_data?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { lead_id } = await req.json();

    // Récupérer le lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    // Récupérer les interactions
    const { data: interactions } = await supabase
      .from('crm_interactions')
      .select('*')
      .eq('lead_id', lead_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Analyser le comportement
    const analysis = analyzeLeadBehavior(lead, interactions || []);

    // Générer suggestions IA avec OpenAI (si disponible)
    let aiSuggestions = [];
    if (openaiKey) {
      aiSuggestions = await generateAISuggestions(lead, interactions || [], analysis, openaiKey);
    }

    // Combiner avec suggestions basées sur règles
    const ruleSuggestions = generateRuleBasedSuggestions(lead, interactions || [], analysis);

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead_id,
        analysis: analysis,
        suggestions: [...aiSuggestions, ...ruleSuggestions],
        sales_script: generateSalesScript(lead, analysis),
        next_actions: generateNextActions(lead, analysis)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("❌ Error generating CRM suggestions:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

function analyzeLeadBehavior(lead: any, interactions: any[]) {
  const now = Date.now();
  const createdAt = new Date(lead.created_at).getTime();
  const lastContactAt = lead.last_contact_at ? new Date(lead.last_contact_at).getTime() : createdAt;

  const daysSinceCreated = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  const daysSinceContact = Math.floor((now - lastContactAt) / (1000 * 60 * 60 * 24));
  const hoursSinceCreated = Math.floor((now - createdAt) / (1000 * 60 * 60));

  const emailsSent = interactions.filter(i => i.type === 'email' && i.direction === 'outbound').length;
  const emailsOpened = interactions.filter(i => i.type === 'email' && i.opened_at).length;
  const smsSent = interactions.filter(i => i.type === 'sms').length;
  const calls = interactions.filter(i => i.type === 'call').length;

  const hasDocuments = interactions.some(i => i.type === 'document_upload');
  const hasOpened = emailsOpened > 0;
  const hasResponded = interactions.some(i => i.direction === 'inbound');

  return {
    daysSinceCreated,
    daysSinceContact,
    hoursSinceCreated,
    contactAttempts: emailsSent + smsSent + calls,
    emailsSent,
    emailsOpened,
    smsSent,
    calls,
    hasDocuments,
    hasOpened,
    hasResponded,
    engagementScore: calculateEngagementScore(hasOpened, hasResponded, hasDocuments, emailsSent, calls),
    urgency: calculateUrgency(daysSinceCreated, daysSinceContact, lead.lead_status, lead.conversion_probability),
    temperature: calculateTemperature(hoursSinceCreated, hasOpened, hasResponded, lead.conversion_probability)
  };
}

function calculateEngagementScore(hasOpened: boolean, hasResponded: boolean, hasDocuments: boolean, emails: number, calls: number): number {
  let score = 0;
  if (hasOpened) score += 30;
  if (hasResponded) score += 40;
  if (hasDocuments) score += 20;
  if (emails > 0) score += 5;
  if (calls > 0) score += 10;
  return Math.min(score, 100);
}

function calculateUrgency(daysSinceCreated: number, daysSinceContact: number, status: string, conversionProb: number): 'critical' | 'high' | 'medium' | 'low' {
  if (status === 'client') return 'low';

  if (daysSinceCreated === 0 && status === 'nouveau') return 'critical';
  if (daysSinceContact > 7 && status !== 'nouveau') return 'critical';
  if (daysSinceContact > 3 && conversionProb > 70) return 'high';
  if (daysSinceContact > 5) return 'high';
  if (daysSinceContact > 2) return 'medium';

  return 'low';
}

function calculateTemperature(hours: number, opened: boolean, responded: boolean, prob: number): 'hot' | 'warm' | 'cold' {
  if (hours < 24 && (opened || responded || prob > 80)) return 'hot';
  if (hours < 72 && (opened || prob > 60)) return 'warm';
  return 'cold';
}

function generateRuleBasedSuggestions(lead: any, interactions: any[], analysis: any) {
  const suggestions = [];

  // Lead chaud - action immédiate
  if (analysis.temperature === 'hot') {
    suggestions.push({
      type: 'action',
      priority: 'critical',
      title: '🔥 LEAD ULTRA-CHAUD - Appeler MAINTENANT',
      description: `Lead créé il y a ${analysis.hoursSinceCreated}h. Chances de conversion maximales dans les premières heures !`,
      action: 'call',
      estimated_conversion_boost: '+60%'
    });
  }

  // Relance urgente
  if (analysis.urgency === 'critical' && lead.lead_status !== 'nouveau') {
    suggestions.push({
      type: 'warning',
      priority: 'high',
      title: '⚠️ RELANCE URGENTE REQUISE',
      description: `${analysis.daysSinceContact} jours sans contact. Risque de perte de ${lead.estimated_value || 3500}€`,
      action: 'email',
      estimated_conversion_boost: '+35%'
    });
  }

  // Email ouvert mais pas de réponse
  if (analysis.hasOpened && !analysis.hasResponded && analysis.daysSinceContact > 1) {
    suggestions.push({
      type: 'opportunity',
      priority: 'high',
      title: '👀 Email ouvert - Intérêt confirmé',
      description: 'Le prospect a ouvert l\'email mais n\'a pas répondu. Relancer maintenant augmente les chances de 45%',
      action: 'call',
      estimated_conversion_boost: '+45%'
    });
  }

  // Haute probabilité de conversion
  if ((lead.conversion_probability || 0) > 75) {
    suggestions.push({
      type: 'opportunity',
      priority: 'high',
      title: '💎 Opportunité en OR',
      description: `${lead.conversion_probability}% de chances de conversion. Valeur: ${lead.estimated_value || 3500}€. Prioriser ce lead !`,
      action: 'quote',
      estimated_conversion_boost: '+70%'
    });
  }

  // Pas assez de tentatives de contact
  if (analysis.contactAttempts < 3 && analysis.daysSinceCreated > 0 && lead.lead_status !== 'client') {
    suggestions.push({
      type: 'action',
      priority: 'medium',
      title: '📞 Intensifier les contacts',
      description: `Seulement ${analysis.contactAttempts} tentative(s). Statistiquement, 5-7 contacts augmentent la conversion de 80%`,
      action: 'multi-channel',
      estimated_conversion_boost: '+50%'
    });
  }

  // Documents reçus - lead qualifié
  if (analysis.hasDocuments) {
    suggestions.push({
      type: 'opportunity',
      priority: 'high',
      title: '📄 Documents reçus - Lead qualifié',
      description: 'Le prospect a envoyé ses documents. Niveau d\'engagement élevé. Envoyer le devis maintenant !',
      action: 'quote',
      estimated_conversion_boost: '+85%'
    });
  }

  // Statut qualifié mais pas de devis
  if (lead.lead_status === 'qualifié' && analysis.daysSinceContact > 1) {
    suggestions.push({
      type: 'action',
      priority: 'high',
      title: '📋 Envoyer le devis personnalisé',
      description: 'Lead qualifié en attente de devis. Chaque jour de retard diminue les chances de 15%',
      action: 'quote',
      estimated_conversion_boost: '+60%'
    });
  }

  return suggestions;
}

async function generateAISuggestions(lead: any, interactions: any[], analysis: any, openaiKey: string) {
  try {
    const prompt = `Tu es un expert en vente d'assurance et CRM. Analyse ce lead et fournis 2-3 suggestions ultra-précises.

LEAD:
- Nom: ${lead.first_name || ''} ${lead.last_name || ''}
- Email: ${lead.email}
- Statut: ${lead.lead_status}
- Score: ${lead.lead_score}
- Probabilité: ${lead.conversion_probability}%
- Créé: ${analysis.daysSinceCreated} jours
- Dernier contact: ${analysis.daysSinceContact} jours
- Températ: ${analysis.temperature}
- Urgence: ${analysis.urgency}

COMPORTEMENT:
- Emails envoyés: ${analysis.emailsSent}
- Emails ouverts: ${analysis.emailsOpened}
- A répondu: ${analysis.hasResponded}
- Documents: ${analysis.hasDocuments}

Réponds UNIQUEMENT avec un JSON:
{
  "suggestions": [
    {
      "type": "action|opportunity|warning",
      "priority": "critical|high|medium",
      "title": "Titre court percutant",
      "description": "Description actionnable",
      "action": "call|email|sms|quote",
      "reasoning": "Pourquoi cette action"
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return result.suggestions || [];
  } catch (error) {
    console.error('Erreur génération IA:', error);
    return [];
  }
}

function generateSalesScript(lead: any, analysis: any) {
  const firstName = lead.first_name || lead.name?.split(' ')[0] || 'Monsieur/Madame';
  const city = lead.city || 'votre région';
  const isHot = analysis.temperature === 'hot';
  const hasEngagement = analysis.engagementScore > 50;

  let script = `🎯 SCRIPT DE VENTE OPTIMISÉ\n\n`;

  // Intro adaptée
  if (isHot) {
    script += `👋 ACCROCHE RAPIDE (Lead chaud - 10 secondes)\n`;
    script += `"Bonjour ${firstName}, je vois que vous cherchez une assurance taxi. Excellente nouvelle : j'ai LA solution pour vous faire économiser jusqu'à 40% IMMÉDIATEMENT !"\n\n`;
  } else if (hasEngagement) {
    script += `👋 ACCROCHE PERSONNALISÉE (Lead engagé - 15 secondes)\n`;
    script += `"Bonjour ${firstName}, je vous recontacte concernant votre demande d'assurance taxi. J'ai préparé une offre sur-mesure qui devrait vraiment vous intéresser !"\n\n`;
  } else {
    script += `👋 ACCROCHE STANDARD (15 secondes)\n`;
    script += `"Bonjour ${firstName}, je suis [Votre nom] de TaxiAssur. Suite à votre demande, j'ai trouvé des solutions qui peuvent vous faire économiser jusqu'à 30% !"\n\n`;
  }

  // Questions de qualification
  script += `🎯 QUALIFICATION RAPIDE (30 secondes)\n`;
  script += `"Avant de vous présenter les meilleures offres :\n`;
  script += `- Quel véhicule conduisez-vous actuellement ?\n`;
  script += `- Depuis combien de temps êtes-vous chauffeur ?\n`;
  script += `- Des sinistres ces 3 dernières années ?"\n\n`;

  // Proposition de valeur
  script += `💎 PROPOSITION DE VALEUR (45 secondes)\n`;
  script += `"Parfait ! Voici votre package TaxiAssur :\n\n`;
  script += `✅ RC Pro COMPLÈTE (obligatoire)\n`;
  script += `✅ Tous dommages + vol + incendie\n`;
  script += `✅ Protection juridique illimitée\n`;
  script += `✅ Véhicule de remplacement 24h/7j\n`;
  script += `✅ Assistance panne 0km\n\n`;

  const monthlyPrice = Math.round((lead.estimated_value || 3500) / 12);
  const discountPrice = Math.round(monthlyPrice * 0.7);

  script += `Prix: ${discountPrice}€/mois au lieu de ${monthlyPrice}€/mois"\n\n`;

  // Urgence adaptée
  if (isHot || hasEngagement) {
    script += `🔥 URGENCE FORTE (15 secondes)\n`;
    script += `"Cette offre exclusive expire CE SOIR à minuit. Plus de 600 chauffeurs à ${city} nous font déjà confiance."\n\n`;
  } else {
    script += `⏰ URGENCE (20 secondes)\n`;
    script += `"Cette offre spéciale est valable 7 jours. Plus de 600 chauffeurs nous ont déjà fait confiance cette année."\n\n`;
  }

  // Closing
  script += `📋 CLOSING (15 secondes)\n`;
  script += `"Je vous envoie votre devis personnalisé par email dans 2 minutes. Pour finaliser, j'aurai besoin de votre carte grise et permis. Ça vous convient ?"\n\n`;

  // Bonus si hésitation
  script += `🎁 SI HÉSITATION\n`;
  script += `"Si vous souscrivez aujourd'hui, je vous offre :\n`;
  script += `- 1er mois à -50%\n`;
  script += `- Frais de dossier offerts (valeur 50€)\n`;
  script += `- Garantie satisfait ou remboursé 30 jours"\n\n`;

  // Arguments anti-objections
  script += `💪 RÉPONSES AUX OBJECTIONS\n\n`;
  script += `"C'est trop cher" → "Comparé à combien payez-vous actuellement ? Nos clients économisent en moyenne 400€/an"\n\n`;
  script += `"Je dois réfléchir" → "Je comprends. Qu'est-ce qui vous fait hésiter exactement ? Le prix, les garanties ?"\n\n`;
  script += `"Je veux comparer" → "Excellente idée ! Mais attention : chaque jour sans assurance adaptée = risque. Validons ensemble maintenant, vous pourrez annuler sous 14 jours"`;

  return script;
}

function generateNextActions(lead: any, analysis: any) {
  const actions = [];

  if (analysis.temperature === 'hot') {
    actions.push({
      action: 'call',
      priority: 1,
      title: '☎️ Appeler IMMÉDIATEMENT',
      description: 'Lead chaud - Ne pas attendre',
      deadline: 'Dans les 15 prochaines minutes'
    });
  }

  if (lead.lead_status === 'nouveau' && analysis.emailsSent === 0) {
    actions.push({
      action: 'email',
      priority: 2,
      title: '📧 Envoyer email de bienvenue',
      description: 'Premier contact par email',
      deadline: 'Aujourd\'hui'
    });
  }

  if (analysis.hasOpened && !analysis.hasResponded) {
    actions.push({
      action: 'call',
      priority: 1,
      title: '📞 Appel de suivi',
      description: 'Email ouvert mais pas de réponse',
      deadline: 'Aujourd\'hui'
    });
  }

  if (lead.lead_status === 'qualifié' && !analysis.hasDocuments) {
    actions.push({
      action: 'email',
      priority: 2,
      title: '📄 Demander les documents',
      description: 'Carte grise, permis, justificatif',
      deadline: 'Dans les 24h'
    });
  }

  if (analysis.hasDocuments && lead.lead_status !== 'devis_envoyé') {
    actions.push({
      action: 'quote',
      priority: 1,
      title: '📋 Envoyer le devis',
      description: 'Documents reçus - lead chaud',
      deadline: 'Dans les 2h'
    });
  }

  if (analysis.daysSinceContact > 3 && lead.lead_status !== 'client') {
    actions.push({
      action: 'sms',
      priority: 2,
      title: '💬 SMS de relance',
      description: 'Rappel offre en cours',
      deadline: 'Aujourd\'hui'
    });
  }

  return actions.sort((a, b) => a.priority - b.priority).slice(0, 3);
}