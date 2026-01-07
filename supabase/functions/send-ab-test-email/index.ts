import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { ab_test_id } = await req.json();

    if (!ab_test_id) {
      return new Response(
        JSON.stringify({ error: 'ab_test_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer le test A/B
    const { data: abTest, error: abError } = await supabase
      .from('email_ab_tests')
      .select('*')
      .eq('id', ab_test_id)
      .single();

    if (abError || !abTest) {
      return new Response(
        JSON.stringify({ error: 'Test A/B introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les leads actifs
    const { data: leads } = await supabase
      .from('leads')
      .select('id, email, name')
      .eq('status', 'nouveau')
      .limit(abTest.sample_size);

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun lead disponible' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marquer le test comme démarré
    await supabase
      .from('email_ab_tests')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', ab_test_id);

    let sentA = 0;
    let sentB = 0;

    // Envoyer les emails (50/50)
    for (const [index, lead] of leads.entries()) {
      const variant = index % 2 === 0 ? 'A' : 'B';
      const subject = variant === 'A' ? abTest.variant_a_subject : abTest.variant_b_subject;
      const content = variant === 'A' ? abTest.variant_a_content : abTest.variant_b_content;

      try {
        // Appeler send-crm-email
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-crm-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            to_email: lead.email,
            to_name: lead.name,
            subject,
            content,
            lead_id: lead.id
          })
        });

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json();
          
          // Enregistrer la variante
          const { data: emailSend } = await supabase
            .from('email_sends')
            .select('id')
            .eq('tracking_id', emailResult.tracking_id)
            .single();

          if (emailSend) {
            await supabase
              .from('email_ab_variants')
              .insert({
                ab_test_id,
                email_send_id: emailSend.id,
                variant
              });
          }

          if (variant === 'A') sentA++;
          else sentB++;
        }
      } catch (error) {
        console.error(`Erreur envoi à ${lead.email}:`, error);
      }

      // Pause pour éviter rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`✅ Test A/B envoyé: ${sentA} variante A, ${sentB} variante B`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_a: sentA,
        sent_b: sentB,
        total: sentA + sentB
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});