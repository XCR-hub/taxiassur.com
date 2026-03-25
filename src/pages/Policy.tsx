import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';

const Policy: React.FC = () => {
  return (
    <div className="min-h-screen bg-black">
      <Seo
        title="Politique de Confidentialité"
        description="Politique de confidentialité de TaxiAssur.com - Traitement des données personnelles, droits RGPD, cookies et protection de vos informations."
        canonical="/policy"
      />
      <Header />
      <main className="section-padding">
        <div className="container-max">
          <div className="max-w-4xl mx-auto card-premium">
            <h1 className="text-3xl font-bold text-gradient mb-8">Politique de Confidentialité</h1>
            
            <div className="prose max-w-none space-y-8 text-gray-300">
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Collecte des données</h2>
                <p className="leading-relaxed">
                  TaxiAssur.com collecte les données personnelles que vous nous communiquez volontairement 
                  via notre formulaire de demande de devis : nom, prénom, email, téléphone, code postal.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Finalité du traitement</h2>
                <p className="leading-relaxed">
                  Vos données personnelles sont utilisées exclusivement pour :
                </p>
                <ul className="list-disc list-inside space-y-2 mt-4">
                  <li>Établir votre devis d'assurance personnalisé</li>
                  <li>Vous recontacter dans le cadre de votre demande</li>
                  <li>Réaliser des études statistiques anonymes</li>
                  <li>Respecter nos obligations légales et réglementaires</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Base légale</h2>
                <p className="leading-relaxed">
                  Le traitement de vos données repose sur votre consentement explicite lors de la 
                  soumission du formulaire et sur notre intérêt légitime à répondre à votre demande 
                  de devis d'assurance.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Conservation des données</h2>
                <p className="leading-relaxed">
                  Vos données sont conservées pendant une durée maximale de 3 ans à compter de votre 
                  dernière interaction avec nos services, sauf obligation légale contraire.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Partage des données</h2>
                <p className="leading-relaxed">
                  Vos données peuvent être transmises à nos partenaires assureurs uniquement dans 
                  le cadre de l'établissement de votre devis. Nous ne vendons jamais vos données 
                  à des tiers.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Vos droits</h2>
                <p className="leading-relaxed">
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="list-disc list-inside space-y-2 mt-4">
                  <li>Droit d'accès à vos données personnelles</li>
                  <li>Droit de rectification en cas d'inexactitude</li>
                  <li>Droit d'effacement ("droit à l'oubli")</li>
                  <li>Droit à la limitation du traitement</li>
                  <li>Droit de portabilité de vos données</li>
                  <li>Droit d'opposition au traitement</li>
                  <li>Droit de retirer votre consentement</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Exercer vos droits</h2>
                <p className="leading-relaxed">
                  Pour exercer vos droits ou pour toute question relative au traitement de vos 
                  données personnelles, vous pouvez nous contacter :
                </p>
                <ul className="list-disc list-inside space-y-2 mt-4">
                  <li>Par email : team@taxiassur.com</li>
                  <li>Par téléphone : 01 80 85 57 86</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Réclamation</h2>
                <p className="leading-relaxed">
                  Si vous estimez que le traitement de vos données personnelles ne respecte pas 
                  la réglementation, vous avez la possibilité d'introduire une réclamation auprès 
                  de la CNIL (Commission Nationale de l'Informatique et des Libertés).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Cookies</h2>
                <p className="leading-relaxed">
                  Notre site utilise des cookies techniques nécessaires à son fonctionnement. 
                  Aucun cookie publicitaire ou de tracking n'est utilisé sans votre consentement 
                  préalable.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Modifications</h2>
                <p className="leading-relaxed">
                  Cette politique de confidentialité peut être modifiée. La version en vigueur 
                  est celle publiée sur notre site web. Dernière mise à jour : Janvier 2025.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Policy;