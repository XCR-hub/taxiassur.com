import React from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertCircle, Clock, Phone, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceTaxiUrgence: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Urgente : Attestation en 10 Minutes | TaxiAssur</title>
        <meta name="description" content="Besoin assurance taxi urgent ? Résilié, suspendu, contrôle demain ? Attestation immédiate en 10 min. Roulez aujourd'hui." />
        <link rel="canonical" href="https://www.taxiassur.com/assurance-taxi-urgence" />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-white">
        <section className="bg-gradient-to-br from-red-900 via-red-800 to-orange-900 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center bg-yellow-400 text-red-900 px-6 py-3 rounded-full mb-6 animate-pulse">
                <AlertCircle size={24} className="mr-2" />
                <span className="font-bold text-lg">SITUATION URGENTE</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                Assurance Taxi<br />
                <span className="text-yellow-400">URGENTE</span>
              </h1>
              <p className="text-2xl mb-8">Attestation en 10 Minutes • Roulez Aujourd'hui</p>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl p-6">
                  <div className="text-4xl font-black text-yellow-400 mb-2">10 min</div>
                  <div className="text-sm">Attestation par email</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl p-6">
                  <div className="text-4xl font-black text-yellow-400 mb-2">7j/7</div>
                  <div className="text-sm">Service disponible</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl p-6">
                  <div className="text-4xl font-black text-yellow-400 mb-2">24h/24</div>
                  <div className="text-sm">Souscription en ligne</div>
                </div>
              </div>

              <a
                href="#devis-urgent"
                className="inline-block bg-yellow-400 hover:bg-yellow-500 text-red-900 font-black text-xl px-12 py-5 rounded-xl transition-all transform hover:scale-105 shadow-2xl"
              >
                Attestation Immédiate →
              </a>
              <p className="mt-4 text-yellow-200 text-sm">Aucun engagement • Sans frais cachés</p>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Situations d'Urgence Taxi</h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-xl">
                  <AlertCircle className="text-red-600 mb-4" size={48} />
                  <h3 className="text-xl font-bold mb-3">Assurance Résiliée</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ Non-paiement cotisations</li>
                    <li>✓ Sinistres multiples</li>
                    <li>✓ Fausse déclaration</li>
                    <li>✓ Retrait permis</li>
                  </ul>
                  <div className="mt-4 font-bold text-red-900">
                    → Solution : Réassurance immédiate possible
                  </div>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-600 p-6 rounded-r-xl">
                  <Clock className="text-orange-600 mb-4" size={48} />
                  <h3 className="text-xl font-bold mb-3">Contrôle Imminent</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ Contrôle préfecture demain</li>
                    <li>✓ Renouvellement carte pro</li>
                    <li>✓ Vente véhicule urgent</li>
                    <li>✓ Début activité immédiat</li>
                  </ul>
                  <div className="mt-4 font-bold text-orange-900">
                    → Solution : Attestation 10 minutes
                  </div>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-600 p-6 rounded-r-xl">
                  <CheckCircle className="text-yellow-600 mb-4" size={48} />
                  <h3 className="text-xl font-bold mb-3">Changement Assureur</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ Tarif trop élevé</li>
                    <li>✓ Service médiocre</li>
                    <li>✓ Résiliation par assureur</li>
                    <li>✓ Échéance proche</li>
                  </ul>
                  <div className="mt-4 font-bold text-yellow-900">
                    → Solution : Économisez -35% immédiat
                  </div>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-xl">
                  <Phone className="text-yellow-600 mb-4" size={48} />
                  <h3 className="text-xl font-bold mb-3">Profils Difficiles</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ Jeune conducteur</li>
                    <li>✓ Sinistres récents</li>
                    <li>✓ Malus important</li>
                    <li>✓ Activité VTC mixte</li>
                  </ul>
                  <div className="mt-4 font-bold text-orange-900">
                    → Solution : Acceptons tous profils
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">
                Processus Express : 3 Étapes, 10 Minutes
              </h2>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-xl p-8 flex items-start">
                  <div className="bg-yellow-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-black text-xl mr-6 flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3">Formulaire Express (2 min)</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Infos véhicule (carte grise)</li>
                      <li>• Carte professionnelle taxi</li>
                      <li>• Permis conduire</li>
                      <li>• Coordonnées</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8 flex items-start">
                  <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-black text-xl mr-6 flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3">Validation Immédiate (3 min)</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Vérification documents automatique</li>
                      <li>• Calcul tarif personnalisé</li>
                      <li>• Paiement sécurisé en ligne</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8 flex items-start">
                  <div className="bg-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-black text-xl mr-6 flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3">Attestation Email (5 min)</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• <strong>Attestation provisoire PDF par email</strong></li>
                      <li>• Valable immédiatement pour circuler</li>
                      <li>• Carte verte physique reçue sous 48h</li>
                      <li>• Vous pouvez travailler MAINTENANT</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-red-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <AlertCircle className="mx-auto mb-6" size={64} />
              <h2 className="text-3xl font-black mb-6">
                ATTENTION : Rouler Sans Assurance = Sanctions Lourdes
              </h2>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl p-6">
                  <div className="text-4xl font-black text-yellow-400 mb-2">3,750€</div>
                  <div className="text-sm">Amende immédiate</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl p-6">
                  <div className="text-4xl font-black text-yellow-400 mb-2">6 mois</div>
                  <div className="text-sm">Suspension licence</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl p-6">
                  <div className="text-4xl font-black text-yellow-400 mb-2">∞€</div>
                  <div className="text-sm">Responsabilité illimitée</div>
                </div>
              </div>

              <p className="text-xl text-yellow-200 font-bold">
                Ne prenez AUCUN risque. Obtenez votre attestation MAINTENANT.
              </p>
            </div>
          </div>
        </section>

        <section id="devis-urgent" className="py-16 bg-gradient-to-br from-orange-900 to-orange-800 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black mb-4">
                  Obtenez Votre Attestation Urgente Maintenant
                </h2>
                <p className="text-xl">Souscription 5 min • Attestation email 10 min • Roulez aujourd'hui</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <EnhancedLeadForm />
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border-2 border-yellow-400">
                    <div className="flex items-center mb-3">
                      <Clock className="text-yellow-400 mr-3" size={32} />
                      <div className="text-2xl font-black">Service 24/7</div>
                    </div>
                    <p>Souscrivez même le dimanche à 3h du matin</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border-2 border-green-400">
                    <div className="flex items-center mb-3">
                      <CheckCircle className="text-green-400 mr-3" size={32} />
                      <div className="text-2xl font-black">Tous Profils</div>
                    </div>
                    <p>Résiliés, malussés, jeunes conducteurs acceptés</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border-2 border-orange-400">
                    <div className="flex items-center mb-3">
                      <Phone className="text-yellow-400 mr-3" size={32} />
                      <div className="text-2xl font-black">Support Direct</div>
                    </div>
                    <p>Conseiller disponible si besoin assistance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Témoignages Urgence</h2>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center mb-3">
                    <div className="bg-yellow-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold mr-3">
                      KM
                    </div>
                    <div>
                      <div className="font-bold">Karim M. - Paris</div>
                      <div className="text-yellow-500">⭐⭐⭐⭐⭐</div>
                    </div>
                  </div>
                  <p className="text-gray-700 italic">
                    "Résilié par mon assureur un vendredi soir pour non-paiement. Contrôle préfecture lundi matin.
                    TaxiAssur m'a assuré en 15 minutes samedi. Attestation reçue par email. J'ai pu passer mon contrôle.
                    Service INCROYABLE !"
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center mb-3">
                    <div className="bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold mr-3">
                      ST
                    </div>
                    <div>
                      <div className="font-bold">Sophie T. - Lyon</div>
                      <div className="text-yellow-500">⭐⭐⭐⭐⭐</div>
                    </div>
                  </div>
                  <p className="text-gray-700 italic">
                    "Début activité taxi urgent, ancien assureur demandait 10 jours délai. TaxiAssur = attestation
                    en 8 minutes chrono ! Prix -40% en plus. Je recommande à tous mes collègues."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default AssuranceTaxiUrgence;
