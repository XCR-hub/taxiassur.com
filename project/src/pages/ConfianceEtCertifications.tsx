import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import TrustBadges from '../components/TrustBadges';

export default function ConfianceEtCertifications() {
  return (
    <>
      <SEOHead
        title="Confiance et Certifications | Courtier Certifié CSCA, EDI, CGPA"
        description="TaxiAssur est un courtier professionnel certifié : adhérent CSCA, EDI Courtage, EDI Signature, CRM EXCALIBUR, RC Pro CGPA, conformité LCB-FT totale."
        keywords="courtier certifié, CSCA, EDI Courtage, EDI Signature, CGPA, EXCALIBUR, LCB-FT, gel avoirs, PPE, conformité courtage"
      />
      <Header />

      <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-gray-900 font-semibold py-20">
          <div className="container-max text-center">
            <h1 className="text-5xl font-bold mb-6">
              🏆 Votre Confiance, Notre Engagement
            </h1>
            <p className="text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Un courtier professionnel, certifié et assuré. Membre des principales
              organisations professionnelles du courtage d'assurance en France.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <div className="bg-gray-900 text-white px-6 py-3 rounded-full text-lg font-semibold">
                ✅ Certifié ORIAS
              </div>
              <div className="bg-gray-900 text-white px-6 py-3 rounded-full text-lg font-semibold">
                ✅ Assuré RC Pro
              </div>
              <div className="bg-gray-900 text-white px-6 py-3 rounded-full text-lg font-semibold">
                ✅ Conforme LCB-FT
              </div>
            </div>
          </div>
        </section>

        {/* Trust Badges - Section complète */}
        <section className="container-max py-16">
          <TrustBadges variant="full" showLogos={true} />
        </section>

        {/* Section détaillée - Adhésions professionnelles */}
        <section className="bg-gradient-to-br from-orange-50 to-yellow-50 py-16">
          <div className="container-max">
            <h2 className="text-4xl font-bold text-center text-gray-900 font-semibold mb-12">
              🤝 Nos Adhésions Professionnelles
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* CSCA */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-yellow-200">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-yellow-600">CSCA</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 font-semibold">
                      Chambre Syndicale du Courtage d'Assurance
                    </h3>
                    <p className="text-sm text-yellow-600 font-medium">Adhérent Actif</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  La CSCA représente les courtiers d'assurance français depuis 1937.
                  Notre adhésion garantit le respect d'un code de déontologie strict et
                  l'accès à une formation continue de qualité.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✅ Respect du code de déontologie CSCA</li>
                  <li>✅ Formation professionnelle continue</li>
                  <li>✅ Veille réglementaire permanente</li>
                  <li>✅ Réseau de 3000+ courtiers professionnels</li>
                </ul>
              </div>

              {/* EDI Courtage */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-yellow-200">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-yellow-600">EDI</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 font-semibold">
                      EDI Courtage + EDI Messages + EDI Signature
                    </h3>
                    <p className="text-sm text-yellow-600 font-medium">Partenaire Intégré</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  EDI Courtage est LA plateforme d'échanges dématérialisés entre courtiers
                  et assureurs. Plus de 4000 courtiers et 50 compagnies connectés.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✅ EDI Courtage - Échanges électroniques avec assureurs</li>
                  <li>✅ EDI Messages - Communication sécurisée instantanée</li>
                  <li>✅ EDI Signature - Signature électronique certifiée eIDAS</li>
                  <li>✅ Traitement ultra-rapide de vos demandes</li>
                </ul>
              </div>

              {/* EXCALIBUR */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-cyan-200">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl font-bold text-cyan-600">EXCALIBUR</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 font-semibold">
                      CRM Spécialisé Assurances
                    </h3>
                    <p className="text-sm text-cyan-600 font-medium">Logiciel Professionnel</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  EXCALIBUR est le CRM de référence pour les courtiers d'assurance.
                  Gestion complète des contrats, sinistres, échéances et relation client.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✅ Gestion centralisée de tous vos contrats</li>
                  <li>✅ Suivi des échéances et renouvellements</li>
                  <li>✅ Historique complet de la relation client</li>
                  <li>✅ Conformité réglementaire garantie</li>
                </ul>
              </div>

              {/* CGPA */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-green-200">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-green-600">CGPA</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 font-semibold">
                      RC Professionnelle + Caisse de Garantie
                    </h3>
                    <p className="text-sm text-green-600 font-medium">Protection Active</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  La CGPA assure notre Responsabilité Civile Professionnelle et gère
                  notre adhésion à la Caisse de Garantie obligatoire.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✅ RC Pro courtier : garanties jusqu'à 3M€</li>
                  <li>✅ Caisse de Garantie : protection de vos fonds</li>
                  <li>✅ Couverture complète erreurs et omissions</li>
                  <li>✅ Attestation valide et à jour</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section LCB-FT */}
        <section className="container-max py-16">
          <div className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 rounded-3xl p-12 border-2 border-orange-200">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 font-semibold mb-4">
                  🛡️ Conformité Totale LCB-FT
                </h2>
                <p className="text-xl text-gray-700">
                  Lutte Contre le Blanchiment et le Financement du Terrorisme
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 mb-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 font-semibold mb-6">
                  Nos Obligations et Contrôles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
                    <div className="text-4xl mb-3">🔒</div>
                    <h4 className="font-bold text-gray-900 font-semibold mb-2">Gel des Avoirs</h4>
                    <p className="text-sm text-gray-600">
                      Vérification automatique contre les listes de sanctions
                      internationales (ONU, UE, OFAC)
                    </p>
                  </div>

                  <div className="text-center p-6 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="text-4xl mb-3">👥</div>
                    <h4 className="font-bold text-gray-900 font-semibold mb-2">Personnes Politiquement Exposées</h4>
                    <p className="text-sm text-gray-600">
                      Contrôle PPE selon directives européennes.
                      Vigilance renforcée obligatoire
                    </p>
                  </div>

                  <div className="text-center p-6 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="text-4xl mb-3">📋</div>
                    <h4 className="font-bold text-gray-900 font-semibold mb-2">Registre des Élus</h4>
                    <p className="text-sm text-gray-600">
                      Surveillance des mandats électifs locaux et nationaux
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 font-semibold mb-4">
                  📝 Nos Engagements
                </h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Vérification systématique de l'identité de tous nos clients</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Contrôle automatique contre les listes de sanctions avant toute souscription</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Vigilance renforcée pour les personnes politiquement exposées</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Conservation des documents justificatifs pendant 5 ans</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Déclaration TRACFIN des opérations suspectes si nécessaire</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Formation continue de nos équipes aux obligations LCB-FT</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Service résiliation */}
        <section className="bg-gradient-to-br from-orange-50 to-red-50 py-16">
          <div className="container-max">
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-white rounded-3xl p-12 shadow-2xl border-2 border-orange-200">
                <div className="text-6xl mb-6">🚀</div>
                <h2 className="text-4xl font-bold text-gray-900 font-semibold mb-6">
                  Service de Résiliation Simplifié
                </h2>
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <span className="text-3xl font-bold text-orange-600">jeresiliemoncontrat.com</span>
                </div>
                <p className="text-xl text-gray-700 leading-relaxed mb-8">
                  Nous utilisons la plateforme <strong>jeresiliemoncontrat.com</strong> pour
                  simplifier vos résiliations d'assurance. Changez d'assureur en toute sérénité,
                  nous nous occupons de tout !
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
                    <div className="text-2xl mb-3">📧</div>
                    <h4 className="font-bold text-gray-900 font-semibold mb-2">Résiliation Automatique</h4>
                    <p className="text-sm text-gray-600">
                      Nous envoyons votre lettre de résiliation à votre ancien assureur
                    </p>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
                    <div className="text-2xl mb-3">⏱️</div>
                    <h4 className="font-bold text-gray-900 font-semibold mb-2">Gain de Temps</h4>
                    <p className="text-sm text-gray-600">
                      Plus besoin d'envoyer votre recommandé vous-même
                    </p>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
                    <div className="text-2xl mb-3">✅</div>
                    <h4 className="font-bold text-gray-900 font-semibold mb-2">Suivi Complet</h4>
                    <p className="text-sm text-gray-600">
                      Confirmation de la résiliation et attestation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="container-max py-16">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-12 text-center text-gray-900 font-semibold shadow-2xl">
            <h2 className="text-4xl font-bold mb-6">
              Prêt à Travailler avec un Courtier de Confiance ?
            </h2>
            <p className="text-xl mb-8 opacity-95 max-w-2xl mx-auto">
              Profitez de notre expertise, de nos certifications et de notre engagement
              pour obtenir la meilleure assurance taxi au meilleur prix.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/devis"
                className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-black transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Demander un Devis Gratuit
              </a>
              <a
                href="/contact"
                className="bg-white text-gray-900 font-semibold px-8 py-4 rounded-xl font-bold text-lg hover:bg-gradient-to-br from-white to-gray-50 transition-all border-2 border-gray-900"
              >
                Nous Contacter
              </a>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
