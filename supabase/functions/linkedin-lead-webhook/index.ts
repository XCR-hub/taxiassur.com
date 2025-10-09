import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface LinkedInLead {
  name?: string;
  email?: string;
  phone?: string;
  immatriculation?: string;
  city?: string;
  ref?: string;
  utm_source?: string;
  [key: string]: string | undefined;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse incoming payload from Make.com / Zapier
    const payload: LinkedInLead = await req.json();

    console.log('Received LinkedIn lead:', payload);

    // Extract and validate required fields
    const {
      name,
      email,
      phone,
      immatriculation,
      city,
      ref,
      utm_source = 'linkedin',
    } = payload;

    // Validation: at least name and phone are required
    if (!name || !phone) {
      console.error('Missing required fields:', { name, phone });
      return new Response(
        JSON.stringify({
          error: 'missing_fields',
          message: 'Name and phone are required',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Insert lead into database
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          name,
          phone,
          email: email || null,
          immatriculation: immatriculation || null,
          city: city || null,
          ambassador_code: ref || null,
          source: 'linkedin',
          utm_source,
          status: 'new',
          notes: 'Lead from LinkedIn Lead Gen Form',
        },
      ])
      .select();

    if (error) {
      console.error('Database insert error:', error);
      return new Response(
        JSON.stringify({
          error: 'db_error',
          message: error.message,
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

    console.log('Lead inserted successfully:', data[0]);

    // Optional: Send notification to ambassador if ref exists
    if (ref) {
      try {
        // Get ambassador details
        const { data: ambassador } = await supabase
          .from('ambassadors')
          .select('*')
          .eq('code', ref)
          .maybeSingle();

        if (ambassador) {
          console.log('Lead attributed to ambassador:', ambassador.name);
          // TODO: Send email notification to ambassador
          // You can add email sending logic here using Supabase Edge Functions
        }
      } catch (ambassadorError) {
        console.error('Error checking ambassador:', ambassadorError);
        // Don't fail the request if ambassador check fails
      }
    }

    // Optional: Send confirmation email to lead
    // You can integrate with SendGrid or another email service here

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        lead: data[0],
        message: 'Lead captured successfully',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({
        error: 'exception',
        message: err instanceof Error ? err.message : 'Unknown error',
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
