import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Competitor {
  domain: string;
  searchQuery: string;
}

interface BacklinkOpportunity {
  domain: string;
  url: string;
  pageTitle: string;
  pageAuthority: number;
  domainAuthority: number;
  anchorText: string;
  linkingTo: string;
  category: string;
  estimatedTraffic: number;
  relevanceScore: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const startTime = Date.now();

    // Liste des concurrents à scanner
    const competitors: Competitor[] = [
      { domain: 'mfa.fr', searchQuery: 'assurance taxi mfa' },
      { domain: 'april-moto.com', searchQuery: 'assurance taxi april' },
      { domain: 'axa.fr', searchQuery: 'assurance taxi axa' },
      { domain: 'allianz.fr', searchQuery: 'assurance taxi allianz' },
    ];

    // Create scan history entry
    const { data: scanEntry, error: scanError } = await supabase
      .from('backlink_scan_history')
      .insert({
        competitors_scanned: competitors.map(c => c.domain),
        status: 'running',
      })
      .select()
      .single();

    if (scanError) throw scanError;

    let totalOpportunitiesFound = 0;
    const newOpportunities: BacklinkOpportunity[] = [];

    // Simuler la découverte d'opportunités (en prod, utiliser API Google Custom Search ou scraping)
    // Pour cette démo, on génère des opportunités fictives basées sur des patterns réels
    
    for (const competitor of competitors) {
      // Simuler 2-5 opportunités par concurrent
      const opportunitiesCount = Math.floor(Math.random() * 4) + 2;

      for (let i = 0; i < opportunitiesCount; i++) {
        const opportunity: BacklinkOpportunity = {
          domain: `example-blog-${Math.random().toString(36).substring(7)}.fr`,
          url: `https://example-blog.fr/article-assurance-taxi-${Math.random().toString(36).substring(7)}`,
          pageTitle: `Guide assurance taxi ${new Date().getFullYear()}`,
          pageAuthority: Math.floor(Math.random() * 30) + 15,
          domainAuthority: Math.floor(Math.random() * 25) + 18,
          anchorText: 'assurance taxi',
          linkingTo: competitor.domain,
          category: ['Blog Auto', 'Magazine Pro', 'Forum Taxi'][Math.floor(Math.random() * 3)],
          estimatedTraffic: Math.floor(Math.random() * 500) + 100,
          relevanceScore: Math.floor(Math.random() * 30) + 70,
        };

        newOpportunities.push(opportunity);
      }
    }

    // Insérer les nouvelles opportunités dans Supabase (si elles n'existent pas déjà)
    for (const opp of newOpportunities) {
      const { error: insertError } = await supabase
        .from('backlink_opportunities')
        .upsert({
          domain: opp.domain,
          url: opp.url,
          page_title: opp.pageTitle,
          page_authority: opp.pageAuthority,
          domain_authority: opp.domainAuthority,
          anchor_text: opp.anchorText,
          linking_to: opp.linkingTo,
          category: opp.category,
          estimated_traffic: opp.estimatedTraffic,
          relevance_score: opp.relevanceScore,
          last_scan_date: new Date().toISOString(),
        }, {
          onConflict: 'url',
          ignoreDuplicates: true,
        });

      if (!insertError) {
        totalOpportunitiesFound++;
      }
    }

    const duration = Date.now() - startTime;

    // Update scan history
    await supabase
      .from('backlink_scan_history')
      .update({
        opportunities_found: totalOpportunitiesFound,
        scan_duration_ms: duration,
        status: 'success',
      })
      .eq('id', scanEntry.id);

    return new Response(
      JSON.stringify({
        success: true,
        opportunitiesFound: totalOpportunitiesFound,
        competitorsScanned: competitors.length,
        scanDurationMs: duration,
        scanId: scanEntry.id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error scanning backlinks:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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