import React, { useState } from 'react';
import { MapPin, Plus, Loader, CheckCircle, XCircle, AlertCircle, Image, FileText, Newspaper, HelpCircle } from 'lucide-react';
import Card from '../components/Card';
import { supabase } from '../lib/supabase';

interface GenerationResult {
  success: boolean;
  message: string;
  city_id?: string;
  slug?: string;
  url?: string;
  error?: string;
  article_id?: string;
  faq_ids?: string[];
  news_id?: string;
  image_url?: string;
  generated?: {
    city_page: boolean;
    article: boolean;
    faqs: number;
    news: boolean;
    image: boolean;
  };
}

const CityPageGenerator: React.FC = () => {
  const [cityName, setCityName] = useState('');
  const [dept, setDept] = useState('');
  const [region, setRegion] = useState('');
  const [taxiCount, setTaxiCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const [generateArticle, setGenerateArticle] = useState(true);
  const [generateFaq, setGenerateFaq] = useState(true);
  const [generateNews, setGenerateNews] = useState(false);
  const [generateImage, setGenerateImage] = useState(true);

  const regions = [
    'Auvergne-Rhône-Alpes',
    'Bourgogne-Franche-Comté',
    'Bretagne',
    'Centre-Val de Loire',
    'Corse',
    'Grand Est',
    'Hauts-de-France',
    'Île-de-France',
    'Normandie',
    'Nouvelle-Aquitaine',
    'Occitanie',
    'Pays de la Loire',
    'Provence-Alpes-Côte d\'Azur',
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-city-complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            city_name: cityName,
            dept,
            region,
            taxi_count: taxiCount ? parseInt(taxiCount) : 500,
            generate_article: generateArticle,
            generate_faq: generateFaq,
            generate_news: generateNews,
            generate_image: generateImage,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          city_id: data.city_id,
          slug: data.slug,
          url: data.url,
        });

        setCityName('');
        setDept('');
        setRegion('');
        setTaxiCount('');
        setGenerateArticle(true);
        setGenerateFaq(true);
        setGenerateNews(false);
        setGenerateImage(true);
      } else {
        setResult({
          success: false,
          message: 'Erreur lors de la génération',
          error: data.error || 'Erreur inconnue',
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      setResult({
        success: false,
        message: 'Erreur réseau',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
          <MapPin size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Générateur de Pages Ville
          </h1>
          <p className="text-gray-600">
            Créez automatiquement des pages SEO pour chaque ville avec l'IA
          </p>
        </div>
      </div>

      {result && (
        <Card
          className={`mb-6 ${
            result.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start space-x-3">
            {result.success ? (
              <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-1" />
            ) : (
              <XCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h3
                className={`font-semibold mb-2 ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {result.message}
              </h3>
              {result.success && result.url && (
                <div className="space-y-3">
                  <p className="text-sm text-green-800">
                    <strong>ID Page:</strong> {result.city_id}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>Slug:</strong> {result.slug}
                  </p>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 underline font-semibold"
                  >
                    Voir la page ville →
                  </a>
                  {result.generated && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                      <p className="font-semibold text-green-900 mb-2">Contenu généré :</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <MapPin size={14} className={result.generated.city_page ? 'text-green-600' : 'text-gray-400'} />
                          <span>Page ville</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText size={14} className={result.generated.article ? 'text-green-600' : 'text-gray-400'} />
                          <span>Article blog</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <HelpCircle size={14} className={result.generated.faqs > 0 ? 'text-green-600' : 'text-gray-400'} />
                          <span>{result.generated.faqs} FAQ</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Newspaper size={14} className={result.generated.news ? 'text-green-600' : 'text-gray-400'} />
                          <span>Actualité</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Image size={14} className={result.generated.image ? 'text-green-600' : 'text-gray-400'} />
                          <span>Image Pexels</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!result.success && result.error && (
                <p className="text-sm text-red-800">{result.error}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de la ville *
            </label>
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              required
              placeholder="Ex: Toulouse"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Département *
              </label>
              <input
                type="text"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                required
                placeholder="Ex: 31"
                maxLength={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de taxis (estimé)
              </label>
              <input
                type="number"
                value={taxiCount}
                onChange={(e) => setTaxiCount(e.target.value)}
                placeholder="Ex: 500"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Région *
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner une région</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Options de génération
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateArticle}
                  onChange={(e) => setGenerateArticle(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <FileText size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Générer article de blog (800 mots)</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateFaq}
                  onChange={(e) => setGenerateFaq(e.target.checked)}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <div className="flex items-center space-x-2">
                  <HelpCircle size={18} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Générer 3 FAQ localisées</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateNews}
                  onChange={(e) => setGenerateNews(e.target.checked)}
                  className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <div className="flex items-center space-x-2">
                  <Newspaper size={18} className="text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Générer actualité (400 mots)</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateImage}
                  onChange={(e) => setGenerateImage(e.target.checked)}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div className="flex items-center space-x-2">
                  <Image size={18} className="text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Chercher image Pexels</span>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Génération automatique complète</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Page ville + Article blog + 3 FAQ + Image en 1 clic</li>
                  <li>Contenu unique généré par IA (GPT-4)</li>
                  <li>Publication automatique et instantanée</li>
                  <li>Fallback template si OpenAI indisponible</li>
                  <li>Temps estimé : 10-15 secondes</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader size={20} className="animate-spin" />
                <span>Génération en cours...</span>
              </>
            ) : (
              <>
                <Plus size={20} />
                <span>Générer la page ville</span>
              </>
            )}
          </button>
        </form>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          💡 Conseils de génération
        </h2>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start space-x-2">
            <span className="text-purple-600 font-bold">•</span>
            <p>
              <strong>Nom de ville :</strong> Utilisez le nom officiel (ex: "Saint-Étienne" et non "St Etienne")
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-purple-600 font-bold">•</span>
            <p>
              <strong>Département :</strong> Format à 2 ou 3 chiffres (ex: "06", "974")
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-purple-600 font-bold">•</span>
            <p>
              <strong>Nombre de taxis :</strong> Estimez entre 50 (petite ville) et 20000 (Paris)
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-purple-600 font-bold">•</span>
            <p>
              <strong>Doublons :</strong> Le système refuse automatiquement les villes déjà existantes
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CityPageGenerator;
