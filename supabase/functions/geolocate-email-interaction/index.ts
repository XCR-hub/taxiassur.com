import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GeoData {
  country_code?: string;
  country_name?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

function extractBearerToken(req: Request): string {
  const authHeader = req.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function isAuthorizedServiceRequest(req: Request, serviceRoleKey: string): boolean {
  const bearerToken = extractBearerToken(req);
  const apiKey = req.headers.get('apikey') || req.headers.get('Apikey') || '';
  return Boolean(serviceRoleKey) && (bearerToken === serviceRoleKey || apiKey === serviceRoleKey);
}

function isEmailGeolocationAllowed(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as Record<string, unknown>).email_geolocation_allowed === true;
}
async function geolocateIP(ip: string): Promise<GeoData> {
  try {
    // Utiliser API gratuite ip-api.com
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon,timezone`);
    
    if (!response.ok) {
      console.warn('Géolocalisation API erreur:', response.status);
      return {};
    }

    const data = await response.json();
    
    if (data.status === 'fail') {
      console.warn('Géolocalisation échouée:', data.message);
      return {};
    }

    return {
      country_code: data.countryCode,
      country_name: data.country,
      city: data.city,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone
    };
  } catch (error) {
    console.error('Erreur géolocalisation:', error);
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email_send_id, event_type, ip_address } = await req.json();

    if (!email_send_id || !event_type || !ip_address) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!isAuthorizedServiceRequest(req, supabaseKey)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (Deno.env.get('ENABLE_EMAIL_GEOLOCATION') !== 'true') {
      return new Response(
        JSON.stringify({ success: false, error: 'Email geolocation disabled by policy' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: emailSend, error: emailError } = await supabase
      .from('email_sends')
      .select('id, metadata')
      .eq('id', email_send_id)
      .maybeSingle();

    if (emailError) throw emailError;

    if (!emailSend || !isEmailGeolocationAllowed(emailSend.metadata)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing explicit email geolocation consent' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Géolocaliser l'IP
    const geoData = await geolocateIP(ip_address);

    // Enregistrer en base
    const { error } = await supabase
      .from('email_geolocation')
      .insert({
        email_send_id,
        event_type,
        ip_address,
        ...geoData
      });

    if (error) {
      console.error('Erreur insertion géolocalisation:', error);
      throw error;
    }

    console.log(`✅ Géolocalisation enregistrée: ${geoData.city}, ${geoData.country_name}`);

    return new Response(
      JSON.stringify({ success: true, location: geoData }),
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