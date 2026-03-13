import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FaqList from '../components/FaqList';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import AITaxiBackground from '../components/AITaxiBackground';
import StickyCTA from '../components/StickyCTA';
import { getFaqEntries } from '../lib/content';

const FAQ: React.FC = () => {
  // Static FAQs for immediate structured data (mainEntity field for Google)
  const staticFaqs = [
    {
      question: "Combien coûte une assurance taxi avec TaxiAssur ?",
      answer: "Nos tarifs négociés vous font économiser jusqu'à 35% vs assureurs classiques. Prix selon zone, expérience, véhicule. Moyenne clients : 890-1800€/an au lieu de 1200-2500€. Demandez votre devis personnalisé gratuit !"
    },
    {
      question: "Quelles garanties sont incluses dans l'assurance taxi TaxiAssur ?",
      answer: "RC Pro obligatoire, protection conducteur, dommages collision, vol incendie, bris de glace, assistance 0km, protection juridique, garantie contenu véhicule. Toutes les garanties essentielles en standard."
    },
    {
      question: "TaxiAssur couvre-t-il toute la France ?",
      answer: "Oui ! Notre réseau de partenaires assureurs couvre l'ensemble du territoire français. Paris, Lyon, Marseille, Toulouse, Nice, Bordeaux... Partout en France métropolitaine et DOM-TOM."
    },
    {
      question: "Quel est le délai pour recevoir mon attestation d'assurance taxi ?",
      answer: "Attestation d'assurance émise immédiatement par email après validation du dossier. Envoi postal sous 48h. Effet de garantie : le jour même ou date de votre choix."
    },
    {
      question: "Y a-t-il des frais cachés avec TaxiAssur ?",
      answer: "Non ! Tarifs transparents sans surprises. Pas de frais de dossier, pas de frais de modification, devis 100% gratuit. Le prix annoncé est le prix final, garantie satisfait ou remboursé."
    },
    {
      question: "Quels documents sont nécessaires pour souscrire une assurance taxi ?",
      answer: "Carte grise du véhicule, permis de conduire valide, carte professionnelle taxi ou VTC en cours de validité, relevé d'information de votre ancien assureur si vous en aviez un."
    },
    {
      question: "Comment résilier mon ancienne assurance taxi ?",
      answer: "TaxiAssur s'occupe de tout ! Nous gérons la résiliation de votre ancien contrat selon la loi Hamon (après 1 an) ou échéance annuelle. Vous n'avez rien à faire, nous nous chargeons des démarches administratives."
    },
    {
      question: "Que faire en cas de sinistre avec mon taxi assuré chez TaxiAssur ?",
      answer: "1) Appelez immédiatement le 01 80 85 57 86 (24h/7j). 2) Remplissez le constat amiable. 3) Envoyez-nous les documents sous 5 jours. 4) Notre expert traite votre dossier rapidement. Assistance et véhicule de remplacement disponibles."
    }
  ];

  const [faqs, setFaqs] = React.useState(staticFaqs);
  const [faqCount, setFaqCount] = React.useState(50);

  React.useEffect(() => {
    const loadFaqs = async () => {
      const faqData = await getFaqEntries();
      if (faqData && faqData.length > 0) {
        setFaqs(faqData);
        setFaqCount(faqData.length);
      }
    };
    loadFaqs();
  }, []);

  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'FAQ', url: '/faq' }
  ];

  return (
    <>
      <SEOHead
        title="FAQ Assurance Taxi - Meilleure Assurance Taxi Pas Chere France | Questions Expert | TaxiAssur"
        description="❓ FAQ assurance taxi TaxiAssur : meilleure assurance taxi pas chere France ✓ Comparatif prix conseils ✓ Best cheap taxi insurance France ✓ Taxi insurance tips pricing ✓ Reponses expert ✓ Tarifs detailles ✓ Garanties expliquees"
        canonical="/faq"
        keywords="meilleure assurance taxi pas chere France, assurance taxi comparatif prix conseils, best cheap taxi insurance France, taxi insurance tips pricing France, FAQ assurance taxi, questions frequentes taxi, aide assurance taxi, guide assurance taxi, reponses expert taxi, tarifs assurance taxi, garanties taxi"
      />
      <JsonLd type="faq" data={faqs} />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-20 overflow-hidden">
            <AITaxiBackground section="hero" intensity="medium" />
            <div className="container-max">
              <div className="max-w-5xl mx-auto text-center relative z-20">
                <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
                  Questions <span className="text-gradient">Fréquentes</span>
                </h1>
                <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                  ❓ <strong className="text-yellow-400">Trouvez rapidement les réponses</strong> à toutes vos questions sur 
                  <strong className="text-yellow-500">l'assurance taxi</strong> avec nos 
                  <strong className="text-green-400">experts TaxiAssur</strong>. Guide complet et conseils pro.
                </p>
                
                <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-8">
                  <div className="ai-card p-4 hover:shadow-yellow-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">{faqCount}+</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Questions</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-green-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-green-400 drop-shadow-lg">Expert</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Réponses</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-yellow-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">24h/7</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Content */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              <div className="max-w-4xl mx-auto">
                <FaqList showSearch showFilters />
              </div>
            </div>
          </section>

          {/* Contact CTA */}
          <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900">
            <div className="container-max">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  Une Question Spécifique ?
                </h2>
                <p className="text-gray-200 mb-8 text-lg drop-shadow-md">
                  Nos experts TaxiAssur sont disponibles pour répondre à toutes vos questions personnalisées.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="tel:0180855786" 
                    className="btn-primary"
                  >
                    📞 01 80 85 57 86
                  </a>
                  <a 
                    href="mailto:team@taxiassur.com" 
                    className="btn-outline"
                  >
                    📧 team@taxiassur.com
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
        <StickyCTA />
      </div>
    </>
  );
};

export default FAQ;