import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RSSItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  category?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url, sourceName } = await req.json();

    if (!url) {
      throw new Error('URL RSS requise');
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TaxiAssur/1.0 (News Aggregator)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const xmlText = await response.text();

    const items: RSSItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const matches = xmlText.matchAll(itemRegex);

    for (const match of matches) {
      const itemContent = match[1];

      const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
      const descMatch = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/i);
      const linkMatch = itemContent.match(/<link>(.*?)<\/link>/i);
      const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/i);
      const categoryMatch = itemContent.match(/<category><!\[CDATA\[(.*?)\]\]><\/category>|<category>(.*?)<\/category>/i);

      const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
      const description = (descMatch?.[1] || descMatch?.[2] || '').trim();
      const link = linkMatch?.[1]?.trim() || '';
      const pubDate = pubDateMatch?.[1]?.trim() || new Date().toISOString();
      const category = (categoryMatch?.[1] || categoryMatch?.[2] || '').trim();

      if (title && link) {
        const cleanDescription = description
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim()
          .substring(0, 500);

        items.push({
          id: `${sourceName || 'rss'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: title.substring(0, 200),
          description: cleanDescription,
          link,
          pubDate,
          source: sourceName || 'RSS',
          category: category || 'Actualité',
        });
      }

      if (items.length >= 20) break;
    }

    return new Response(
      JSON.stringify({ success: true, items, count: items.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('RSS Parser Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, items: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
