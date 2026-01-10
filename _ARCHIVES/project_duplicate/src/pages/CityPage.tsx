import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import JsonLd from '../components/JsonLd';
import LeadForm from '../components/LeadForm';
import AITaxiBackground from '../components/AITaxiBackground';
import { generateCityPages } from '../lib/ping';
import { MapPin, Phone, CheckCircle, Users, Award, TrendingDown, Shield, Clock, Star, Target, Zap, Crown, Gift } from 'lucide-react';
import Card from '../components/Card';
import StickyCTA from '../components/StickyCTA';
import { supabase } from '../lib/supabase';

interface CityPageData {
  id: string;
  city_name: string;
  title: string;
  slug: string;
  content: string;
  dept?: string;
  region?: string;
  population?: number;
  taxi_count?: number;
  meta_description?: string;
  keywords?: string[];
  status: string;
  published?: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  city?: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  published: boolean;
  created_at: string;
}

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  published: boolean;
  created_at: string;
}

const CityPage: React.FC = () => {
  const { city } = useParams<{ city: string }>();
  const [cityPageData, setCityPageData] = useState<CityPageData | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [useTemplate, setUseTemplate] = useState(false);

  useEffect(() => {
    const loadCityPage = async () => {
      if (!city) {
        setLoading(false);
        return;
      }

      try {
        // Charger la page ville
        const { data, error } = await supabase
          .from('city_pages')
          .select('*')
          .eq('slug', city)
          .or('status.eq.published,published.eq.true')
          .maybeSingle();

        if (error) {
          console.warn('Supabase city page fetch failed:', error);
          setUseTemplate(true);
        } else if (data) {
          setCityPageData(data);

          // Charger les FAQ (de la ville ou générales)
          const { data: faqData } = await supabase
            .from('faq')
            .select('*')
            .or(`city.eq.${data.city_name},city.is.null`)
            .limit(5);
          if (faqData) setFaqs(faqData);

          // Charger les articles de blog récents
          const { data: blogData } = await supabase
            .from('blog_posts')
            .select('id, title, slug, excerpt, published, created_at')
            .eq('published', true)
            .order('created_at', { ascending: false })
            .limit(3);
          if (blogData) setBlogPosts(blogData);

          // Charger les actualités récentes
          const { data: newsData } = await supabase
            .from('news_articles')
            .select('id, title, slug, excerpt, published, created_at')
            .eq('published', true)
            .order('created_at', { ascending: false })
            .limit(3);
          if (newsData) setNewsArticles(newsData);
        } else {
          setUseTemplate(true);
        }
      } catch (err) {
        console.warn('Error loading city page:', err);
        setUseTemplate(true);
      } finally {
        setLoading(false);
      }
    };

    loadCityPage();
  }, [city]);

  const cities = generateCityPages();
  const cityData = cities.find(c => c.slug === city);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!cityPageData && !cityData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        <main className="section-padding">
          <div className="container-max text-center">
            <h1 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
              Ville non trouvée
            </h1>
            <p className="text-gray-300">
              La page que vous recherchez n'existe pas.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (cityPageData && !useTemplate) {
    const breadcrumbs = [
      { name: 'Accueil', url: '/' },
      { name: 'Villes', url: '/villes' },
      { name: cityPageData.title, url: `/ville/${cityPageData.slug}` }
    ];

    return (
      <>
        <Seo
          title={cityPageData.title}
          description={cityPageData.meta_description || `Assurance taxi ${cityPageData.city} - Devis gratuit et immédiat`}
          canonical={`/ville/${cityPageData.slug}`}
          keywords={(cityPageData.keywords || []).join(', ')}
        />
        <JsonLd type="breadcrumb" data={breadcrumbs} />

        <div className="min-h-screen bg-white">
          <Header />
          <AITaxiBackground />

          <main className="relative z-10">
            <div className="container-max section-padding">
              <nav className="mb-8">
                <ol className="flex items-center space-x-2 text-sm text-gray-600">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.url} className="flex items-center">
                      {index > 0 && <span className="mx-2">/</span>}
                      {index === breadcrumbs.length - 1 ? (
                        <span className="text-gray-900 font-semibold font-medium">{crumb.name}</span>
                      ) : (
                        <a href={crumb.url} className="hover:text-amber-600 transition-colors">
                          {crumb.name}
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>

              {/* En-tête avec H1 */}
              <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  {cityPageData.h1_title || cityPageData.title}
                </h1>
                {cityPageData.meta_description && (
                  <p className="text-xl text-gray-600 leading-relaxed">
                    {cityPageData.meta_description}
                  </p>
                )}
              </div>

              {/* Statistiques ville */}
              {cityPageData.population && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 border-2 border-yellow-200">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">
                        {cityPageData.population >= 1000000
                          ? `${(cityPageData.population / 1000000).toFixed(1)}M`
                          : `${Math.floor(cityPageData.population / 1000)}k`}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Habitants</div>
                    </div>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">
                        {Math.floor(cityPageData.population / 2000)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Taxis actifs</div>
                    </div>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-50 to-sky-100 border-2 border-blue-200">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">24/7</div>
                      <div className="text-sm text-gray-600 mt-1">Assistance</div>
                    </div>
                  </Card>
                  <Card className="bg-gradient-to-br from-pink-50 to-rose-100 border-2 border-pink-200">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">-35%</div>
                      <div className="text-sm text-gray-600 mt-1">Économies</div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Contenu structuré */}
              <article className="prose prose-lg max-w-none city-page-content">
                {(() => {
                  try {
                    const content = typeof cityPageData.content === 'string'
                      ? JSON.parse(cityPageData.content)
                      : cityPageData.content;

                    return (
                      <div className="space-y-8">
                        {/* Introduction avec accroche SEO */}
                        {content.intro && (
                          <Card className="bg-white border-2 border-gray-200 p-6">
                            <h2 className="text-3xl font-bold text-gray-900 mb-6">
                              Assurance Taxi {cityPageData.city_name || cityPageData.city} : Le Meilleur Choix pour les Professionnels
                            </h2>
                            <p className="text-xl text-gray-700 leading-relaxed mb-4 font-medium">
                              🏆 <span className="text-yellow-600 font-bold">N°1 de l'assurance taxi à {cityPageData.city_name || cityPageData.city}</span> - Plus de {Math.floor((cityPageData.population || 100000) / 2000)} taxis nous font confiance
                            </p>
                            <p className="text-lg text-gray-700 leading-relaxed mb-4">
                              {content.intro}
                            </p>
                            <div className="grid md:grid-cols-3 gap-4 mt-6">
                              <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                                <div className="text-2xl font-bold text-green-700">-35%</div>
                                <div className="text-sm text-gray-600">d'économies en moyenne</div>
                              </div>
                              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                                <div className="text-2xl font-bold text-blue-700">24/7</div>
                                <div className="text-sm text-gray-600">Assistance non-stop</div>
                              </div>
                              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
                                <div className="text-2xl font-bold text-yellow-700">2 min</div>
                                <div className="text-sm text-gray-600">Devis immédiat</div>
                              </div>
                            </div>
                          </Card>
                        )}

                        {/* Expertise locale renforcée */}
                        <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 border-2 border-yellow-300 p-8">
                          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                            <MapPin className="mr-3 text-yellow-600" size={32} />
                            Pourquoi TaxiAssur est LE choix N°1 à {cityPageData.city_name || cityPageData.city} ?
                          </h2>

                          <div className="space-y-6">
                            <p className="text-lg text-gray-700 leading-relaxed">
                              <span className="font-bold text-yellow-700">Expertise locale inégalée :</span> Notre équipe connaît parfaitement le marché taxi de {cityPageData.city_name || cityPageData.city},
                              ses zones d'affluence, ses contraintes réglementaires et ses opportunités.
                            </p>

                            {content.specificites && content.specificites.length > 0 && (
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">✅ Nos avantages spécifiques {cityPageData.city_name || cityPageData.city} :</h3>
                                <ul className="space-y-3">
                                  {content.specificites.map((spec: string, idx: number) => (
                                    <li key={idx} className="flex items-start text-gray-700">
                                      <CheckCircle className="mr-3 mt-1 text-green-600 flex-shrink-0" size={20} />
                                      <span className="text-lg"><span className="font-semibold">{spec}</span> - Couverture optimale et tarifs négociés</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="bg-white rounded-lg p-6 mt-6 border-l-4 border-yellow-600">
                              <p className="text-lg font-semibold text-gray-900 mb-2">
                                💡 Le saviez-vous ?
                              </p>
                              <p className="text-gray-700">
                                Les taxis de {cityPageData.city_name || cityPageData.city} qui choisissent TaxiAssur économisent en moyenne <span className="font-bold text-green-700">450€ par an</span>
                                tout en bénéficiant d'une couverture supérieure à leurs concurrents.
                              </p>
                            </div>
                          </div>
                        </Card>

                        {/* Tarifs ultra-compétitifs */}
                        {content.tarif_moyen && (
                          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 p-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                              <TrendingDown className="mr-3 text-green-600" size={32} />
                              Prix Assurance Taxi {cityPageData.city_name || cityPageData.city} : Les Tarifs les Plus Bas du Marché
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                <div className="bg-white rounded-lg p-6 border-2 border-green-500">
                                  <div className="text-sm text-gray-600 mb-2">Votre assurance taxi à partir de</div>
                                  <div className="flex items-baseline space-x-2">
                                    <span className="text-5xl font-bold text-green-700">{content.tarif_moyen.split('-')[0]}</span>
                                    <span className="text-xl text-gray-600">/an</span>
                                  </div>
                                  <div className="mt-4 space-y-2">
                                    <div className="flex items-center text-green-700">
                                      <Zap className="mr-2" size={18} />
                                      <span className="font-semibold">Garanties complètes incluses</span>
                                    </div>
                                    <div className="flex items-center text-green-700">
                                      <Gift className="mr-2" size={18} />
                                      <span className="font-semibold">1er mois offert</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <h3 className="text-xl font-bold text-gray-900">💰 Économies garanties :</h3>
                                <ul className="space-y-3">
                                  <li className="flex items-start">
                                    <CheckCircle className="mr-2 mt-1 text-green-600 flex-shrink-0" size={20} />
                                    <span className="text-gray-700"><span className="font-bold">-35% vs concurrents</span> sur {cityPageData.city_name || cityPageData.city}</span>
                                  </li>
                                  <li className="flex items-start">
                                    <CheckCircle className="mr-2 mt-1 text-green-600 flex-shrink-0" size={20} />
                                    <span className="text-gray-700"><span className="font-bold">Aucun frais caché</span> - Prix transparent</span>
                                  </li>
                                  <li className="flex items-start">
                                    <CheckCircle className="mr-2 mt-1 text-green-600 flex-shrink-0" size={20} />
                                    <span className="text-gray-700"><span className="font-bold">Paiement flexible</span> - Mensualités sans frais</span>
                                  </li>
                                  <li className="flex items-start">
                                    <CheckCircle className="mr-2 mt-1 text-green-600 flex-shrink-0" size={20} />
                                    <span className="text-gray-700"><span className="font-bold">Remises fidélité</span> - Jusqu'à 20% supplémentaires</span>
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                              <p className="text-sm font-semibold text-gray-900">
                                ⚡ OFFRE SPÉCIALE {cityPageData.city_name?.toUpperCase() || cityPageData.city.toUpperCase()} :
                                Souscrivez avant fin du mois et bénéficiez de <span className="text-yellow-700">2 mois offerts</span> au lieu d'1 !
                              </p>
                            </div>
                          </Card>
                        )}

                        {/* Garanties premium */}
                        <Card className="bg-gradient-to-br from-blue-50 to-sky-100 border-2 border-blue-300 p-8">
                          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                            <Shield className="mr-3 text-blue-600" size={32} />
                            Garanties Premium Assurance Taxi {cityPageData.city_name || cityPageData.city}
                          </h2>

                          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                            <span className="font-bold text-blue-700">Protection maximale</span> : Roulez l'esprit tranquille à {cityPageData.city_name || cityPageData.city} avec notre
                            couverture complète spécialement conçue pour les professionnels du taxi.
                          </p>

                          <div className="grid md:grid-cols-2 gap-4">
                            {[
                              { title: 'RC Professionnelle complète', desc: 'Tous dommages couverts, passagers inclus' },
                              { title: 'Protection juridique renforcée', desc: 'Défense pénale et recours illimité' },
                              { title: 'Assistance 24/7 partout en France', desc: 'Dépannage, remorquage, rapatriement' },
                              { title: 'Véhicule de remplacement sous 4h', desc: 'Continuez à travailler sans interruption' },
                              { title: 'Protection intégrale du matériel', desc: 'Terminal CB, compteur, équipements' },
                              { title: 'Couverture tous accidents', desc: 'Y compris catastrophes naturelles' },
                              { title: 'Garantie valeur à neuf 2 ans', desc: 'Indemnisation sans vétusté' },
                              { title: 'Protection conducteur étendue', desc: 'Jusqu\'à 200 000€ en cas d\'accident' }
                            ].map((garantie, idx) => (
                              <div key={idx} className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                                <div className="flex items-start">
                                  <CheckCircle className="mr-3 mt-1 text-green-600 flex-shrink-0" size={20} />
                                  <div>
                                    <div className="font-bold text-gray-900">{garantie.title}</div>
                                    <div className="text-sm text-gray-600 mt-1">{garantie.desc}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 bg-green-50 border-2 border-green-400 rounded-lg p-6">
                            <div className="flex items-start">
                              <Crown className="mr-3 text-yellow-600 flex-shrink-0" size={28} />
                              <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Exclusivité TaxiAssur {cityPageData.city_name || cityPageData.city}</h3>
                                <p className="text-gray-700">
                                  <span className="font-semibold">Option Protection Revenus :</span> En cas d'immobilisation prolongée,
                                  percevez jusqu'à <span className="font-bold text-green-700">70€/jour</span> de compensation pour maintenir votre activité.
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    );
                  } catch (e) {
                    // Fallback si JSON parse échoue
                    return (
                      <div
                        className="city-page-raw-content"
                        dangerouslySetInnerHTML={{ __html: cityPageData.content }}
                      />
                    );
                  }
                })()}
              </article>

              {/* CTA Devis optimisé avec fond blanc */}
              <div className="mt-12">
                <Card className="bg-white border-4 border-yellow-400 shadow-2xl">
                  <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white p-6 rounded-t-lg -m-6 mb-6">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
                      🚖 Devis Gratuit Assurance Taxi {cityPageData.city_name || cityPageData.city}
                    </h2>
                    <p className="text-center text-lg">
                      ⚡ Réponse en 2 minutes • 💰 Économisez jusqu'à 35% • ✅ Sans engagement
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-700">+{Math.floor((cityPageData.population || 100000) / 2000)}</div>
                      <div className="text-sm text-gray-600">Taxis assurés à {cityPageData.city_name || cityPageData.city}</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-3xl font-bold text-yellow-700">4.9/5</div>
                      <div className="text-sm text-gray-600">Satisfaction clients</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-700">24/7</div>
                      <div className="text-sm text-gray-600">Service disponible</div>
                    </div>
                  </div>

                  {/* Formulaire avec fond blanc garanti */}
                  <div className="bg-white p-6 rounded-lg">
                    <LeadForm />
                  </div>

                  <div className="mt-6 text-center text-sm text-gray-600">
                    <p>🔒 Vos données sont 100% sécurisées et confidentielles</p>
                    <p className="mt-2">📞 Besoin d'aide ? <a href="tel:0180857586" className="text-yellow-600 hover:text-yellow-700 font-semibold">01 80 85 75 86</a></p>
                  </div>
                </Card>
              </div>
            </div>
          </main>

          <StickyCTA />
          <Footer />
        </div>
      </>
    );
  }

  if (!cityData) {
    return null;
  }

  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Villes', url: '/villes' },
    { name: `Assurance Taxi ${cityData.city}`, url: `/ville/${cityData.slug}` }
  ];

  const localBenefits = [
    {
      icon: MapPin,
      title: `Expertise Locale ${cityData.city}`,
      description: `Connaissance approfondie du marché taxi de ${cityData.city} et de sa région. Tarifs adaptés aux spécificités locales.`,
      color: 'from-yellow-400 to-yellow-600'
    },
    {
      icon: TrendingDown,
      title: 'Tarifs Négociés Exclusifs',
      description: `Conditions préférentielles spécialement négociées pour le marché taxi de ${cityData.city}. Économisez jusqu'à 35%.`,
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: Users,
      title: 'Réseau Partenaires Local',
      description: `Partenaires privilégiés dans la région de ${cityData.city} : garages, équipementiers, services.`,
      color: 'from-gray-800 to-pink-600'
    },
    {
      icon: Award,
      title: 'Service Premium Dédié',
      description: `Accompagnement personnalisé et réactif par nos experts spécialisés taxi ${cityData.city}.`,
      color: 'from-amber-500 to-yellow-600'
    }
  ];

  const localFeatures = [
    'Connaissance des spécificités réglementaires locales',
    'Tarifs adaptés au marché régional et à la concurrence',
    'Réseau de partenaires privilégiés (garages, équipementiers)',
    'Assistance rapide et intervention locale en cas de sinistre',
    'Conseiller dédié expert du marché taxi de votre région',
    'Démarches administratives simplifiées et accélérées'
  ];

  const cityStats = {
    taxis: Math.floor(Math.random() * 2000) + 500,
    savings: '35%',
    clients: Math.floor(Math.random() * 500) + 100,
    satisfaction: '4.8/5'
  };

  return (
    <>
      <Seo
        title={`Assurance Taxi ${cityData.city} - Devis Gratuit & Immédiat`}
        description={`Comparez les meilleures offres d'assurance taxi à ${cityData.city}. Devis gratuit en 2 minutes. Experts locaux. Économisez jusqu'à 35%.`}
        canonical={`/ville/${cityData.slug}`}
        keywords={`assurance taxi ${cityData.city}, assurance chauffeur taxi ${cityData.city}, devis assurance taxi ${cityData.city}`}
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        <AITaxiBackground />

        <main className="relative z-10">
          <section className="section-padding">
            <div className="container-max">
              <div className="text-center mb-12">
                <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-yellow-500 px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-sm border border-amber-500/30">
                  <MapPin size={16} />
                  <span>{cityData.city}</span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-2xl">
                  Assurance Taxi à <span className="text-yellow-500">{cityData.city}</span>
                </h1>

                <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                  Profitez d'une expertise locale et de tarifs négociés spécialement pour les taxis de {cityData.city}.
                  Devis gratuit en 2 minutes.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                    <div className="text-3xl font-bold text-yellow-500 mb-1">{cityStats.taxis}+</div>
                    <div className="text-sm text-gray-300">Taxis assurés</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                    <div className="text-3xl font-bold text-yellow-500 mb-1">{cityStats.savings}</div>
                    <div className="text-sm text-gray-300">Économies moy.</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                    <div className="text-3xl font-bold text-yellow-500 mb-1">{cityStats.clients}</div>
                    <div className="text-sm text-gray-300">Clients satisfaits</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                    <div className="text-3xl font-bold text-yellow-500 mb-1">{cityStats.satisfaction}</div>
                    <div className="text-sm text-gray-300">Note moyenne</div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-16">
                {localBenefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <Card key={index} className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-300">
                      <div className="flex items-start space-x-4">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br ${benefit.color} flex items-center justify-center`}>
                          <Icon size={24} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">
                            {benefit.title}
                          </h3>
                          <p className="text-gray-300">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <Card className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-amber-500/30 backdrop-blur-md mb-16">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-6">
                      Pourquoi choisir notre expertise locale ?
                    </h2>
                    <ul className="space-y-3">
                      {localFeatures.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <CheckCircle size={20} className="text-yellow-500 flex-shrink-0 mt-1" />
                          <span className="text-gray-200">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <Card className="bg-white border-none">
                      <h3 className="text-2xl font-bold text-gray-900 font-semibold mb-6 text-center">
                        Obtenez votre devis gratuit
                      </h3>
                      <LeadForm />
                    </Card>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        </main>

        <StickyCTA />
        <Footer />
      </div>
    </>
  );
};

export default CityPage;
