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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type = 'daily' } = await req.json();

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    if (type === 'daily') {
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
      periodStart.setDate(periodStart.getDate() - 1);
    } else {
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
      periodStart.setDate(periodStart.getDate() - 7);
    }

    const { data: articles, error: articlesError } = await supabase
      .from('news_articles')
      .select('*')
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
      .order('score', { ascending: false })
      .limit(type === 'daily' ? 10 : 30);

    if (articlesError) throw articlesError;

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Aucune actualité pour cette période',
          articlesCount: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let digestContent = '';
    let digestTitle = '';
    let summary = '';

    if (openaiApiKey) {
      const articlesText = articles
        .map((a, i) => `${i + 1}. **${a.title}** (${a.source})\n${a.excerpt || a.content.substring(0, 200)}\n`)
        .join('\n');

      const systemPrompt = `Tu es un expert en synthèse d'actualités pour le secteur du taxi et de l'assurance taxi. Tu dois créer un digest ${type === 'daily' ? 'quotidien' : 'hebdomadaire'} professionnel, concis et pertinent.`;

      const userPrompt = `Crée une synthèse ${type === 'daily' ? 'quotidienne' : 'hebdomadaire'} des actualités taxi suivantes :

${articlesText}

Réponds en JSON avec :
{
  "title": "Titre accrocheur du digest",
  "summary": "Résumé exécutif en 2-3 phrases",
  "content": "HTML structuré avec sections thématiques (réglementation, marché, innovation, etc.)"
}`;

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (openaiResponse.ok) {
        const openaiData = await openaiResponse.json();
        const generatedText = openaiData.choices[0]?.message?.content || '{}';

        try {
          const parsed = JSON.parse(generatedText.replace(/```json\n?|\n?```/g, '').trim());
          digestTitle = parsed.title || `Digest ${type === 'daily' ? 'quotidien' : 'hebdomadaire'} taxi`;
          summary = parsed.summary || '';
          digestContent = parsed.content || '';
        } catch {
          digestTitle = `Digest ${type === 'daily' ? 'quotidien' : 'hebdomadaire'} taxi`;
          digestContent = generatedText;
        }
      }
    } else {
      digestTitle = `Digest ${type === 'daily' ? 'quotidien' : 'hebdomadaire'} - ${new Date().toLocaleDateString('fr-FR')}`;
      summary = `Synthèse de ${articles.length} actualités du secteur taxi et assurance.`;

      digestContent = '<div class="news-digest">';
      digestContent += '<h2>📰 Actualités principales</h2>';

      articles.slice(0, 5).forEach((article, i) => {
        digestContent += `
          <div class="digest-item">
            <h3>${i + 1}. ${article.title}</h3>
            <p><strong>Source:</strong> ${article.source} | <strong>Score:</strong> ${article.score}/100</p>
            <p>${article.excerpt || article.content.substring(0, 300)}</p>
            <p><a href="${article.source_url}" target="_blank">Lire l'article complet →</a></p>
          </div>
        `;
      });

      digestContent += '</div>';
    }

    const { data: digest, error: digestError } = await supabase
      .from('news_digest')
      .insert({
        type,
        title: digestTitle,
        content: digestContent,
        summary,
        articles_count: articles.length,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      })
      .select()
      .single();

    if (digestError) throw digestError;

    return new Response(
      JSON.stringify({
        success: true,
        digest,
        message: `Digest ${type} créé avec ${articles.length} articles`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('News Digest Generator Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
