import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Check, X, Shield, TrendingDown, FileText, Phone } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceTaxiVTC: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi VTC : Comparatif & Tarifs 2024 | TaxiAssur</title>
        <meta
          name="description"
          content="Assurance Taxi VTC complète dès 1,170€/an (-35%). Découvrez les différences Taxi vs VTC, obligations légales et devis gratuit en 2 min. RC Pro incluse."
        />
        <meta name="keywords" content="assurance taxi vtc, assurance vtc et taxi, assurance pour vtc, assurance chauffeur vtc, prix assurance vtc taxi" />
        <link rel="canonical" href="https://www.taxiassur.com/assurance-taxi-vtc" />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Quelle est la différence entre assurance Taxi et VTC ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Les principales différences : RC Pro obligatoire pour les deux, mais le statut juridique diffère (Taxi = artisan, VTC = auto-entrepreneur). Prix moyen Taxi : 2,200€/an vs VTC : 1,800€/an. Les zones d'activité sont différentes : maraude autorisée pour Taxi, réservation préalable obligatoire pour VTC."
                }
              },
              {
                "@type": "Question",
                "name": "Puis-je avoir la même assurance pour Taxi et VTC ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Non, il faut deux contrats distincts car les risques et réglementations diffèrent. Cependant, certains assureurs comme TaxiAssur proposent des offres combinées avec réduction."
                }
              },
              {
                "@type": "Question",
                "name": "Quel est le prix d'une assurance VTC en 2024 ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Prix moyen assurance VTC : 1,800€/an. Avec TaxiAssur, à partir de 1,170€/an (-35%) avec RC Pro incluse, garanties complètes et assistance 24/7."
                }
              }
            ]
          })}
        </script>
      </Helmet>

      <Header />

      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white py-20 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMCAwIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-block bg-yellow-400 text-blue-900 px-4 py-2 rounded-full text-sm font-bold mb-6">
                #1 Assurance Taxi VTC en France
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
                Assurance Taxi VTC<br />
                <span className="text-yellow-400">Complète & Pas Chère</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100">
                Comparez Taxi vs VTC • RC Pro Incluse • Devis en 2 min
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="text-3xl font-black text-yellow-400">-35%</div>
                  <div className="text-sm">Sur vos cotisations</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="text-3xl font-black text-yellow-400">1,170€</div>
                  <div className="text-sm">Par an dès</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="text-3xl font-black text-yellow-400">2 min</div>
                  <div className="text-sm">Devis gratuit</div>
                </div>
              </div>

              <a
                href="#devis"
                className="inline-block bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold text-lg px-8 py-4 rounded-xl transition-all transform hover:scale-105 shadow-xl"
              >
                Obtenir mon Devis Gratuit →
              </a>
            </div>
          </div>
        </section>

        {/* Section Différences Taxi vs VTC */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-4">
                Taxi vs VTC : 7 Différences Assurance
              </h2>
              <p className="text-xl text-center text-gray-600 mb-12">
                Comprendre les spécificités pour choisir la bonne couverture
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white shadow-lg rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <tr>
                      <th className="p-4 text-left font-bold">Critère</th>
                      <th className="p-4 text-center font-bold">🚕 TAXI</th>
                      <th className="p-4 text-center font-bold">🚗 VTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-blue-50 transition-colors">
                      <td className="p-4 font-semibold">RC Professionnelle</td>
                      <td className="p-4 text-center">
                        <Check className="inline text-green-600" /> Obligatoire
                      </td>
                      <td className="p-4 text-center">
                        <Check className="inline text-green-600" /> Obligatoire
                      </td>
                    </tr>
                    <tr className="hover:bg-blue-50 transition-colors">
                      <td className="p-4 font-semibold">Statut juridique</td>
                      <td className="p-4 text-center">Artisan / SARL</td>
                      <td className="p-4 text-center">Auto-entrepreneur</td>
                    </tr>
                    <tr className="hover:bg-blue-50 transition-colors">
                      <td className="p-4 font-semibold">Prix moyen/an</td>
                      <td className="p-4 text-center font-bold text-red-600">2,200€</td>
                      <td className="p-4 text-center font-bold text-green-600">1,800€</td>
                    </tr>
                    <tr className="hover:bg-blue-50 transition-colors">
                      <td className="p-4 font-semibold">Prix TaxiAssur/an</td>
                      <td className="p-4 text-center font-bold text-blue-600">1,430€ (-35%)</td>
                      <td className="p-4 text-center font-bold text-blue-600">1,170€ (-35%)</td>
                    </tr>
                    <tr className="hover:bg-blue-50 transition-colors">
                      <td className="p-4 font-semibold">Carte professionnelle</td>
                      <td className="p-4 text-center">Carte T (Taxi)</td>
                      <td className="p-4 text-center">Carte VTC</td>
                    </tr>
                    <tr className="hover:bg-blue-50 transition-colors">
                      <td className="p-4 font-semibold">Zone d'activité</td>
                      <td className="p-4 text-center">Maraude autorisée</td>
                      <td className="p-4 text-center">Réservation préalable uniquement</td>
                    </tr>
                    <tr className="hover:bg-blue-50 transition-colors">
                      <td className="p-4 font-semibold">Équipement obligatoire</td>
                      <td className="p-4 text-center">Compteur horokilométrique</td>
                      <td className="p-4 text-center">Application réservation</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-8 bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-xl">
                <p className="text-lg font-semibold text-blue-900 mb-2">
                  💡 Bon à savoir
                </p>
                <p className="text-gray-700">
                  Vous pouvez cumuler activité Taxi ET VTC, mais il faut <strong>deux contrats d'assurance distincts</strong>.
                  TaxiAssur propose des <strong>offres combinées avec réduction supplémentaire de 10%</strong> si vous assurez les deux activités.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section Obligations légales */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
                Quelle Assurance pour VTC et Taxi ?
              </h2>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-white rounded-2xl shadow-lg p-8 border-t-4 border-blue-600">
                  <div className="flex items-center mb-4">
                    <Shield className="text-blue-600 mr-3" size={32} />
                    <h3 className="text-2xl font-bold">Assurances OBLIGATOIRES</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong className="text-lg">RC Professionnelle</strong>
                        <p className="text-gray-600 text-sm">Couvre dommages causés aux tiers dans le cadre de votre activité pro</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong className="text-lg">Assurance véhicule</strong>
                        <p className="text-gray-600 text-sm">RC auto minimum + garanties vol, incendie, bris de glace</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong className="text-lg">Protection passagers</strong>
                        <p className="text-gray-600 text-sm">Garantie obligatoire pour couvrir vos clients transportés</p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8 border-t-4 border-green-600">
                  <div className="flex items-center mb-4">
                    <TrendingDown className="text-green-600 mr-3" size={32} />
                    <h3 className="text-2xl font-bold">Garanties RECOMMANDÉES</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <Check className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong className="text-lg">Protection juridique</strong>
                        <p className="text-gray-600 text-sm">Assistance en cas de litige avec client ou administration</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong className="text-lg">Garantie conducteur</strong>
                        <p className="text-gray-600 text-sm">Protection en cas d'accident responsable (frais médicaux, ITT)</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong className="text-lg">Assistance 0 km</strong>
                        <p className="text-gray-600 text-sm">Dépannage même devant chez vous + véhicule de remplacement</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-xl">
                <p className="text-lg font-bold text-red-900 mb-2">
                  ⚠️ Attention sanctions !
                </p>
                <p className="text-gray-700">
                  Rouler sans RC Pro = <strong>3,750€ d'amende</strong> + suspension carte professionnelle + retrait véhicule.
                  En cas d'accident, vous devez <strong>indemniser personnellement les victimes</strong> (jusqu'à plusieurs millions d'€).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section Prix */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-4">
                Tarifs Assurance Taxi VTC 2024
              </h2>
              <p className="text-xl text-center text-gray-600 mb-12">
                Prix moyens marché vs TaxiAssur (économies jusqu'à -35%)
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Offre VTC */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-xl p-8 border-2 border-green-300 relative overflow-hidden">
                  <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    POPULAIRE
                  </div>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2">Formule VTC</h3>
                    <div className="flex items-baseline">
                      <span className="text-gray-600 line-through text-2xl mr-2">1,800€</span>
                      <span className="text-4xl font-black text-green-600">1,170€</span>
                      <span className="text-gray-600 ml-2">/an</span>
                    </div>
                    <p className="text-green-700 font-bold text-lg mt-2">Économie : 630€/an (-35%)</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>RC Pro illimitée incluse</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Tous risques véhicule</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Protection juridique offerte</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Assistance 0 km</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Véhicule de remplacement</span>
                    </li>
                  </ul>

                  <a
                    href="#devis"
                    className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl text-center transition-colors"
                  >
                    Devis VTC Gratuit
                  </a>
                </div>

                {/* Offre Taxi */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-xl p-8 border-2 border-blue-300">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2">Formule TAXI</h3>
                    <div className="flex items-baseline">
                      <span className="text-gray-600 line-through text-2xl mr-2">2,200€</span>
                      <span className="text-4xl font-black text-blue-600">1,430€</span>
                      <span className="text-gray-600 ml-2">/an</span>
                    </div>
                    <p className="text-blue-700 font-bold text-lg mt-2">Économie : 770€/an (-35%)</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Check className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                      <span>RC Pro illimitée incluse</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Tous risques + maraude</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Protection juridique offerte</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Assistance 0 km</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-blue-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Véhicule de remplacement</span>
                    </li>
                  </ul>

                  <a
                    href="#devis"
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-center transition-colors"
                  >
                    Devis Taxi Gratuit
                  </a>
                </div>
              </div>

              {/* Offre combinée */}
              <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl shadow-lg p-6 border-2 border-yellow-400">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">🎉 Offre Combinée Taxi + VTC</h3>
                    <p className="text-gray-700">
                      Vous cumulez les deux activités ? <strong>Réduction supplémentaire de 10%</strong>
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-orange-600">2,340€/an</div>
                    <div className="text-sm text-gray-600">au lieu de 3,600€</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
                Questions Fréquentes Assurance Taxi VTC
              </h2>

              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Puis-je cumuler activité Taxi ET VTC ?</h3>
                  <p className="text-gray-700">
                    Oui, vous pouvez cumuler les deux activités si vous possédez les deux cartes professionnelles (Carte T + Carte VTC).
                    Cependant, vous devez avoir <strong>deux contrats d'assurance distincts</strong> car les réglementations diffèrent.
                    TaxiAssur propose une offre combinée avec 10% de réduction supplémentaire.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Même assurance pour Taxi et VTC ?</h3>
                  <p className="text-gray-700">
                    Non, il faut obligatoirement <strong>deux contrats séparés</strong>. Les risques couverts sont différents :
                    le taxi peut faire de la maraude (stationnement stations, prise en charge rue), tandis que le VTC doit obligatoirement
                    avoir une réservation préalable. Les primes sont donc calculées différemment.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Pourquoi l'assurance VTC coûte moins cher que Taxi ?</h3>
                  <p className="text-gray-700">
                    L'assurance VTC est en moyenne 18% moins chère (1,800€ vs 2,200€/an) car les risques sont jugés inférieurs :
                    pas de maraude, réservation préalable uniquement, clientèle moins diversifiée, moins d'accidents statistiquement.
                    De plus, le statut auto-entrepreneur des VTC simplifie la gestion.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Quels documents pour souscrire assurance VTC ?</h3>
                  <p className="text-gray-700">
                    Documents nécessaires : <strong>Carte VTC valide</strong>, permis de conduire, carte grise du véhicule,
                    KBIS ou attestation auto-entrepreneur, relevé d'information assurance (si antécédents), RIB.
                    Chez TaxiAssur, <strong>souscription 100% en ligne en 5 minutes</strong>.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">VTC avec Uber, Bolt : assurance différente ?</h3>
                  <p className="text-gray-700">
                    Non, l'assurance est la même que vous travailliez avec Uber, Bolt, FreeNow ou en indépendant.
                    Vous devez avoir votre propre RC Pro + assurance véhicule professionnel. Les plateformes ne vous assurent pas,
                    elles vérifient seulement que vous êtes bien assuré.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Assurance VTC électrique (Tesla, etc.) ?</h3>
                  <p className="text-gray-700">
                    Oui, TaxiAssur assure tous types de véhicules VTC incluant électriques et hybrides.
                    Les Tesla Model 3 et Model Y sont particulièrement prisées. <strong>Réduction de 5% sur les véhicules électriques</strong>
                    car moins de pannes et frais d'entretien réduits.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Changement Taxi → VTC ou VTC → Taxi : impact assurance ?</h3>
                  <p className="text-gray-700">
                    Si vous passez de Taxi à VTC (ou l'inverse), vous devez <strong>résilier l'ancien contrat et souscrire un nouveau</strong>.
                    Délai : 1 mois de préavis. Chez TaxiAssur, nous gérons la transition et récupérons votre ancien contrat
                    pour éviter double cotisation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="devis" className="py-16 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black mb-4">
                  Obtenez Votre Devis Gratuit en 2 Minutes
                </h2>
                <p className="text-xl text-blue-100">
                  Taxi, VTC ou les deux ? Comparez et économisez jusqu'à -35%
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <EnhancedLeadForm />
                </div>

                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <Check className="text-blue-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Courtier Agréé ORIAS</h3>
                      <p className="text-blue-100">N° 11 061 425 • Garantie professionnelle</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <TrendingDown className="text-blue-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Économies Garanties</h3>
                      <p className="text-blue-100">Jusqu'à -35% vs assureurs classiques</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <FileText className="text-blue-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Attestation Immédiate</h3>
                      <p className="text-blue-100">Documents envoyés par email en 10 minutes</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <Phone className="text-blue-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Support 7j/7</h3>
                      <p className="text-blue-100">Conseiller dédié • Assistance sinistre 24/7</p>
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
              <h3 className="text-xl font-bold mb-6 text-center">Pour aller plus loin</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Link to="/assurance-taxi" className="text-blue-600 hover:text-blue-800 hover:underline text-center">
                  → Assurance Taxi classique
                </Link>
                <Link to="/rc-professionnelle" className="text-blue-600 hover:text-blue-800 hover:underline text-center">
                  → RC Professionnelle expliquée
                </Link>
                <Link to="/prix-assurance-taxi" className="text-blue-600 hover:text-blue-800 hover:underline text-center">
                  → Tarifs détaillés par profil
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default AssuranceTaxiVTC;
