import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';
import JsonLd from '../components/JsonLd';

const AssuranceObligatoireTaxi: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Obligatoire Taxi : Ce qu'il Faut Savoir 2026</title>
        <meta
          name="description"
          content="Quelles sont les assurances obligatoires pour taxi ? RC Pro, assurance véhicule, garanties passagers. Guide complet réglementation + sanctions."
        />
        <link rel="canonical" href="https://taxiassur.com/assurance-obligatoire-taxi" />
      </Helmet>
      <JsonLd type="insurance-product" data={{
        name: "Assurance Obligatoire Taxi RC Pro",
        description: "Assurance obligatoire taxi avec RC Professionnelle incluse. Couverture réglementaire complète, garanties passagers, protection juridique. Conformité légale garantie.",
        url: "/assurance-obligatoire-taxi",
        lowPrice: 890,
        highPrice: 1500,
        ratingValue: "4.8",
        reviewCount: 98,
        offerCount: 12
      }} />

      <Header />

      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <section className="relative bg-gradient-to-br from-red-900 via-red-800 to-red-900 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-black mb-6">
                Assurance Obligatoire Taxi<br />
                <span className="text-yellow-400">Guide Réglementation 2024</span>
              </h1>
              <p className="text-xl mb-8">RC Pro • Sanctions • Documents obligatoires</p>
              <a href="#devis" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-red-900 font-bold text-lg px-8 py-4 rounded-xl transition-all">
                Devis Gratuit →
              </a>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">3 Assurances OBLIGATOIRES</h2>

              <div className="space-y-8">
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-2xl p-8 border-l-4 border-red-600">
                  <div className="flex items-start">
                    <Shield className="text-red-600 mr-4 flex-shrink-0" size={48} />
                    <div>
                      <h3 className="text-2xl font-bold mb-3">1. RC Professionnelle (Obligatoire)</h3>
                      <p className="text-gray-700 mb-4">
                        <strong>Responsabilité Civile Professionnelle</strong> : couvre les dommages causés aux tiers dans le cadre de votre activité de taxi.
                      </p>
                      <ul className="space-y-2 text-gray-700">
                        <li>✓ Montant couverture : <strong>ILLIMITÉ obligatoire</strong></li>
                        <li>✓ Inclut : accidents, dommages corporels, matériels, immatériels</li>
                        <li>✓ Prix moyen : 400-600€/an (inclus dans assurance globale)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-8 border-l-4 border-orange-600">
                  <div className="flex items-start">
                    <CheckCircle className="text-orange-600 mr-4 flex-shrink-0" size={48} />
                    <div>
                      <h3 className="text-2xl font-bold mb-3">2. Assurance Véhicule Professionnel (Obligatoire)</h3>
                      <p className="text-gray-700 mb-4">
                        Assurance auto avec <strong>mention usage professionnel transport de personnes</strong>.
                      </p>
                      <ul className="space-y-2 text-gray-700">
                        <li>✓ RC auto minimum (tiers)</li>
                        <li>✓ Usage taxi/VTC déclaré</li>
                        <li>✓ Garanties complémentaires recommandées : vol, incendie, bris de glace</li>
                        <li>✓ Prix moyen : 1,800-3,500€/an selon garanties</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-2xl p-8 border-l-4 border-yellow-600">
                  <div className="flex items-start">
                    <AlertCircle className="text-yellow-600 mr-4 flex-shrink-0" size={48} />
                    <div>
                      <h3 className="text-2xl font-bold mb-3">3. Garantie Protection Passagers (Obligatoire)</h3>
                      <p className="text-gray-700 mb-4">
                        Protection spécifique pour les clients transportés dans votre taxi.
                      </p>
                      <ul className="space-y-2 text-gray-700">
                        <li>✓ Dommages corporels passagers en cas d'accident</li>
                        <li>✓ Généralement incluse dans RC Pro</li>
                        <li>✓ Indemnisation jusqu'à 1,2 million € par passager</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-red-50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12 text-red-900">Sanctions Sans Assurance</h2>

              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-red-700">Sanctions Pénales</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <span className="text-red-600 mr-2 text-2xl">•</span>
                        <span><strong>3,750€ d'amende</strong> (exercice sans assurance)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-600 mr-2 text-2xl">•</span>
                        <span><strong>Suspension licence taxi</strong> jusqu'à 6 mois</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-600 mr-2 text-2xl">•</span>
                        <span><strong>Retrait immédiat véhicule</strong></span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-600 mr-2 text-2xl">•</span>
                        <span><strong>Interdiction exercer</strong> si récidive</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-4 text-red-700">Risques Financiers</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <span className="text-red-600 mr-2 text-2xl">•</span>
                        <span><strong>Responsabilité illimitée</strong> en cas d'accident</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-600 mr-2 text-2xl">•</span>
                        <span>Dommages corporels : <strong>jusqu'à plusieurs millions €</strong></span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-600 mr-2 text-2xl">•</span>
                        <span><strong>Saisie biens personnels</strong> pour indemnisation</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-600 mr-2 text-2xl">•</span>
                        <span><strong>Faillite personnelle</strong> possible</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 bg-red-100 border-l-4 border-red-600 p-6 rounded-r-xl">
                  <p className="font-bold text-red-900 text-lg mb-2">⚠️ ATTENTION</p>
                  <p className="text-gray-800">
                    Exercer sans assurance = <strong>RISQUE MAJEUR</strong>. En cas d'accident grave avec blessés,
                    vous devrez indemniser personnellement les victimes (frais médicaux, préjudice corporel, perte revenus).
                    <strong> Montants pouvant atteindre 2-5 millions €</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Documents Obligatoires à Fournir</h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-yellow-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-4">Pour Souscrire Assurance</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ Carte professionnelle taxi valide</li>
                    <li>✓ Permis de conduire</li>
                    <li>✓ Carte grise véhicule</li>
                    <li>✓ KBIS ou attestation auto-entrepreneur</li>
                    <li>✓ Relevé d'information (si antécédents)</li>
                    <li>✓ RIB</li>
                  </ul>
                </div>

                <div className="bg-green-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-4">À Bord du Véhicule</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ Attestation assurance (carte verte)</li>
                    <li>✓ Carte professionnelle taxi</li>
                    <li>✓ Carte grise</li>
                    <li>✓ Attestation RC Pro</li>
                    <li>✓ Constat amiable</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="devis" className="py-16 bg-gradient-to-br from-orange-900 to-orange-800 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-8">Obtenez Votre Assurance Obligatoire Maintenant</h2>
              <p className="text-center text-xl mb-8">RC Pro incluse • Attestation en 10 min • Roulez légalement aujourd'hui</p>
              <EnhancedLeadForm />
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto text-center">
              <div className="grid md:grid-cols-3 gap-4">
                <Link to="/rc-professionnelle" className="text-yellow-600 hover:underline">RC Professionnelle</Link>
                <Link to="/assurance-taxi" className="text-yellow-600 hover:underline">Assurance Taxi</Link>
                <Link to="/prix-assurance-taxi" className="text-yellow-600 hover:underline">Prix Assurance</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default AssuranceObligatoireTaxi;
