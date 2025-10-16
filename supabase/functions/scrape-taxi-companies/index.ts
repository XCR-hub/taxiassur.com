import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScrapeRequest {
  cities: string[];
  max_per_city?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { cities, max_per_city = 50 }: ScrapeRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = [];

    for (const city of cities) {
      console.log(`🔍 Scraping taxis à ${city}...`);

      // Recherche Google Maps API
      const taxis = await scrapeGoogleMaps(city, max_per_city);

      // Insérer dans la base
      for (const taxi of taxis) {
        const { data, error } = await supabase
          .from("taxi_prospects")
          .upsert(
            {
              company_name: taxi.name,
              email: taxi.email,
              phone: taxi.phone,
              address: taxi.address,
              city: city,
              postal_code: taxi.postalCode,
              website_url: taxi.website,
              source: "google_maps",
              status: "new",
              metadata: {
                rating: taxi.rating,
                reviews_count: taxi.reviewsCount,
                place_id: taxi.placeId,
              },
            },
            {
              onConflict: "email",
              ignoreDuplicates: false,
            }
          )
          .select()
          .maybeSingle();

        if (!error && data) {
          results.push(data);
        }
      }

      console.log(`✅ ${taxis.length} taxis trouvés à ${city}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_scraped: results.length,
        cities_processed: cities.length,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erreur scraping:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

// ============================================================================
// SCRAPING GOOGLE MAPS
// ============================================================================

async function scrapeGoogleMaps(
  city: string,
  maxResults: number
): Promise<any[]> {
  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

  if (!apiKey) {
    console.warn("Google Places API Key manquante, retour données fictives");
    return [];
  }

  try {
    // Recherche Places API
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=taxi+${encodeURIComponent(
      city
    )}&key=${apiKey}&language=fr`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.results || searchData.results.length === 0) {
      return [];
    }

    const taxis = [];

    // Limiter au nombre max
    const results = searchData.results.slice(0, maxResults);

    // Pour chaque résultat, récupérer détails
    for (const place of results) {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,formatted_address,website,rating,user_ratings_total&key=${apiKey}&language=fr`;

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.result) {
        const result = detailsData.result;

        // Extraire email depuis website si possible
        let email = null;
        if (result.website) {
          email = await extractEmailFromWebsite(result.website);
        }

        taxis.push({
          name: result.name,
          phone: result.formatted_phone_number,
          email,
          address: result.formatted_address,
          postalCode: extractPostalCode(result.formatted_address),
          website: result.website,
          rating: result.rating,
          reviewsCount: result.user_ratings_total,
          placeId: place.place_id,
        });
      }

      // Pause pour éviter rate limit
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return taxis;
  } catch (error) {
    console.error(`Erreur scraping ${city}:`, error);
    return [];
  }
}

// ============================================================================
// EXTRACTION EMAIL DEPUIS WEBSITE
// ============================================================================

async function extractEmailFromWebsite(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TaxiAssur Bot 1.0",
      },
    });

    const html = await response.text();

    // Regex email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailRegex);

    if (emails && emails.length > 0) {
      // Filtrer emails génériques
      const filtered = emails.filter(
        (email) =>
          !email.includes("example.com") &&
          !email.includes("@gmail.com") &&
          !email.includes("@hotmail.com")
      );

      return filtered[0] || emails[0];
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// EXTRACTION CODE POSTAL
// ============================================================================

function extractPostalCode(address: string): string | null {
  const match = address.match(/\b\d{5}\b/);
  return match ? match[0] : null;
}
