import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';
import JsonLd from '../components/JsonLd';

const QuelleAssuranceTaxi: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Quelle Assurance pour Taxi ? Guide Complet 2026</title>
        <meta
          name="description"
          content="Quelle assurance choisir pour taxi ? RC Pro obligatoire, garanties recommandées, comparatif assureurs. Guide complet + devis gratuit 2 min."
        />
        <link rel="canonical" href="https://taxiassur.com/quelle-assurance-taxi" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Quelle Assurance pour Taxi ? Guide Complet 2026" />
        <meta property="og:description" content="Quelle assurance choisir pour taxi ? RC Pro obligatoire, garanties recommandées, comparatif assureurs. Guide complet + devis gratuit 2 min." />
        <meta property="og:url" content="https://taxiassur.com/quelle-assurance-taxi" />
        <meta property="og:image" content="https://taxiassur.com/logo-600x300.png" />
        <meta property="og:site_name" content="TaxiAssur" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:image:width" content="600" />
        <meta property="og:image:height" content="300" />
      </Helmet>
      <JsonLd type="insurance-product" data={{
        name: "Quelle Assurance Taxi Choisir - Guide Complet",
        description: "Guide pour choisir la meilleure assurance taxi. RC Pro obligatoire, tous risques, garanties recommandées. Comparatif assureurs spécialisés taxi en France.",
        url: "/quelle-assurance-taxi",
        lowPrice: 890,
        highPrice: 2000,
        ratingValue: "4.9",
        reviewCount: 94,
        offerCount: 15
      }} />

      <Header />

      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <section className="relative bg-gradient-to-br from-orange-900 via-blue-800 to-orange-900 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-black mb-6">
                Quelle Assurance pour Taxi ?<br />
                <span className="text-yellow-400">Guide Complet 2024</span>
              </h1>
              <p className="text-xl mb-8">RC Pro + Garanties • Comparatif • Devis 2 min</p>
              <a href="#devis" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-orange-900 font-bold text-lg px-8 py-4 rounded-xl transition-all">
                Devis Gratuit →
              </a>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Assurances Obligatoires pour Taxi</h2>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="bg-red-50 rounded-2xl p-8 border-2 border-red-300">
                  <Shield className="text-red-600 mb-4" size={48} />
                  <h3 className="text-xl font-bold mb-3">RC Professionnelle</h3>
                  <p className="text-gray-700 mb-4">Couvre dommages causés aux tiers dans cadre activité pro. Montant illimité obligatoire.</p>
                  <div className="text-2xl font-black text-red-600">Obligatoire</div>
                </div>

                <div className="bg-orange-50 rounded-2xl p-8 border-2 border-orange-300">
                  <CheckCircle className="text-orange-600 mb-4" size={48} />
                  <h3 className="text-xl font-bold mb-3">Assurance Véhicule</h3>
                  <p className="text-gray-700 mb-4">RC auto minimum + usage professionnel transport de personnes.</p>
                  <div className="text-2xl font-black text-orange-600">Obligatoire</div>
                </div>

                <div className="bg-yellow-50 rounded-2xl p-8 border-2 border-yellow-300">
                  <AlertTriangle className="text-yellow-600 mb-4" size={48} />
                  <h3 className="text-xl font-bold mb-3">Protection Passagers</h3>
                  <p className="text-gray-700 mb-4">Garantie spécifique pour clients transportés incluse dans RC Pro.</p>
                  <div className="text-2xl font-black text-yellow-600">Obligatoire</div>
                </div>
              </div>

              <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-xl">
                <p className="font-bold text-red-900 mb-2">⚠️ Sanctions sans assurance</p>
                <p className="text-gray-700">Exercer sans RC Pro = 3,750€ amende + suspension licence + retrait véhicule + responsabilité personnelle illimitée</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white border border-yellow-100">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Comparatif Assureurs Taxi 2024</h2>

              <div className="overflow-x-auto">
                <table className="w-full bg-white shadow-xl rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-yellow-500 to-yellow-700 text-white">
                    <tr>
                      <th className="p-4 text-left">Assureur</th>
                      <th className="p-4 text-center">Prix/an</th>
                      <th className="p-4 text-center">RC Pro</th>
                      <th className="p-4 text-center">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-4 font-bold">TaxiAssur</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,430€</td>
                      <td className="p-4 text-center">✓ Incluse</td>
                      <td className="p-4 text-center">⭐⭐⭐⭐⭐</td>
                    </tr>
                    <tr>
                      <td className="p-4">AXA Pro</td>
                      <td className="p-4 text-center">2,400€</td>
                      <td className="p-4 text-center">✓ Option</td>
                      <td className="p-4 text-center">⭐⭐⭐⭐</td>
                    </tr>
                    <tr>
                      <td className="p-4">Macif</td>
                      <td className="p-4 text-center">2,200€</td>
                      <td className="p-4 text-center">✓ Incluse</td>
                      <td className="p-4 text-center">⭐⭐⭐⭐</td>
                    </tr>
                    <tr>
                      <td className="p-4">MFA</td>
                      <td className="p-4 text-center">2,100€</td>
                      <td className="p-4 text-center">✓ Incluse</td>
                      <td className="p-4 text-center">⭐⭐⭐</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Questions Fréquentes</h2>

              <div className="space-y-6">
                <div className="bg-white border border-yellow-100 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3">Quelle est la meilleure assurance taxi ?</h3>
                  <p className="text-gray-700">TaxiAssur offre le meilleur rapport qualité-prix avec RC Pro incluse à partir de 1,430€/an (-35% vs marché), assistance 24/7 et souscription 100% en ligne.</p>
                </div>

                <div className="bg-white border border-yellow-100 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3">RC Pro taxi : quel montant ?</h3>
                  <p className="text-gray-700">Le montant RC Pro doit être illimité car en cas d'accident grave, les dommages peuvent atteindre plusieurs millions d'euros. Toute limitation vous expose à payer le reste personnellement.</p>
                </div>

                <div className="bg-white border border-yellow-100 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3">Puis-je assurer mon taxi chez mon assureur auto classique ?</h3>
                  <p className="text-gray-700">Non, il faut obligatoirement un contrat spécifique transport de personnes incluant RC Pro. Une assurance auto classique ne couvre pas l'activité professionnelle taxi.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="devis" className="py-16 bg-gradient-to-br from-orange-900 to-orange-800 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-8">Obtenez Votre Devis en 2 Minutes</h2>
              <EnhancedLeadForm />
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto text-center">
              <div className="grid md:grid-cols-3 gap-4">
                <Link to="/assurance-taxi" className="text-yellow-600 hover:underline">Assurance Taxi</Link>
                <Link to="/rc-professionnelle" className="text-yellow-600 hover:underline">RC Professionnelle</Link>
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

export default QuelleAssuranceTaxi;
