import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Pixel transparent 1x1 en base64
const TRACKING_PIXEL = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0));

function isEmailTrackingAllowed(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const value = (metadata as Record<string, unknown>).email_tracking_allowed;
  return value === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const trackingId = url.searchParams.get('id');

    if (!trackingId) {
      console.error('❌ Tracking ID manquant');
      return new Response(TRACKING_PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...corsHeaders
        }
      });
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
      .select('id, metadata')
      .eq('tracking_id', trackingId)
      .maybeSingle();

    if (emailError) {
      console.error('❌ Erreur recherche email:', emailError);
      return new Response(TRACKING_PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...corsHeaders
        }
      });
    }

    if (!emailSend) {
      console.log('⚠️ Email non trouvé pour tracking_id:', trackingId);
      return new Response(TRACKING_PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...corsHeaders
        }
      });
    }

    if (!isEmailTrackingAllowed(emailSend.metadata)) {
      console.log('Email open tracking skipped: missing explicit tracking consent');
      return new Response(TRACKING_PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...corsHeaders
        }
      });
    }

    // Enregistrer l'ouverture
    const { error: insertError } = await supabase
      .from('email_opens')
      .insert({
        email_send_id: emailSend.id,
        tracking_id: trackingId,
        ip_address: ipAddress,
        user_agent: userAgent,
        opened_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('❌ Erreur enregistrement ouverture:', insertError);
    } else {
      console.log('✅ Ouverture trackée pour:', trackingId);
    }

    // Retourner le pixel transparent
    return new Response(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('❌ Erreur dans track-email-open:', error);
    return new Response(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...corsHeaders
      }
    });
  }
});