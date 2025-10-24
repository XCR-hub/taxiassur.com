import { Helmet } from 'react-helmet-async';
import { AlertCircle, FileText, Phone, Clock, Shield, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FormLead from '../components/FormLead';

export default function TaxisSinistres() {
  return (
    <>
      <Helmet>
        <title>Taxis Sinistrés : Comment Gérer un Sinistre | TaxiAssur</title>
        <meta name="description" content="Taxi sinistré ? Découvrez la procédure complète de déclaration de sinistre, les délais et comment obtenir rapidement une indemnisation. Assistance 24/7." />
        <meta name="keywords" content="taxis sinistrés, sinistre taxi, déclaration sinistre taxi, indemnisation taxi, accident taxi" />
        <link rel="canonical" href="https://taxiassur.com/taxis-sinistres" />
      </Helmet>

      <Header />

      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="bg-gradient-to-br from-yellow-500 to-orange-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Taxis Sinistrés : Procédure et Assistance Complète
              </h1>
              <p className="text-xl text-yellow-100 mb-8">
                Votre taxi a subi un sinistre ? Nous vous accompagnons dans toutes les démarches pour une prise en charge rapide et efficace.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#procedure" className="bg-white text-yellow-600 px-8 py-3 rounded-lg font-semibold hover:bg-yellow-50 transition">
                  Voir la procédure
                </a>
                <a href="tel:+33186653850" className="bg-yellow-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-800 transition flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Assistance 24/7
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Alerte urgence */}
        <section className="bg-red-50 border-l-4 border-red-500 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-red-900 mb-2">Sinistre en cours ? Agissez maintenant !</h2>
                <p className="text-red-800 mb-3">Appelez immédiatement notre assistance 24/7 : <a href="tel:+33186653850" className="font-bold underline">01 86 65 38 50</a></p>
                <p className="text-red-700 text-sm">Sécurisez la scène, prenez des photos, remplissez le constat amiable.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Procédure complète */}
        <section id="procedure" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-12 text-center">Procédure Complète en 6 Étapes</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Étape 1 */}
              <div className="bg-yellow-50 p-6 rounded-lg">
                <div className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">1</div>
                <h3 className="text-xl font-bold mb-3">Sécuriser les lieux</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Allumez les feux de détresse</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Placez le triangle de signalisation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Appelez les secours si nécessaire</span>
                  </li>
                </ul>
              </div>

              {/* Étape 2 */}
              <div className="bg-yellow-50 p-6 rounded-lg">
                <div className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">2</div>
                <h3 className="text-xl font-bold mb-3">Documenter le sinistre</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Prenez des photos (tous les angles)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Notez les témoins présents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Relevez les plaques d'immatriculation</span>
                  </li>
                </ul>
              </div>

              {/* Étape 3 */}
              <div className="bg-yellow-50 p-6 rounded-lg">
                <div className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">3</div>
                <h3 className="text-xl font-bold mb-3">Constat amiable</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Remplissez le constat avec l'autre conducteur</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Ne reconnaissez PAS votre responsabilité</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Signez uniquement si tout est exact</span>
                  </li>
                </ul>
              </div>

              {/* Étape 4 */}
              <div className="bg-yellow-50 p-6 rounded-lg">
                <div className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">4</div>
                <h3 className="text-xl font-bold mb-3">Déclarer à l'assurance</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Délai : 5 jours ouvrés</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Envoyez le constat amiable</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Joignez les photos et témoignages</span>
                  </li>
                </ul>
              </div>

              {/* Étape 5 */}
              <div className="bg-yellow-50 p-6 rounded-lg">
                <div className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">5</div>
                <h3 className="text-xl font-bold mb-3">Expertise</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>L'expert évalue les dégâts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Vous pouvez mandater un expert</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Rapport envoyé sous 15 jours</span>
                  </li>
                </ul>
              </div>

              {/* Étape 6 */}
              <div className="bg-yellow-50 p-6 rounded-lg">
                <div className="w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">6</div>
                <h3 className="text-xl font-bold mb-3">Indemnisation</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Proposition d'indemnisation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Paiement sous 30 jours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Véhicule de remplacement possible</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Documents nécessaires */}
        <section className="py-16 bg-white border border-yellow-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-12 text-center">Documents à Préparer</h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <FileText className="w-12 h-12 text-yellow-600 mb-4" />
                <h3 className="text-xl font-bold mb-4">Documents obligatoires</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>✓ Constat amiable rempli et signé</li>
                  <li>✓ Photos du sinistre (tous angles)</li>
                  <li>✓ Copie de votre permis de conduire</li>
                  <li>✓ Carte grise du véhicule</li>
                  <li>✓ Attestation d'assurance</li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <Shield className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-xl font-bold mb-4">Documents recommandés</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>✓ Témoignages écrits et signés</li>
                  <li>✓ Vidéos de dashcam si disponible</li>
                  <li>✓ Rapport de police (si applicable)</li>
                  <li>✓ Factures de réparations antérieures</li>
                  <li>✓ Certificat de non-gage</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Formulaire */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-800 text-white p-8 rounded-2xl text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Besoin d'aide pour votre sinistre ?</h2>
              <p className="text-xl mb-6">Nos experts vous accompagnent dans toutes vos démarches</p>
              <p className="text-yellow-100 mb-8">Assistance 24/7 • Réponse en 2 minutes • Gratuit et sans engagement</p>
            </div>

            <FormLead />
          </div>
        </section>

        {/* FAQ Sinistres */}
        <section className="py-16 bg-white border border-yellow-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-12 text-center">Questions Fréquentes sur les Sinistres</h2>

            <div className="space-y-6">
              <details className="bg-white p-6 rounded-lg shadow-md group">
                <summary className="font-bold text-lg cursor-pointer flex items-center justify-between">
                  Quel est le délai pour déclarer un sinistre ?
                  <span className="text-2xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-gray-700">
                  Vous disposez de <strong>5 jours ouvrés</strong> à compter de la date du sinistre pour le déclarer à votre assurance. Ce délai est porté à <strong>10 jours en cas de vol</strong>. Attention : un retard peut entraîner un refus de prise en charge.
                </p>
              </details>

              <details className="bg-white p-6 rounded-lg shadow-md group">
                <summary className="font-bold text-lg cursor-pointer flex items-center justify-between">
                  Puis-je continuer à travailler avec un taxi sinistré ?
                  <span className="text-2xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-gray-700">
                  Non, il est <strong>formellement interdit</strong> de circuler avec un véhicule déclaré sinistré avant l'expertise et les réparations. Cela peut entraîner un refus d'indemnisation et une annulation de votre contrat. Demandez un véhicule de remplacement à votre assurance.
                </p>
              </details>

              <details className="bg-white p-6 rounded-lg shadow-md group">
                <summary className="font-bold text-lg cursor-pointer flex items-center justify-between">
                  Comment obtenir un véhicule de remplacement ?
                  <span className="text-2xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-gray-700">
                  Si vous avez souscrit la garantie "véhicule de remplacement", contactez immédiatement votre assurance. Elle vous mettra en relation avec un loueur agréé. <strong>Durée moyenne : 30 jours</strong>, renouvelable si les réparations prennent plus de temps.
                </p>
              </details>

              <details className="bg-white p-6 rounded-lg shadow-md group">
                <summary className="font-bold text-lg cursor-pointer flex items-center justify-between">
                  Que faire si je ne suis pas d'accord avec l'expertise ?
                  <span className="text-2xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-gray-700">
                  Vous pouvez faire appel à un <strong>expert d'assuré</strong> (à vos frais, environ 300-500€). Il rédigera un contre-rapport. En cas de désaccord persistant, vous pouvez saisir le médiateur de l'assurance ou les tribunaux.
                </p>
              </details>

              <details className="bg-white p-6 rounded-lg shadow-md group">
                <summary className="font-bold text-lg cursor-pointer flex items-center justify-between">
                  Mon assurance va-t-elle augmenter après un sinistre ?
                  <span className="text-2xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-gray-700">
                  Cela dépend de votre responsabilité. En cas de sinistre <strong>responsable</strong>, votre coefficient bonus-malus augmentera de 25% (malus). Pour un sinistre <strong>non responsable</strong>, aucun impact sur votre bonus. Certains contrats offrent une "protection bonus" qui limite l'impact du premier sinistre.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
