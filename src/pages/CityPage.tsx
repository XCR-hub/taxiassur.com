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
  city: string;
  title: string;
  slug: string;
  content: string;
  meta_description?: string;
  keywords?: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

const CityPage: React.FC = () => {
  const { city } = useParams<{ city: string }>();
  const [cityPageData, setCityPageData] = useState<CityPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [useTemplate, setUseTemplate] = useState(false);

  useEffect(() => {
    const loadCityPage = async () => {
      if (!city) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('city_pages')
          .select('*')
          .eq('slug', city)
          .eq('status', 'published')
          .maybeSingle();

        if (error) {
          console.warn('Supabase city page fetch failed:', error);
          setUseTemplate(true);
        } else if (data) {
          setCityPageData(data);
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

              <article className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-h2:text-3xl prose-h2:font-bold prose-h2:mb-6 prose-h2:mt-8 prose-h3:text-2xl prose-h3:font-bold prose-h3:mb-4 prose-h3:mt-6 prose-p:text-gray-700 prose-p:text-lg prose-p:leading-relaxed prose-p:mb-4 prose-ul:text-gray-700 prose-li:mb-2 prose-strong:text-gray-900 prose-strong:font-semibold">
                <div dangerouslySetInnerHTML={{ __html: cityPageData.content }} />
              </article>

              <div className="mt-12">
                <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200">
                  <h2 className="text-2xl font-bold text-gray-900 font-semibold mb-6 text-center">
                    Obtenez votre devis gratuit
                  </h2>
                  <LeadForm />
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
