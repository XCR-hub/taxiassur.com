import { useState } from 'react';
import { Sparkles, Loader2, FileText, MapPin, GitCompare, Copy, Check, Download, Home, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseUrl } from '../lib/env';
import { supabase } from '../lib/supabase';

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
  const navigate = useNavigate();
  const [contentType, setContentType] = useState<'blog' | 'city' | 'comparison'>('blog');
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<{ tokens: number; cost: number } | null>(null);

  const checkAPIConfiguration = () => {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openaiKey) {
      setError('⚠️ OPENAI_API_KEY non configurée. Ajoutez-la dans les secrets Supabase Edge Functions.');
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!keyword.trim()) {
      setError('Le mot-clé principal est obligatoire');
      return;
    }

    // Vérifier si l'API est configurée
    if (!checkAPIConfiguration()) {
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedContent(null);

    try {
      // Récupérer le token de session de l'utilisateur authentifié
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Vous devez être connecté pour utiliser le générateur IA');
      }

      const supabaseUrl = getSupabaseUrl();

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-seo-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
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

  const publishContent = async (status: 'draft' | 'published') => {
    if (!generatedContent) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // Publish based on content type
      if (contentType === 'blog') {
        // Publish as blog post
        const { data, error: publishError } = await supabase
          .from('blog_posts')
          .insert({
            title: generatedContent.title,
            slug: generatedContent.slug,
            excerpt: generatedContent.excerpt || generatedContent.metaDescription,
            content: generatedContent.content,
            meta_description: generatedContent.metaDescription,
            tags: generatedContent.keywords || [],
            reading_time: generatedContent.readingTime || 5,
            status: status,
            published_at: status === 'published' ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (publishError) throw publishError;

        // If FAQ exists, publish each FAQ entry
        if (generatedContent.faq && generatedContent.faq.length > 0) {
          const faqEntries = generatedContent.faq.map(faq => ({
            question: faq.question,
            answer: faq.answer,
            tags: generatedContent.keywords || [],
            category: generatedContent.category || 'Général',
            status: status,
          }));

          const { error: faqError } = await supabase
            .from('faq_entries')
            .insert(faqEntries);

          if (faqError) {
            console.error('FAQ publication error:', faqError);
          }
        }
      } else if (contentType === 'city') {
        // Publish as city page
        const { data, error: cityError } = await supabase
          .from('city_pages')
          .insert({
            city: city.trim(),
            title: generatedContent.title,
            slug: generatedContent.slug,
            content: generatedContent.content,
            meta_description: generatedContent.metaDescription,
            keywords: generatedContent.keywords || [],
            status: status,
            published_at: status === 'published' ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (cityError) throw cityError;

        // If FAQ exists for city page, publish them too
        if (generatedContent.faq && generatedContent.faq.length > 0) {
          const faqEntries = generatedContent.faq.map(faq => ({
            question: faq.question,
            answer: faq.answer,
            tags: generatedContent.keywords || [],
            category: `Ville - ${city.trim()}`,
            status: status,
          }));

          const { error: faqError } = await supabase
            .from('faq_entries')
            .insert(faqEntries);

          if (faqError) {
            console.error('FAQ publication error:', faqError);
          }
        }
      } else if (contentType === 'comparison') {
        // Publish comparison as blog post with special category
        const { data, error: compError } = await supabase
          .from('blog_posts')
          .insert({
            title: generatedContent.title,
            slug: generatedContent.slug,
            excerpt: generatedContent.excerpt || generatedContent.metaDescription,
            content: generatedContent.content,
            meta_description: generatedContent.metaDescription,
            tags: [...(generatedContent.keywords || []), 'comparaison'],
            reading_time: generatedContent.readingTime || 7,
            status: status,
            published_at: status === 'published' ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (compError) throw compError;
      }

      setSuccess(
        status === 'published'
          ? '✅ Contenu publié avec succès !'
          : '✅ Contenu sauvegardé comme brouillon !'
      );

      // Reset form after 2 seconds
      setTimeout(() => {
        setGeneratedContent(null);
        setKeyword('');
        setSecondaryKeywords('');
        setCity('');
        setSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Publication error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la publication');
    } finally {
      setIsSaving(false);
    }
  };

  const contentTypeOptions = [
    { value: 'blog', label: 'Article de Blog', icon: FileText, description: '1800-2200 mots, optimisé SEO' },
    { value: 'city', label: 'Page Ville', icon: MapPin, description: '1200-1500 mots, géolocalisé' },
    { value: 'comparison', label: 'Comparatif', icon: GitCompare, description: '1000-1500 mots, tableau inclus' }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Sparkles size={32} className="animate-pulse" />
            <h2 className="text-2xl font-bold">Générateur de Contenu SEO IA</h2>
          </div>
          <button
            onClick={() => navigate('/backoffice')}
            className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <Home size={20} />
            <span>Retour</span>
          </button>
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

            {!import.meta.env.VITE_OPENAI_API_KEY && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900 mb-2">⚠️ Configuration requise</p>
                <p className="text-xs text-amber-800 mb-2">
                  La clé OpenAI API n'est pas configurée. Pour utiliser cette fonctionnalité :
                </p>
                <ol className="text-xs text-amber-800 space-y-1 ml-4 list-decimal">
                  <li>Allez dans Supabase Dashboard → Settings → Edge Functions</li>
                  <li>Ajoutez le secret : <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY</code></li>
                  <li>Valeur : Votre clé OpenAI (commence par sk-proj-...)</li>
                </ol>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600">{success}</p>
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
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => publishContent('published')}
                  disabled={isSaving}
                  className="flex items-center space-x-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Publier</span>
                </button>
                <button
                  onClick={() => publishContent('draft')}
                  disabled={isSaving}
                  className="flex items-center space-x-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Brouillon</span>
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  <span>{copied ? 'Copié' : 'Copier'}</span>
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
