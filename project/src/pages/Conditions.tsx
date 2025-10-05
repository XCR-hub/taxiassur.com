import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Conditions: React.FC = () => {
  useEffect(() => {
    document.title = 'Conditions Générales | TaxiAssur.com';
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="section-padding">
        <div className="container-max">
          <div className="max-w-4xl mx-auto card-premium">
            <h1 className="text-3xl font-bold text-gradient mb-8">Conditions Générales</h1>
            
            <div className="prose max-w-none space-y-8 text-gray-300">
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Objet</h2>
                <p className="leading-relaxed">
                  Les présentes conditions générales régissent l'utilisation du site TaxiAssur.com 
                  et les services de courtage en assurance proposés par XCR.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Services proposés</h2>
                <p className="leading-relaxed">
                  TaxiAssur.com propose les services suivants :
                </p>
                <ul className="list-disc list-inside space-y-2 mt-4">
                  <li>Courtage en assurance taxi</li>
                  <li>Responsabilité civile professionnelle</li>
                  <li>Assurance flotte de véhicules</li>
                  <li>Conseil personnalisé</li>
                  <li>Gestion des sinistres</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Utilisation du site</h2>
                <p className="leading-relaxed">
                  L'utilisation du site TaxiAssur.com implique l'acceptation pleine et entière 
                  des présentes conditions générales. L'utilisateur s'engage à utiliser le site 
                  conformément à sa destination et aux lois en vigueur.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Demande de devis</h2>
                <p className="leading-relaxed">
                  Les devis proposés sont gratuits et sans engagement. Ils sont établis sur la base 
                  des informations communiquées par le demandeur. Toute fausse déclaration peut 
                  entraîner la nullité du contrat d'assurance.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Rôle du courtier</h2>
                <p className="leading-relaxed">
                  En qualité de courtier, TaxiAssur.com agit pour le compte de ses clients. 
                  Nous sélectionnons les meilleures offres du marché et négocions les conditions 
                  les plus avantageuses.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Rémunération</h2>
                <p className="leading-relaxed">
                  Notre rémunération provient des commissions versées par les compagnies d'assurance. 
                  Aucun frais supplémentaire n'est facturé au client.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Responsabilité</h2>
                <p className="leading-relaxed">
                  TaxiAssur.com s'engage à apporter le plus grand soin dans l'exécution de ses missions. 
                  Notre responsabilité professionnelle est couverte par une assurance adaptée.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Protection des données</h2>
                <p className="leading-relaxed">
                  Le traitement des données personnelles est effectué conformément à notre 
                  politique de confidentialité et au Règlement Général sur la Protection des Données (RGPD).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Réclamations</h2>
                <p className="leading-relaxed">
                  En cas de réclamation, vous pouvez nous contacter par email à team@taxiassur.com 
                  ou par téléphone au 01 80 85 57 86. Si aucune solution amiable n'est trouvée, 
                  vous pouvez saisir le médiateur de l'assurance.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Droit applicable</h2>
                <p className="leading-relaxed">
                  Les présentes conditions générales sont régies par le droit français. 
                  Tout litige sera soumis aux tribunaux compétents.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Modifications</h2>
                <p className="leading-relaxed">
                  TaxiAssur.com se réserve le droit de modifier les présentes conditions générales 
                  à tout moment. Les modifications entrent en vigueur dès leur publication sur le site.
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

export default Conditions;