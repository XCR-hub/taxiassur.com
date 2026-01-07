import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const trackingId = url.searchParams.get('id');
    const targetUrl = url.searchParams.get('url');

    if (!trackingId || !targetUrl) {
      console.error('❌ Paramètres manquants:', { trackingId, targetUrl });
      return new Response('Invalid request', { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer infos de la requête
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Trouver l'email correspondant
    const { data: emailSend, error: emailError } = await supabase
      .from('email_sends')
      .select('id')
      .eq('tracking_id', trackingId)
      .maybeSingle();

    if (emailError) {
      console.error('❌ Erreur recherche email:', emailError);
    } else if (emailSend) {
      // Enregistrer le clic
      const { error: insertError } = await supabase
        .from('email_clicks')
        .insert({
          email_send_id: emailSend.id,
          tracking_id: trackingId,
          link_url: decodeURIComponent(targetUrl),
          ip_address: ipAddress,
          user_agent: userAgent,
          clicked_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Erreur enregistrement clic:', insertError);
      } else {
        console.log('✅ Clic tracké pour:', trackingId, 'URL:', targetUrl);
      }
    }

    // Rediriger vers l'URL cible
    return Response.redirect(decodeURIComponent(targetUrl), 302);

  } catch (error) {
    console.error('❌ Erreur dans track-email-click:', error);
    
    // En cas d'erreur, rediriger vers la page d'accueil
    return Response.redirect('https://taxiassur.com', 302);
  }
});