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
  const [faqs, setFaqs] = React.useState([]);
  const [faqCount, setFaqCount] = React.useState(50);

  React.useEffect(() => {
    const loadFaqs = async () => {
      const faqData = await getFaqEntries();
      setFaqs(faqData);
      setFaqCount(faqData.length);
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
        title="FAQ Assurance Taxi - Questions Fréquentes Expert | TaxiAssur"
        description="❓ FAQ assurance taxi TaxiAssur : réponses expert ✓ Tarifs détaillés ✓ Garanties expliquées ✓ Démarches simplifiées ✓ Documents requis ✓ Conseils pro ✓ Guide complet"
        canonical="/faq"
        keywords="FAQ assurance taxi, questions fréquentes taxi, aide assurance taxi, guide assurance taxi, réponses expert taxi, tarifs assurance taxi, garanties taxi, démarches taxi"
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
                  ❓ <strong className="text-blue-400">Trouvez rapidement les réponses</strong> à toutes vos questions sur 
                  <strong className="text-amber-400">l'assurance taxi</strong> avec nos 
                  <strong className="text-green-400">experts TaxiAssur</strong>. Guide complet et conseils pro.
                </p>
                
                <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-8">
                  <div className="ai-card p-4 hover:shadow-blue-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-blue-400 drop-shadow-lg">{faqCount}+</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Questions</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-green-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-green-400 drop-shadow-lg">Expert</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Réponses</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-purple-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-purple-400 drop-shadow-lg">24h/7</div>
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