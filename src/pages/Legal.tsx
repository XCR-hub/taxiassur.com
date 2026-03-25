import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';

const Legal: React.FC = () => {
  return (
    <div className="min-h-screen bg-black">
      <Seo
        title="Mentions Légales"
        description="Mentions légales du site TaxiAssur.com - Courtier en assurance taxi. Informations sur l'éditeur, l'hébergement et les conditions d'utilisation."
        canonical="/legal"
      />
      <Header />
      <main className="section-padding">
        <div className="container-max">
          <div className="max-w-4xl mx-auto card-premium">
            <h1 className="text-3xl font-bold text-gradient mb-8">Mentions Légales</h1>
            
            <div className="prose max-w-none space-y-8 text-gray-300">
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Informations générales</h2>
                <p className="leading-relaxed">
                  Le site web TaxiAssur.com est édité par XCR (Excellence Coverage Risks), 
                  société spécialisée dans le courtage en assurance.
                </p>
                <p className="leading-relaxed">
                  Siège social : Melun, France<br />
                  Téléphone : 01 80 85 57 86<br />
                  Email : team@taxiassur.com
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Activité de courtage en assurance</h2>
                <p className="leading-relaxed">
                  TaxiAssur.com est un courtier en assurance immatriculé à l'ORIAS (Organisme pour 
                  le Registre des Intermédiaires en Assurance) sous le numéro 11 061 425.
                </p>
                <p className="leading-relaxed">
                  Vous pouvez vérifier notre immatriculation sur le site www.orias.fr
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Directeur de publication</h2>
                <p className="leading-relaxed">
                  Le directeur de la publication est le représentant légal de XCR.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Hébergement</h2>
                <p className="leading-relaxed">
                  Ce site est hébergé par un prestataire technique professionnel.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Propriété intellectuelle</h2>
                <p className="leading-relaxed">
                  L'ensemble du contenu de ce site (textes, images, vidéos, etc.) est protégé par 
                  les droits de propriété intellectuelle. Toute reproduction, même partielle, est 
                  interdite sans autorisation préalable.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Responsabilité</h2>
                <p className="leading-relaxed">
                  Les informations présentes sur ce site sont données à titre indicatif et peuvent 
                  évoluer. TaxiAssur.com ne peut être tenu responsable de l'utilisation qui en est faite.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">Droit applicable</h2>
                <p className="leading-relaxed">
                  Les présentes mentions légales sont régies par le droit français. En cas de litige, 
                  les tribunaux français sont seuls compétents.
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

export default Legal;