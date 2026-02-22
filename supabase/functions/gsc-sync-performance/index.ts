import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCResponse {
  rows?: GSCRow[];
}

/**
 * Synchronise les données Google Search Console
 *
 * Authentification GSC :
 * - Utilise OAuth 2.0 Service Account
 * - Nécessite GOOGLE_SERVICE_ACCOUNT_EMAIL et GOOGLE_SERVICE_ACCOUNT_KEY
 * - Permissions requises : Search Console API - Read Only
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Configuration GSC
    const siteUrl = "https://taxiassur.com";
    const googleServiceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const googleServiceAccountKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");

    if (!googleServiceAccountEmail || !googleServiceAccountKey) {
      console.warn("⚠️ Google Service Account non configuré - utilisation de données de test");

      // En attendant la configuration, retourner succès
      return new Response(
        JSON.stringify({
          success: true,
          message: "Configuration GSC en attente. Configurez GOOGLE_SERVICE_ACCOUNT_EMAIL et GOOGLE_SERVICE_ACCOUNT_KEY",
          test_mode: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();
    const { days = 7 } = await req.json().catch(() => ({ days: 7 }));

    // Dates pour la requête
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Hier (données GSC avec 1 jour de décalage)
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`📊 Synchronisation GSC ${startDateStr} → ${endDateStr}`);

    // Obtenir le token d'accès Google
    const accessToken = await getGoogleAccessToken(
      googleServiceAccountEmail,
      googleServiceAccountKey
    );

    // 1. Récupérer les données par requête
    const queriesData = await fetchGSCData(siteUrl, startDateStr, endDateStr, accessToken, 'query');

    // 2. Récupérer les données par page
    const pagesData = await fetchGSCData(siteUrl, startDateStr, endDateStr, accessToken, 'page');

    let queriesImported = 0;
    let pagesImported = 0;

    // Importer les requêtes
    if (queriesData?.rows) {
      for (const row of queriesData.rows) {
        const query = row.keys[0];

        // Calculer le score d'opportunité
        const { data: scoreData } = await supabase
          .rpc('calculate_opportunity_score', {
            p_impressions: row.impressions,
            p_clicks: row.clicks,
            p_ctr: row.ctr,
            p_position: row.position
          });

        await supabase.from('gsc_queries').upsert({
          query,
          impressions: row.impressions,
          clicks: row.clicks,
          ctr: row.ctr,
          position: row.position,
          date: endDateStr,
          opportunity_score: scoreData || 0,
          country: 'fra',
          device: 'ALL'
        }, {
          onConflict: 'query,date,device,country'
        });

        queriesImported++;
      }
    }

    // Importer les pages
    if (pagesData?.rows) {
      for (const row of pagesData.rows) {
        const url = row.keys[0];

        const needsOptimization = row.ctr < 0.05 && row.impressions > 100;
        const priority = needsOptimization ? Math.min(100, Math.floor(row.impressions / 10)) : 0;

        await supabase.from('gsc_pages').upsert({
          url,
          impressions: row.impressions,
          clicks: row.clicks,
          ctr: row.ctr,
          position: row.position,
          date: endDateStr,
          needs_optimization: needsOptimization,
          optimization_priority: priority
        }, {
          onConflict: 'url,date'
        });

        pagesImported++;
      }
    }

    // Détecter et créer automatiquement les opportunités
    const { data: oppsCount } = await supabase.rpc('auto_create_opportunities');
    const opportunitiesDetected = oppsCount || 0;

    // Enregistrer l'historique de sync
    const duration = Date.now() - startTime;
    await supabase.from('gsc_sync_history').insert({
      start_date: startDateStr,
      end_date: endDateStr,
      queries_imported: queriesImported,
      pages_imported: pagesImported,
      opportunities_detected: opportunitiesDetected,
      status: 'success',
      duration_ms: duration,
      metadata: {
        total_rows_queries: queriesData?.rows?.length || 0,
        total_rows_pages: pagesData?.rows?.length || 0
      }
    });

    console.log(`✅ Sync réussie: ${queriesImported} requêtes, ${pagesImported} pages, ${opportunitiesDetected} opportunités`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synchronisation GSC réussie`,
        data: {
          period: `${startDateStr} → ${endDateStr}`,
          queries_imported: queriesImported,
          pages_imported: pagesImported,
          opportunities_detected: opportunitiesDetected,
          duration_ms: duration
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erreur sync GSC:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Obtient un token d'accès Google via Service Account
 */
async function getGoogleAccessToken(email: string, privateKey: string): Promise<string> {
  const scope = "https://www.googleapis.com/auth/webmasters.readonly";

  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  // Create JWT (simplified - in production use a proper JWT library)
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Note: Pour la production, utiliser une bibliothèque JWT complète
  // Cette implémentation simplifiée nécessite la clé privée formatée correctement

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signatureInput}.${privateKey}` // Simplifié pour l'exemple
    })
  });

  const data = await response.json();
  return data.access_token;
}

/**
 * Récupère les données de Google Search Console
 */
async function fetchGSCData(
  siteUrl: string,
  startDate: string,
  endDate: string,
  accessToken: string,
  dimension: 'query' | 'page'
): Promise<GSCResponse> {
  const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const requestBody = {
    startDate,
    endDate,
    dimensions: [dimension],
    rowLimit: 1000, // Maximum 25000
    startRow: 0
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`GSC API error: ${response.status} ${await response.text()}`);
  }

  return await response.json();
}
