import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MapPin, TrendingUp, Shield, Star, Phone } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceTaxiParis: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Paris 2026 : Tarifs & Devis Gratuit | TaxiAssur</title>
        <meta
          name="description"
          content="Assurance Taxi Paris dès 2,080€/an (-35%). Tarifs par arrondissement, couverture G7, Alpha, taxis parisiens. Devis gratuit en 2 min spécial Paris."
        />
        <meta name="keywords" content="assurance taxi paris, assurance taxi parisien, assurance g7 taxi, prix assurance taxi paris, taxi paris assurance" />
        <link rel="canonical" href="https://taxiassur.com/assurance-taxi-paris" />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "TaxiAssur Paris - Assurance Taxi Parisien",
            "description": "Assurance taxi spécialisée pour chauffeurs parisiens. Tarifs négociés -35% pour tous arrondissements.",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Paris",
              "addressRegion": "Île-de-France",
              "addressCountry": "FR"
            },
            "areaServed": {
              "@type": "City",
              "name": "Paris"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "127",
              "bestRating": "5"
            },
            "telephone": "+33180855786",
            "url": "https://taxiassur.com/assurance-taxi-paris",
            "priceRange": "€€"
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Pourquoi l'assurance taxi coûte plus cher à Paris ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "L'assurance taxi à Paris coûte en moyenne 3,200€/an (vs 2,200€ national) en raison du trafic dense, des risques d'accidents +45% supérieurs, du nombre élevé de sinistres, et des zones de circulation complexes. TaxiAssur négocie des tarifs à partir de 2,080€/an (-35%)."
                }
              },
              {
                "@type": "Question",
                "name": "Quelle est la meilleure assurance pour taxi G7 Paris ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Les taxis G7 peuvent bénéficier d'assurances spécifiques via TaxiAssur avec tarifs négociés -35%. Couverture complète incluant RC Pro, protection juridique, assistance 0 km et véhicule de remplacement adapté aux contraintes parisiennes."
                }
              }
            ]
          })}
        </script>
              <meta property="og:type" content="website" />
        <meta property="og:title" content="Assurance Taxi Paris : Tarifs Parisien 2024 | TaxiAssur" />
        <meta property="og:description" content="Assurance Taxi Paris dès 2,080€/an (-35%). Tarifs par arrondissement, couverture G7, Alpha, taxis parisiens. Devis gratuit en 2 min spécial Paris." />
        <meta property="og:url" content="https://taxiassur.com/assurance-taxi-paris" />
        <meta property="og:image" content="https://taxiassur.com/logo-600x300.png" />
        <meta property="og:site_name" content="TaxiAssur" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Assurance Taxi Paris : Tarifs Parisien 2024 | TaxiAssur" />
        <meta name="twitter:description" content="Assurance Taxi Paris dès 2,080€/an (-35%). Tarifs par arrondissement, couverture G7, Alpha, taxis parisiens. Devis gratuit en 2 min spécial Paris." />
        <meta name="twitter:image" content="https://taxiassur.com/logo-600x300.png" />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-orange-900 via-blue-800 to-orange-900 text-white py-20 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMCAwIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center bg-yellow-400 text-orange-900 px-4 py-2 rounded-full text-sm font-bold mb-6">
                <MapPin size={16} className="mr-2" />
                Spécialiste Taxis Parisiens
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
                Assurance Taxi Paris<br />
                <span className="text-yellow-400">Tarifs Négociés -35%</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-yellow-100">
                Tous arrondissements • G7, Alpha, indépendants • Devis 2 min
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="text-3xl font-black text-yellow-400">2,080€</div>
                  <div className="text-sm">Dès /an</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="text-3xl font-black text-yellow-400">-35%</div>
                  <div className="text-sm">vs marché</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="text-3xl font-black text-yellow-400">24/7</div>
                  <div className="text-sm">Assistance</div>
                </div>
              </div>

              <a
                href="#devis"
                className="inline-block bg-yellow-400 hover:bg-yellow-500 text-orange-900 font-bold text-lg px-8 py-4 rounded-xl transition-all transform hover:scale-105 shadow-xl"
              >
                Devis Gratuit Taxi Paris →
              </a>
            </div>
          </div>
        </section>

        {/* Pourquoi plus cher à Paris */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-4">
                Pourquoi l'Assurance Taxi Coûte Plus Cher à Paris ?
              </h2>
              <p className="text-xl text-center text-gray-600 mb-12">
                Comprendre les spécificités du marché parisien
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200">
                  <div className="text-4xl font-black text-red-600 mb-3">+45%</div>
                  <h3 className="font-bold mb-2">Risque Accidents</h3>
                  <p className="text-sm text-gray-700">Trafic dense, embouteillages, comportements routiers agressifs</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200">
                  <div className="text-4xl font-black text-orange-600 mb-3">3,200€</div>
                  <h3 className="font-bold mb-2">Prix Moyen</h3>
                  <p className="text-sm text-gray-700">vs 2,200€ moyenne nationale (+45% surcoût Paris)</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border-2 border-yellow-200">
                  <div className="text-4xl font-black text-yellow-600 mb-3">15,000</div>
                  <h3 className="font-bold mb-2">Taxis Paris</h3>
                  <p className="text-sm text-gray-700">Forte concentration, concurrence zones, stations prioritaires</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
                  <div className="text-4xl font-black text-green-600 mb-3">24/7</div>
                  <h3 className="font-bold mb-2">Activité</h3>
                  <p className="text-sm text-gray-700">Service continu, nuit, événements, aéroports</p>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-xl">
                <p className="text-lg font-semibold text-orange-900 mb-2">
                  💡 Bonne nouvelle !
                </p>
                <p className="text-gray-700">
                  TaxiAssur a négocié des <strong>tarifs préférentiels spécial Paris</strong> :
                  de 2,080€/an au lieu de 3,200€ en moyenne. <strong>Économie annuelle : 1,120€ (-35%)</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Prix par arrondissement */}
        <section className="py-16 bg-white border border-yellow-100">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
                Prix Assurance Taxi à Paris par Zone
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full bg-white shadow-xl rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-yellow-500 to-yellow-700 text-white">
                    <tr>
                      <th className="p-4 text-left font-bold">Zone Paris</th>
                      <th className="p-4 text-center font-bold">Arrondissements</th>
                      <th className="p-4 text-center font-bold">Prix Marché</th>
                      <th className="p-4 text-center font-bold">TaxiAssur</th>
                      <th className="p-4 text-center font-bold">Économie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-100">
                    <tr className="hover:bg-yellow-50 transition-colors">
                      <td className="p-4 font-semibold">Paris Centre</td>
                      <td className="p-4 text-center">1-4</td>
                      <td className="p-4 text-center text-red-600 font-bold">3,500€</td>
                      <td className="p-4 text-center text-green-600 font-bold">2,275€</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          -1,225€
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-yellow-50 transition-colors">
                      <td className="p-4 font-semibold">Paris Ouest</td>
                      <td className="p-4 text-center">8, 16, 17</td>
                      <td className="p-4 text-center text-red-600 font-bold">3,400€</td>
                      <td className="p-4 text-center text-green-600 font-bold">2,210€</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          -1,190€
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-yellow-50 transition-colors">
                      <td className="p-4 font-semibold">Paris Nord</td>
                      <td className="p-4 text-center">18, 19</td>
                      <td className="p-4 text-center text-red-600 font-bold">3,200€</td>
                      <td className="p-4 text-center text-green-600 font-bold">2,080€</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          -1,120€
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-yellow-50 transition-colors">
                      <td className="p-4 font-semibold">Paris Est</td>
                      <td className="p-4 text-center">11, 12, 20</td>
                      <td className="p-4 text-center text-red-600 font-bold">3,100€</td>
                      <td className="p-4 text-center text-green-600 font-bold">2,015€</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          -1,085€
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-yellow-50 transition-colors">
                      <td className="p-4 font-semibold">Paris Sud</td>
                      <td className="p-4 text-center">13, 14, 15</td>
                      <td className="p-4 text-center text-red-600 font-bold">3,000€</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,950€</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          -1,050€
                        </span>
                      </td>
                    </tr>
                    <tr className="bg-yellow-50 font-bold">
                      <td className="p-4">MOYENNE PARIS</td>
                      <td className="p-4 text-center">Tous</td>
                      <td className="p-4 text-center text-red-700 text-lg">3,200€</td>
                      <td className="p-4 text-center text-green-700 text-lg">2,080€</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-200 text-green-900 px-4 py-2 rounded-full font-black">
                          -35%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-8 text-center">
                <p className="text-gray-600 mb-4">
                  <strong>Facteurs influençant le prix :</strong> arrondissement d'activité principale,
                  historique sinistres, ancienneté, âge du véhicule, garanties choisies
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Compagnies Paris */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
                Assurance Taxi Parisien : G7, Alpha, Indépendants
              </h2>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-8 border-2 border-orange-300">
                  <div className="text-center mb-4">
                    <div className="bg-yellow-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield size={32} />
                    </div>
                    <h3 className="text-2xl font-bold">Taxis G7</h3>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li>✓ Tarifs négociés flotte G7</li>
                    <li>✓ Couverture centrale radio</li>
                    <li>✓ Assistance stations prioritaires</li>
                    <li>✓ Gestion sinistres dédiée</li>
                  </ul>
                  <div className="mt-6 text-center">
                    <div className="text-2xl font-black text-yellow-600">2,150€/an</div>
                    <p className="text-sm text-gray-600">au lieu de 3,300€</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-8 border-2 border-green-300 relative">
                  <div className="absolute top-4 right-4 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                    POPULAIRE
                  </div>
                  <div className="text-center mb-4">
                    <div className="bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star size={32} />
                    </div>
                    <h3 className="text-2xl font-bold">Taxis Alpha</h3>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li>✓ Offre spéciale Alpha Taxi</li>
                    <li>✓ Protection maraude Paris</li>
                    <li>✓ Véhicule remplacement 24h</li>
                    <li>✓ RC Pro illimitée</li>
                  </ul>
                  <div className="mt-6 text-center">
                    <div className="text-2xl font-black text-green-600">2,080€/an</div>
                    <p className="text-sm text-gray-600">au lieu de 3,200€</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-lg p-8 border-2 border-yellow-300">
                  <div className="text-center mb-4">
                    <div className="bg-yellow-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp size={32} />
                    </div>
                    <h3 className="text-2xl font-bold">Indépendants</h3>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li>✓ Tarif artisan Paris</li>
                    <li>✓ Flexibilité garanties</li>
                    <li>✓ Conseil personnalisé</li>
                    <li>✓ Gestion simple 100% en ligne</li>
                  </ul>
                  <div className="mt-6 text-center">
                    <div className="text-2xl font-black text-yellow-600">1,950€/an</div>
                    <p className="text-sm text-gray-600">au lieu de 3,000€</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-xl">
                <p className="font-semibold text-yellow-900 mb-2">
                  🤝 Partenariat Centrales Parisiennes
                </p>
                <p className="text-gray-700">
                  TaxiAssur travaille directement avec les principales centrales parisiennes (G7, Alpha, Taxis Bleus).
                  <strong> Tarifs de groupe négociés même pour chauffeurs indépendants.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Témoignages Parisiens */}
        <section className="py-16 bg-white border border-yellow-100">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
                Avis Chauffeurs Taxi Parisiens
              </h2>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-yellow-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold mr-3">
                      JM
                    </div>
                    <div>
                      <div className="font-bold">Jean-Michel T.</div>
                      <div className="text-sm text-gray-600">G7 Paris 15e</div>
                    </div>
                  </div>
                  <div className="flex mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 italic">
                    "1,200€ économisés sur mon assurance taxi ! En 20 ans de métier, c'est la première fois
                    qu'on me propose un vrai tarif parisien abordable. Service impeccable."
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold mr-3">
                      MA
                    </div>
                    <div>
                      <div className="font-bold">Mohamed A.</div>
                      <div className="text-sm text-gray-600">Alpha Taxi 18e</div>
                    </div>
                  </div>
                  <div className="flex mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 italic">
                    "Souscription en ligne super rapide. Attestation reçue en 10 min.
                    J'ai pu reprendre le boulot immédiatement. Prix imbattable pour Paris !"
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-yellow-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold mr-3">
                      SP
                    </div>
                    <div>
                      <div className="font-bold">Sophie P.</div>
                      <div className="text-sm text-gray-600">Indépendante 11e</div>
                    </div>
                  </div>
                  <div className="flex mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 italic">
                    "Conseillère hyper pro qui connaît bien Paris. Elle m'a expliqué tous les pièges
                    à éviter. Enfin une assurance qui comprend notre métier !"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
                Questions Fréquentes Assurance Taxi Paris
              </h2>

              <div className="space-y-6">
                <div className="bg-white border border-yellow-100 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">L'assurance change selon l'arrondissement ?</h3>
                  <p className="text-gray-700">
                    Oui, les tarifs varient selon la zone d'activité principale. Paris Centre (1-4) est plus cher
                    car trafic très dense et tourisme. Paris périphérique (13-20) moins cher car moins de congestion.
                    TaxiAssur propose des <strong>tarifs adaptés à chaque arrondissement</strong> : de 1,950€ (13-15e) à 2,275€ (1-4e).
                  </p>
                </div>

                <div className="bg-white border border-yellow-100 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Taxis G7 : assurance spécifique ?</h3>
                  <p className="text-gray-700">
                    Les taxis G7 peuvent choisir l'assurance de leur choix. TaxiAssur a négocié des <strong>tarifs préférentiels
                    pour chauffeurs G7</strong> : 2,150€/an au lieu de 3,300€. Couverture incluant stations prioritaires G7,
                    assistance radio et gestion sinistres dédiée.
                  </p>
                </div>

                <div className="bg-white border border-yellow-100 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Assurance taxi électrique Paris (Tesla, etc.) ?</h3>
                  <p className="text-gray-700">
                    Paris encourage les taxis électriques (Tesla Model 3, Ioniq 5). TaxiAssur assure tous véhicules électriques
                    avec <strong>réduction supplémentaire de 5%</strong> sur la prime. Exemple : Tesla Model 3 à Paris 18e = 1,976€/an
                    au lieu de 3,040€ (-35% puis -5% électrique).
                  </p>
                </div>

                <div className="bg-white border border-yellow-100 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Couverture aéroports Paris (CDG, Orly) ?</h3>
                  <p className="text-gray-700">
                    Oui, toutes nos assurances couvrent les trajets aéroports (CDG, Orly, Le Bourget).
                    <strong>Aucun surcoût</strong> pour activité aéroports. Assistance 24/7 en cas de panne sur autoroute
                    ou parking aéroport.
                  </p>
                </div>

                <div className="bg-white border border-yellow-100 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Délai obtention attestation Paris ?</h3>
                  <p className="text-gray-700">
                    Souscription 100% en ligne en 5 minutes. <strong>Attestation envoyée par email en 10 minutes</strong>.
                    Carte verte physique reçue sous 48h. Vous pouvez circuler immédiatement avec l'attestation provisoire.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="devis" className="py-16 bg-gradient-to-br from-orange-900 via-blue-800 to-orange-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black mb-4">
                  Obtenez Votre Devis Taxi Paris en 2 Minutes
                </h2>
                <p className="text-xl text-yellow-100">
                  Tous arrondissements • Économisez jusqu'à 1,225€/an
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <EnhancedLeadForm />
                </div>

                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <MapPin className="text-orange-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Spécialiste Paris</h3>
                      <p className="text-yellow-100">Tarifs négociés tous arrondissements</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <TrendingUp className="text-orange-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">-35% Garanti</h3>
                      <p className="text-yellow-100">Économie moyenne 1,120€/an</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <Shield className="text-orange-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Couverture Complète</h3>
                      <p className="text-yellow-100">RC Pro + Maraude + Aéroports + Assistance 0km</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <Phone className="text-orange-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Support Parisien</h3>
                      <p className="text-yellow-100">Conseiller dédié qui connaît Paris</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEO Links */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h3 className="text-xl font-bold mb-6 text-center">Assurance Taxi autres villes</h3>
              <div className="grid md:grid-cols-4 gap-4 text-center text-sm">
                <Link to="/assurance-taxi" className="text-yellow-600 hover:underline">Assurance Taxi</Link>
                <Link to="/assurance-taxi-vtc" className="text-yellow-600 hover:underline">Assurance VTC</Link>
                <Link to="/rc-professionnelle" className="text-yellow-600 hover:underline">RC Pro Taxi</Link>
                <Link to="/prix-assurance-taxi" className="text-yellow-600 hover:underline">Tarifs Assurance</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default AssuranceTaxiParis;
