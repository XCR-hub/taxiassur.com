import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, Download, Home, Save, FileText, MapPin, HelpCircle, Image as ImageIcon, Tag, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseAdmin } from '../lib/supabase';

interface UnifiedContent {
  // Article de blog
  blogPost: {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    metaDescription: string;
    keywords: string[];
    readingTime: number;
    featuredImage?: string;
    imageAlt?: string;
  };

  // Page ville
  cityPage: {
    city: string;
    title: string;
    slug: string;
    content: string;
    metaDescription: string;
    keywords: string[];
  };

  // FAQ (5-10 questions)
  faq: Array<{
    question: string;
    answer: string;
    category: string;
  }>;

  // Actualité
  newsArticle: {
    title: string;
    content: string;
    category: string;
    featured: boolean;
  };

  // Métadonnées
  metadata: {
    totalWords: number;
    seoScore: number;
    generatedAt: string;
  };
}

export default function AIContentGeneratorUnified() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<UnifiedContent | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!keyword.trim()) {
      setError('Le mot-clé principal est obligatoire');
      return;
    }

    if (!city.trim()) {
      setError('La ville est obligatoire pour générer du contenu complet');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedContent(null);

    try {
      // Utiliser Edge Function Supabase au lieu de PHP
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-seo-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          keyword: keyword.trim(),
          city: city.trim(),
          secondaryKeywords: secondaryKeywords.split(',').map(k => k.trim()).filter(Boolean),
          imagePrompt: imagePrompt.trim() || undefined,
          type: 'unified', // Mode unifié : génère TOUT
          mode: 'unified'
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la génération');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la génération');
      }

      // Debug image Pexels
      console.log('🖼️ DEBUG IMAGE PEXELS:', {
        hasImage: !!data.content?.blogPost?.featuredImage,
        imageUrl: data.content?.blogPost?.featuredImage?.substring(0, 80) + '...',
        imageAlt: data.content?.blogPost?.imageAlt,
        fullContent: data.content?.blogPost
      });

      setGeneratedContent(data.content);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du contenu');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedContent) return;

    const fullContent = `# ARTICLE DE BLOG
${generatedContent.blogPost?.title ?? 'N/A'}

Slug: ${generatedContent.blogPost?.slug ?? 'N/A'}
Meta: ${generatedContent.blogPost?.metaDescription ?? 'N/A'}

${generatedContent.blogPost?.content ?? 'N/A'}

---

# PAGE VILLE
${generatedContent.cityPage?.title ?? 'N/A'}

Slug: ${generatedContent.cityPage?.slug ?? 'N/A'}

${generatedContent.cityPage?.content ?? 'N/A'}

---

# FAQ (${generatedContent.faq?.length ?? 0} questions)

${(generatedContent.faq || []).map(f => `**${f?.question ?? 'Q'}**\n${f?.answer ?? 'R'}`).join('\n\n')}
`;

    try {
      await navigator.clipboard.writeText(fullContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const publishAll = async () => {
    if (!generatedContent) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const adminClient = getSupabaseAdmin();

      // 1. PUBLIER L'ARTICLE DE BLOG
      const blogSlug = `${generatedContent.blogPost?.slug ?? 'article'}-${Date.now()}`;

      const { data: blogData, error: blogError } = await adminClient
        .from('blog_posts')
        .insert({
          slug: blogSlug,
          title: generatedContent.blogPost?.title ?? 'Titre',
          excerpt: generatedContent.blogPost?.excerpt ?? '',
          content: generatedContent.blogPost?.content ?? '',
          meta_title: generatedContent.blogPost?.title ?? 'Titre',
          meta_description: generatedContent.blogPost?.metaDescription ?? '',
          keywords: generatedContent.blogPost?.keywords ?? [],
          published: true,
          read_time: generatedContent.blogPost?.readingTime ?? 5,
          author: 'TaxiAssur',
          featured_image: generatedContent.blogPost?.featuredImage || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (blogError) {
        console.error('Blog post error:', blogError);
        throw new Error(`Erreur article: ${blogError.message}`);
      }

      // 2. PUBLIER LA PAGE VILLE
      const { data: cityData, error: cityError } = await adminClient
        .from('city_pages')
        .insert({
          city: generatedContent.cityPage?.city ?? 'Paris',
          title: generatedContent.cityPage?.title ?? 'Titre',
          slug: generatedContent.cityPage?.slug ?? 'slug',
          content: generatedContent.cityPage?.content ?? '',
          meta_description: generatedContent.cityPage?.metaDescription ?? '',
          keywords: generatedContent.cityPage?.keywords ?? [],
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (cityError) {
        console.error('City page error:', cityError);
        // Ne pas bloquer si la ville existe déjà
        if (!cityError.message.includes('duplicate key')) {
          throw new Error(`Erreur page ville: ${cityError.message}`);
        }
      }

      // 3. PUBLIER TOUTES LES FAQ
      let faqCount = 0;
      if (generatedContent.faq && generatedContent.faq.length > 0) {
        const faqEntries = (generatedContent.faq || []).map((faq, index) => ({
          question: faq?.question ?? 'Question',
          answer: faq?.answer ?? 'Réponse',
          category: faq?.category ?? 'Général',
          order_index: index
        }));

        const { data: faqData, error: faqError } = await adminClient
          .from('faq_entries')
          .insert(faqEntries)
          .select();

        if (faqError) {
          console.error('❌ FAQ insert error:', faqError);
          throw new Error(`Erreur FAQ: ${faqError.message}`);
        } else {
          faqCount = faqData?.length || 0;
          console.log(`✅ ${faqCount} FAQ publiées avec succès`);
        }
      }

      // 4. PUBLIER L'ACTUALITÉ
      if (generatedContent.newsArticle) {
        const { data: newsData, error: newsError } = await adminClient
          .from('news_articles')
          .insert({
            title: generatedContent.newsArticle.title,
            slug: generatedContent.newsArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            content: generatedContent.newsArticle.content,
            excerpt: generatedContent.newsArticle.content.replace(/<[^>]*>/g, '').substring(0, 150),
            image_url: generatedContent.newsArticle.imageUrl || null,
            category: generatedContent.newsArticle.category || 'Réglementation',
            tags: [keyword, city].filter(Boolean),
            status: 'published',
            published_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (newsError) {
          console.warn('News insert warning:', newsError);
          // Ne pas bloquer si l'actualité échoue
        } else {
          console.log('✅ Actualité publiée:', newsData);
        }
      }

      setSuccess(
        `✅ Publication réussie !

📝 Article de blog publié
🏙️ Page ville créée/mise à jour
❓ ${faqCount} FAQ ajoutées
📰 Actualité publiée

Total: ${generatedContent.metadata?.totalWords ?? 0} mots générés`
      );

      // Reset après 3 secondes
      setTimeout(() => {
        setGeneratedContent(null);
        setKeyword('');
        setCity('');
        setSecondaryKeywords('');
        setImagePrompt('');
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Publication error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la publication');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-blue-600 to-yellow-600 rounded-xl p-6 mb-6 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Sparkles size={32} className="animate-pulse" />
            <h2 className="text-2xl font-bold">Générateur de Contenu SEO Complet</h2>
          </div>
          <button
            onClick={() => navigate('/backoffice')}
            className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <Home size={20} />
            <span>Retour</span>
          </button>
        </div>
        <p className="text-orange-100 mb-3">
          🚀 Génère automatiquement : Article Blog + Page Ville + FAQ + Actualité + Image SEO
        </p>
        <div className="flex items-center space-x-4 text-sm flex-wrap gap-2">
          <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-lg">
            <FileText size={16} />
            <span>Article 1800-2200 mots</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-lg">
            <MapPin size={16} />
            <span>Page Ville 1200-1500 mots</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-lg">
            <HelpCircle size={16} />
            <span>5-10 FAQ</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-lg">
            <Tag size={16} />
            <span>Actualité 400-600 mots</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-lg">
            <ImageIcon size={16} />
            <span>Image optimisée</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Configuration Unifiée</h3>

          <div className="space-y-4">
            {/* Mot-clé principal */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mot-clé Principal *
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ex: assurance taxi pas cher"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              <p className="text-xs text-gray-600 mt-1">
                Sera utilisé pour l'article, la page ville et les FAQ
              </p>
            </div>

            {/* Ville */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ville *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Paris, Lyon, Marseille"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              <p className="text-xs text-gray-600 mt-1">
                Créera automatiquement la page ville + FAQ localisées
              </p>
            </div>

            {/* Mots-clés secondaires */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mots-clés Secondaires (optionnel)
              </label>
              <input
                type="text"
                value={secondaryKeywords}
                onChange={(e) => setSecondaryKeywords(e.target.value)}
                placeholder="Séparés par des virgules"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              <p className="text-xs text-gray-600 mt-1">
                Ex: RC professionnelle, devis gratuit, courtier ORIAS
              </p>
            </div>

            {/* Prompt image */}
            <div className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <div className="flex items-center space-x-2 mb-3">
                <ImageIcon className="text-yellow-600" size={20} />
                <label className="text-sm font-semibold text-gray-700">
                  Prompt pour l'image SEO (optionnel)
                </label>
              </div>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Ex: Photo professionnelle d'un taxi moderne à Paris, éclairage doré, haute qualité, style réaliste"
                rows={3}
                className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 resize-none"
              />
              <p className="text-xs text-yellow-700 mt-2">
                💡 Si vide, un prompt SEO sera généré automatiquement avec : ville + mot-clé + style professionnel
              </p>
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* Succès */}
            {success && (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-3">
                <pre className="text-sm text-green-600 font-medium whitespace-pre-wrap">{success}</pre>
              </div>
            )}

            {/* Bouton Générer */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !keyword.trim() || !city.trim()}
              className="w-full bg-gradient-to-r from-orange-600 via-blue-600 to-yellow-600 text-white px-6 py-4 rounded-lg font-bold hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 text-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Génération complète en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span>🚀 Générer TOUT le Contenu</span>
                </>
              )}
            </button>

            {isGenerating && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  ⏳ <strong>Génération en cours...</strong> Cela peut prendre 30-60 secondes.
                  <br />
                  📝 Création article blog (1800-2200 mots)
                  <br />
                  🏙️ Création page ville (1200-1500 mots)
                  <br />
                  ❓ Création 5-10 FAQ optimisées
                  <br />
                  🖼️ Génération image SEO avec alt-text
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Prévisualisation */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Aperçu du Contenu</h3>
            {generatedContent && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={publishAll}
                  disabled={isSaving}
                  className="flex items-center space-x-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Publier TOUT</span>
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  <span>{copied ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
            )}
          </div>

          {!generatedContent && !isGenerating && (
            <div className="h-[600px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <Sparkles className="mx-auto text-slate-400 mb-3" size={48} />
                <p className="text-gray-600 font-medium">Le contenu complet apparaîtra ici</p>
                <p className="text-sm text-slate-500 mt-2">
                  Article + Page Ville + FAQ + Image
                </p>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="animate-spin mx-auto text-orange-600 mb-3" size={48} />
                <p className="text-gray-600 font-bold text-lg">Génération complète en cours...</p>
                <p className="text-sm text-slate-500 mt-2">30-60 secondes estimées</p>
              </div>
            </div>
          )}

          {generatedContent && (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {/* Métadonnées */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-50 rounded-lg p-4 border-2 border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-800 flex items-center space-x-2">
                    <Sparkles className="text-orange-600" size={20} />
                    <span>Métadonnées Globales</span>
                  </h4>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                    SEO {generatedContent.metadata?.seoScore ?? 85}/100
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="text-orange-600" size={16} />
                    <span className="text-gray-700">
                      <strong>{generatedContent.metadata?.totalWords ?? 0}</strong> mots totaux
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="text-orange-600" size={16} />
                    <span className="text-gray-700">
                      <strong>{generatedContent.blogPost?.readingTime ?? 5}</strong> min lecture
                    </span>
                  </div>
                </div>
              </div>

              {/* Article de blog */}
              <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
                <h4 className="font-bold text-lg text-gray-800 mb-2 flex items-center space-x-2">
                  <FileText className="text-orange-600" size={20} />
                  <span>Article de Blog</span>
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Titre:</strong> {generatedContent.blogPost?.title ?? 'Non généré'}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Slug:</strong> {generatedContent.blogPost?.slug ?? 'non-genere'}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Meta:</strong> {generatedContent.blogPost?.metaDescription ?? 'Non généré'}
                </p>
                {generatedContent.blogPost?.keywords && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(generatedContent.blogPost.keywords || []).map((kw, index) => (
                      <span key={index} className="px-2 py-1 bg-orange-200 text-orange-800 rounded-full text-xs font-medium">
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Image générée */}
              {generatedContent.blogPost?.featuredImage && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg p-4 border-2 border-orange-200">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center space-x-2">
                    <ImageIcon size={20} className="text-orange-600" />
                    <span>Image SEO Générée</span>
                  </h4>
                  <img
                    src={generatedContent.blogPost.featuredImage}
                    alt={generatedContent.blogPost?.imageAlt || generatedContent.blogPost?.title || 'Image'}
                    className="w-full h-auto rounded-lg shadow-lg border-2 border-orange-300"
                  />
                  {generatedContent.blogPost?.imageAlt && (
                    <p className="text-xs text-gray-700 mt-2 bg-white px-3 py-2 rounded">
                      <strong>Alt SEO:</strong> {generatedContent.blogPost?.imageAlt}
                    </p>
                  )}
                </div>
              )}

              {/* Page ville */}
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <h4 className="font-bold text-lg text-gray-800 mb-2 flex items-center space-x-2">
                  <MapPin className="text-green-600" size={20} />
                  <span>Page Ville: {generatedContent.cityPage?.city ?? 'N/A'}</span>
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Titre:</strong> {generatedContent.cityPage?.title ?? 'Non généré'}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Slug:</strong> {generatedContent.cityPage?.slug ?? 'non-genere'}
                </p>
              </div>

              {/* FAQ */}
              <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center space-x-2">
                  <HelpCircle className="text-yellow-600" size={20} />
                  <span>FAQ Générées ({generatedContent.faq?.length ?? 0})</span>
                </h4>
                <div className="space-y-2">
                  {(generatedContent.faq || []).slice(0, 3).map((faq, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-yellow-300">
                      <p className="font-medium text-gray-800 text-sm">{faq?.question ?? 'Question'}</p>
                      <p className="text-xs text-gray-600 mt-1">{(faq?.answer || '').substring(0, 100)}...</p>
                      <span className="text-xs text-yellow-700 font-medium">
                        Catégorie: {faq?.category ?? 'Général'}
                      </span>
                    </div>
                  ))}
                  {(generatedContent.faq?.length ?? 0) > 3 && (
                    <p className="text-sm text-gray-600 italic text-center">
                      + {(generatedContent.faq?.length ?? 0) - 3} autres FAQ...
                    </p>
                  )}
                </div>
              </div>

              {/* Actualité */}
              {generatedContent.newsArticle && (
                <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
                  <h4 className="font-bold text-lg text-gray-800 mb-2 flex items-center space-x-2">
                    <Tag className="text-orange-600" size={20} />
                    <span>Actualité</span>
                  </h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Titre:</strong> {generatedContent.newsArticle.title}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Catégorie:</strong> {generatedContent.newsArticle.category}
                  </p>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-3">
                    {generatedContent.newsArticle.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                  </p>
                </div>
              )}

              {/* Contenu complet (replié) */}
              <details className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <summary className="font-bold text-gray-800 cursor-pointer hover:text-orange-600">
                  📄 Voir le contenu complet (cliquer pour déplier)
                </summary>
                <div className="mt-4 prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: generatedContent.blogPost?.content ?? '<p>Contenu non disponible</p>' }} />
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Conseils */}
      <div className="mt-6 bg-gradient-to-r from-green-50 to-orange-50 rounded-xl p-6 border-2 border-green-200">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center space-x-2">
          <Sparkles className="text-green-600" size={20} />
          <span>💡 Mode Unifié - Génération Automatique Complète</span>
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ <strong>1 seul clic</strong> : Génère article + page ville + FAQ + image automatiquement</li>
          <li>✅ <strong>SEO optimisé</strong> : Alt-text, meta-descriptions, keywords automatiques</li>
          <li>✅ <strong>Publication unique</strong> : Tout est publié en une seule fois dans les bonnes tables</li>
          <li>✅ <strong>Gain de temps</strong> : 30-60 secondes au lieu de 5+ minutes manuellement</li>
          <li>✅ <strong>Cohérence</strong> : L'article, la ville et les FAQ sont 100% cohérents</li>
        </ul>
      </div>
    </div>
  );
}
