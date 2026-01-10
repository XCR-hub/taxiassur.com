import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, TrendingDown, Target } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import JsonLd from '../components/JsonLd';
import { getCityPages, CityPage } from '../lib/content';
import Card from '../components/Card';
import AITaxiBackground from '../components/AITaxiBackground';

const CityIndex: React.FC = () => {
  const [cities, setCities] = useState<CityPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCities() {
      try {
        const data = await getCityPages();
        setCities(data);
      } catch (error) {
        console.error('Error loading cities:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCities();
  }, []);
  
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Villes', url: '/villes' }
  ];

  const regions = Array.from(new Set(cities.map(city => city.region))).map(region => ({
    name: region,
    cities: cities.filter(city => city.region === region)
  }));

  return (
    <>
      <Seo
        title="Assurance Taxi par Ville - Couverture Nationale"
        description="Trouvez votre assurance taxi dans votre ville. Couverture nationale, tarifs adaptés par région, expertise locale. TaxiAssur présent partout en France."
        canonical="/villes"
        keywords="assurance taxi ville, couverture nationale, tarifs régionaux"
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />

      <div className="min-h-screen bg-white">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-20 overflow-hidden">
            <AITaxiBackground section="hero" intensity="medium" />
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{
                backgroundImage: `url('https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-gray-900/70 to-black/90"></div>
            </div>
            <div className="container-max">
              <div className="max-w-5xl mx-auto text-center relative z-20">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl taxi-glow">
                    <MapPin className="text-black drop-shadow-md" size={32} />
                  </div>
                  <h1 className="text-4xl md:text-6xl font-bold drop-shadow-lg">
                    Assurance Taxi <span className="text-gradient">Partout en France</span>
                  </h1>
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-2xl taxi-glow">
                    <Target className="text-black animate-pulse drop-shadow-md" size={32} />
                  </div>
                </div>
                <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                  🗺️ <strong className="text-yellow-400">Trouvez votre assurance taxi dans votre ville</strong>. 
                  <strong className="text-yellow-500">Couverture nationale complète</strong>, 
                  <strong className="text-green-400">tarifs adaptés par région</strong> et 
                  <strong className="text-yellow-400">expertise locale garantie</strong>.
                </p>
                
                <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mb-8">
                  <div className="text-center">
                    <div className="ai-card p-4 hover:shadow-amber-500/40 transition-all duration-300">
                      <div className="text-3xl font-bold text-yellow-500 drop-shadow-lg">{cities.length}</div>
                      <div className="text-sm text-gray-300 drop-shadow-md">Villes couvertes</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="ai-card p-4 hover:shadow-green-500/40 transition-all duration-300">
                      <div className="text-3xl font-bold text-green-400 drop-shadow-lg">100+</div>
                      <div className="text-sm text-gray-300 drop-shadow-md">Clients nationaux</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="ai-card p-4 hover:shadow-yellow-500/40 transition-all duration-300">
                      <div className="text-3xl font-bold text-yellow-400 drop-shadow-lg">-35%</div>
                      <div className="text-sm text-gray-300 drop-shadow-md">Économie moyenne</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="#recherche" className="btn-primary">
                    🎯 Trouver Mon Assurance Taxi Local
                  </a>
                  <a href="tel:0180855786" className="btn-outline">
                    📞 Expert National : 01 80 85 57 86
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Recherche rapide */}
          <section id="recherche" className="section-padding bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
            <AITaxiBackground section="content" intensity="low" />
            <div className="container-max">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
                  Trouvez Votre Ville
                </h2>
                <p className="text-xl text-gray-200 mb-8 drop-shadow-md">
                  Sélectionnez votre ville pour découvrir nos services locaux et obtenir un devis adapté.
                </p>
                
                {loading ? (
                  <div className="text-center text-white py-12">Chargement des villes...</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {cities.slice(0, 8).map(city => (
                      <Link
                        key={city.slug}
                        to={city.url}
                        className="ai-card p-6 text-center hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300 group"
                      >
                        <MapPin className="mx-auto mb-3 text-yellow-500 group-hover:scale-110 transition-transform drop-shadow-md" size={24} />
                        <div className="font-bold text-white text-lg group-hover:text-amber-300 transition-colors drop-shadow-lg">{city.name}</div>
                        <div className="text-sm text-gray-300 drop-shadow-md">Département {city.department}</div>
                        <div className="text-xs text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 drop-shadow-md">
                          Voir les tarifs →
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Villes par région */}
          <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900 relative overflow-hidden">
            <AITaxiBackground section="content" intensity="medium" />
            <div className="container-max">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center drop-shadow-lg">
                  Toutes Nos Villes par Région
                </h2>
                
                <div className="space-y-16">
                  {regions.map(region => (
                    <div key={region.name} className="relative">
                      <h3 className="text-2xl font-bold text-white mb-8 flex items-center justify-center drop-shadow-lg">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                          <MapPin className="text-black drop-shadow-md" size={20} />
                        </div>
                        {region.name}
                        <div className="ml-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-3 py-1 rounded-full border border-amber-500/40 text-sm">
                          {region.cities.length} villes
                        </div>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {region.cities.map(city => (
                          <Link
                            key={city.slug}
                            to={city.url}
                            className="block group"
                          >
                            <div className="ai-card p-6 text-center hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300">
                              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                <MapPin className="text-white drop-shadow-md" size={20} />
                              </div>
                              <h4 className="font-bold text-white group-hover:text-amber-300 transition-colors mb-2 drop-shadow-lg">
                                {city.name}
                              </h4>
                              <p className="text-sm text-gray-300 mb-3 drop-shadow-md">
                                Département {city.department}
                              </p>
                              <div className="text-xs text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">
                                Voir les tarifs →
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Avantages nationaux */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
            <AITaxiBackground section="content" intensity="low" />
            <div className="container-max">
              <div className="max-w-5xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 drop-shadow-lg">
                  Couverture Nationale, Service Local
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                  <div className="ai-card text-center p-8 hover:shadow-yellow-500/40 transition-all duration-300 group">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl group-hover:scale-110 transition-transform">
                      <MapPin className="text-white drop-shadow-md" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                      Présence Nationale
                    </h3>
                    <p className="text-gray-300 drop-shadow-md">
                      Couverture dans toute la France métropolitaine et DOM-TOM
                    </p>
                  </div>

                  <div className="ai-card text-center p-8 hover:shadow-green-500/40 transition-all duration-300 group">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl group-hover:scale-110 transition-transform">
                      <TrendingDown className="text-white drop-shadow-md" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                      Tarifs Régionaux
                    </h3>
                    <p className="text-gray-300 drop-shadow-md">
                      Conditions adaptées aux spécificités de chaque région
                    </p>
                  </div>

                  <div className="ai-card text-center p-8 hover:shadow-yellow-500/40 transition-all duration-300 group">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl group-hover:scale-110 transition-transform">
                      <Users className="text-white drop-shadow-md" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                      Expertise Locale
                    </h3>
                    <p className="text-gray-300 drop-shadow-md">
                      Conseillers qui connaissent votre marché local
                    </p>
                  </div>
                </div>
                
                {/* Enhanced CTA */}
                <div className="ai-card p-8 max-w-3xl mx-auto taxi-glow">
                  <h3 className="text-2xl font-bold text-gradient mb-4 drop-shadow-lg">
                    🚀 Assurance Taxi Nationale, Expertise Locale
                  </h3>
                  <p className="text-gray-200 mb-6 text-lg drop-shadow-md">
                    Où que vous exerciez en France, TaxiAssur vous accompagne avec une expertise locale 
                    et des tarifs négociés spécialement pour votre région.
                  </p>
                  <a href="#devis" className="btn-primary">
                    🎯 OBTENIR MON DEVIS LOCAL GRATUIT
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CityIndex;