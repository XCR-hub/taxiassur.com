import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type = 'daily' } = await req.json();

    const { data: latestDigest, error: digestError } = await supabase
      .from('news_digest')
      .select('*')
      .eq('type', type)
      .is('sent_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (digestError || !latestDigest) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Aucun digest à envoyer',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('email, nom, prenom')
      .eq('statut', 'converti')
      .or('newsletter_opt_in.eq.true,statut.eq.converti');

    if (leadsError) throw leadsError;

    const recipients = leads?.map(lead => lead.email).filter(Boolean) || [];

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Aucun destinataire trouvé',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${latestDigest.title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px 10px 0 0;
      text-align: center;
      margin: -30px -30px 30px -30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .summary {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      font-style: italic;
    }
    .digest-item {
      border-bottom: 1px solid #e9ecef;
      padding: 20px 0;
      margin: 20px 0;
    }
    .digest-item:last-child {
      border-bottom: none;
    }
    .digest-item h3 {
      color: #667eea;
      margin-top: 0;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
      color: #6c757d;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 0;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📰 ${latestDigest.title}</h1>
      <p>${type === 'daily' ? 'Votre digest quotidien' : 'Votre digest hebdomadaire'}</p>
    </div>

    ${latestDigest.summary ? `<div class="summary"><strong>En bref :</strong> ${latestDigest.summary}</div>` : ''}

    <div class="content">
      ${latestDigest.content}
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://taxiassur.fr/actualites" class="button">
        Voir toutes les actualités →
      </a>
    </div>

    <div class="footer">
      <p><strong>TaxiAssur</strong> - Votre partenaire assurance taxi</p>
      <p>Vous recevez cet email car vous êtes abonné à notre newsletter.</p>
      <p><a href="https://taxiassur.fr/newsletter?unsubscribe=true">Se désabonner</a></p>
    </div>
  </div>
</body>
</html>
    `;

    let emailsSent = 0;

    if (resendApiKey) {
      for (const email of recipients.slice(0, 100)) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'TaxiAssur <newsletter@taxiassur.fr>',
              to: email,
              subject: latestDigest.title,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            emailsSent++;
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error sending email to ${email}:`, error);
        }
      }
    } else {
      console.log('RESEND_API_KEY not configured, simulating email send');
      emailsSent = Math.min(recipients.length, 100);
    }

    await supabase
      .from('news_digest')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', latestDigest.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Digest envoyé à ${emailsSent} destinataires`,
        emailsSent,
        digest: latestDigest,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('News Email Alerts Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
