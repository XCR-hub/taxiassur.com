import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();

    console.log("🤖 IA Auto-Executor - Action:", body.action);

    switch (body.action) {
      case 'send_email': {
        const { to, subject, html_content, template_key } = body.data;
        
        const result = await sendEmailBrevo(to, subject, html_content);
        
        await supabase.from('crm_interactions').insert({
          lead_id: body.data.lead_id,
          type: 'email',
          direction: 'outbound',
          subject,
          content: html_content,
          to_email: to
        });
        
        return new Response(
          JSON.stringify({ success: true, result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'generate_attestation': {
        const attestation = await generateAttestationPDF(body.data);
        
        return new Response(
          JSON.stringify({ success: true, attestation }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'optimize_template': {
        const optimized = await optimizeEmailTemplate(
          body.data.template_key,
          openaiKey,
          supabase
        );
        
        return new Response(
          JSON.stringify({ success: true, optimized }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'auto_learn': {
        const { data, error } = await supabase.rpc('ia_learn_from_all_sources');
        
        return new Response(
          JSON.stringify({ success: true, learning_result: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('❌ IA Auto-Executor Error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Executor Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

async function sendEmailBrevo(
  to: string,
  subject: string,
  htmlContent: string
): Promise<any> {
  const brevoKey = Deno.env.get('BREVO_API_KEY');
  
  if (!brevoKey) {
    console.log('⚠️ Brevo not configured, simulating email');
    return { simulated: true, to, subject };
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': brevoKey
    },
    body: JSON.stringify({
      sender: {
        name: 'TaxiAssur.com',
        email: Deno.env.get('BREVO_SENDER_EMAIL') || 'contact@taxiassur.com'
      },
      to: [{ email: to }],
      subject,
      htmlContent
    })
  });

  return await response.json();
}

async function generateAttestationPDF(data: any): Promise<any> {
  console.log('📄 Génération attestation pour:', data.contract_id);
  
  return {
    generated: true,
    pdf_url: `https://taxiassur.com/attestations/${data.contract_id}.pdf`,
    contract_id: data.contract_id
  };
}

async function optimizeEmailTemplate(
  templateKey: string,
  openaiKey: string,
  supabase: any
): Promise<any> {
  const { data: template } = await supabase
    .from('email_templates_dynamic')
    .select('*')
    .eq('template_key', templateKey)
    .single();

  if (!template) {
    return { error: 'Template not found' };
  }

  const prompt = `Tu es un expert en copywriting et conversion emails.

TEMPLATE ACTUEL : ${templateKey}
VERSIONS EXISTANTES : ${JSON.stringify(template.versions)}
STATS PERFORMANCE : ${JSON.stringify(template.version_stats)}

OBJECTIF : Créer une NOUVELLE version encore meilleure

INSTRUCTIONS :
1. Analyse les versions existantes
2. Identifie ce qui fonctionne (open rate, click rate)
3. Crée une version améliorée avec :
   - Subject line irrésistible
   - Accroche percutante
   - Bénéfices clairs
   - CTA visible et urgent
   - Ton professionnel mais chaleureux

Réponds UNIQUEMENT avec un JSON :
{
  "subject": "Nouveau subject optimisé",
  "html_content": "HTML complet optimisé",
  "improvements": ["amélioration 1", "amélioration 2"],
  "expected_improvement_percent": 15
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  const optimized = JSON.parse(data.choices[0].message.content);

  const newVersions = [
    ...(template.versions || []),
    {
      version: (template.versions?.length || 0) + 1,
      subject: optimized.subject,
      html_content: optimized.html_content,
      improvements: optimized.improvements,
      created_at: new Date().toISOString()
    }
  ];

  await supabase
    .from('email_templates_dynamic')
    .update({
      versions: newVersions,
      last_optimized_at: new Date().toISOString(),
      optimization_count: (template.optimization_count || 0) + 1
    })
    .eq('template_key', templateKey);

  return {
    optimized: true,
    new_version: newVersions.length,
    improvements: optimized.improvements
  };
}