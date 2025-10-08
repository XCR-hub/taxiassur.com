import { useState } from 'react';
import { Sparkles, Loader2, FileText, MapPin, GitCompare, Copy, Check, Download } from 'lucide-react';

interface GeneratedContent {
  title: string;
  slug: string;
  metaDescription: string;
  content: string;
  excerpt?: string;
  faq?: Array<{ question: string; answer: string }>;
  keywords?: string[];
  readingTime?: number;
  category?: string;
}

export default function AIContentGenerator() {
  const [contentType, setContentType] = useState<'blog' | 'city' | 'comparison'>('blog');
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<{ tokens: number; cost: number } | null>(null);

  const handleGenerate = async () => {
    if (!keyword.trim()) {
      setError('Le mot-clé principal est obligatoire');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedContent(null);

    try {
      // Try window.ENV first (production), then import.meta.env (development)
      const supabaseUrl = (typeof window !== 'undefined' && (window as any).ENV?.VITE_SUPABASE_URL)
        || import.meta.env.VITE_SUPABASE_URL
        || 'https://drohhxrkoequjphvabvq.supabase.co';

      const supabaseKey = (typeof window !== 'undefined' && (window as any).ENV?.VITE_SUPABASE_ANON_KEY)
        || import.meta.env.VITE_SUPABASE_ANON_KEY
        || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-seo-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: keyword.trim(),
          type: contentType,
          city: city.trim() || undefined,
          secondaryKeywords: secondaryKeywords.split(',').map(k => k.trim()).filter(Boolean)
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          // La réponse n'est pas du JSON (probablement HTML d'erreur)
          throw new Error('La fonction Edge n\'est pas déployée ou ne répond pas correctement. Vérifiez que la fonction "generate-seo-content" est bien déployée dans Supabase.');
        }
        throw new Error(errorData.error || 'Erreur lors de la génération');
      }

      const data = await response.json();
      setGeneratedContent(data.content);
      setUsage(data.usage);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du contenu');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedContent) return;

    const fullContent = `# ${generatedContent.title}

**Slug:** ${generatedContent.slug}
**Meta Description:** ${generatedContent.metaDescription}

---

${generatedContent.content}

---

## FAQ

${generatedContent.faq?.map(f => `**${f.question}**\n${f.answer}`).join('\n\n')}
`;

    try {
      await navigator.clipboard.writeText(fullContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const downloadAsHTML = () => {
    if (!generatedContent) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${generatedContent.metaDescription}">
  <title>${generatedContent.title}</title>
</head>
<body>
  <article>
    <h1>${generatedContent.title}</h1>
    ${generatedContent.content}

    ${generatedContent.faq ? `
    <section>
      <h2>Questions Fréquentes</h2>
      ${generatedContent.faq.map(f => `
        <div>
          <h3>${f.question}</h3>
          <p>${f.answer}</p>
        </div>
      `).join('')}
    </section>
    ` : ''}
  </article>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedContent.slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const contentTypeOptions = [
    { value: 'blog', label: 'Article de Blog', icon: FileText, description: '1800-2200 mots, optimisé SEO' },
    { value: 'city', label: 'Page Ville', icon: MapPin, description: '1200-1500 mots, géolocalisé' },
    { value: 'comparison', label: 'Comparatif', icon: GitCompare, description: '1000-1500 mots, tableau inclus' }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <Sparkles size={32} className="animate-pulse" />
          <h2 className="text-2xl font-bold">Générateur de Contenu SEO IA</h2>
        </div>
        <p className="text-purple-100">
          Créez des articles optimisés pour Google en 30 secondes avec ChatGPT-4
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Configuration</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de Contenu
              </label>
              <div className="grid grid-cols-1 gap-3">
                {contentTypeOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setContentType(option.value as any)}
                      className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all ${
                        contentType === option.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <Icon className={contentType === option.value ? 'text-purple-600' : 'text-gray-600'} size={24} />
                      <div className="text-left">
                        <p className="font-medium text-gray-800">{option.label}</p>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot-clé Principal *
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ex: assurance taxi pas cher"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>

            {contentType === 'city' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Paris, Lyon, Marseille"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mots-clés Secondaires (optionnel)
              </label>
              <input
                type="text"
                value={secondaryKeywords}
                onChange={(e) => setSecondaryKeywords(e.target.value)}
                placeholder="Séparés par des virgules"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              <p className="text-xs text-gray-600 mt-1">
                Ex: RC professionnelle, devis gratuit, courtier ORIAS
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !keyword.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-lg font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Génération en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>Générer le Contenu</span>
                </>
              )}
            </button>

            {usage && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Coût:</strong> {usage.cost.toFixed(4)}€ ({usage.tokens.toLocaleString()} tokens)
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Aperçu du Contenu</h3>
            {generatedContent && (
              <div className="flex space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>
                <button
                  onClick={downloadAsHTML}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors text-sm"
                >
                  <Download size={16} />
                  <span>HTML</span>
                </button>
              </div>
            )}
          </div>

          {!generatedContent && !isGenerating && (
            <div className="h-96 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <Sparkles className="mx-auto text-gray-600 mb-3" size={48} />
                <p className="text-gray-600">
                  Le contenu généré apparaîtra ici
                </p>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="animate-spin mx-auto text-purple-600 mb-3" size={48} />
                <p className="text-gray-600 font-medium">Génération en cours...</p>
                <p className="text-sm text-gray-600 mt-2">Cela peut prendre 20-30 secondes</p>
              </div>
            </div>
          )}

          {generatedContent && (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-bold text-lg text-gray-800 mb-2">{generatedContent.title}</h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Slug:</strong> {generatedContent.slug}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Meta:</strong> {generatedContent.metaDescription}
                </p>
              </div>

              <div className="prose prose-sm max-w-none bg-white text-gray-900 rounded-lg p-4">
                <div className="[&>*]:text-gray-900 [&>h1]:text-gray-900 [&>h2]:text-gray-900 [&>h3]:text-gray-900 [&>p]:text-gray-900 [&>ul]:text-gray-900 [&>li]:text-gray-900" dangerouslySetInnerHTML={{ __html: generatedContent.content }} />
              </div>

              {generatedContent.faq && generatedContent.faq.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-3">FAQ Générée</h4>
                  <div className="space-y-3">
                    {generatedContent.faq.map((faq, index) => (
                      <div key={index} className="bg-white rounded-lg p-3">
                        <p className="font-medium text-gray-800">{faq.question}</p>
                        <p className="text-sm text-gray-600 mt-1">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedContent.keywords && (
                <div className="flex flex-wrap gap-2">
                  {generatedContent.keywords.map((kw, index) => (
                    <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3">💡 Conseils d'Utilisation</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ <strong>Mots-clés longue traîne</strong> : Plus spécifiques = meilleur positionnement</li>
          <li>✅ <strong>Relecture requise</strong> : Vérifiez et ajustez le contenu généré</li>
          <li>✅ <strong>Publication régulière</strong> : 3-5 articles/semaine = trafic × 10 en 6 mois</li>
          <li>✅ <strong>Optimisation images</strong> : Ajoutez des visuels avec alt-text</li>
          <li>✅ <strong>Indexation Google</strong> : Soumettez le sitemap après publication</li>
        </ul>
      </div>
    </div>
  );
}
