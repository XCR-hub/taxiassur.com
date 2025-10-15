import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import LeadForm from '../components/LeadForm';
import StickyCTA from '../components/StickyCTA';
import SEOInternalLinks from '../components/SEOInternalLinks';
import UltraConversionCTA from '../components/UltraConversionCTA';
import InstantQuoteCalculator from '../components/InstantQuoteCalculator';
import { MIRROR_PAGES, generateMirrorPageContent } from '../lib/mirror-pages';
import { initBehavioralTracking } from '../lib/behavioral-tracking';
import { useAdaptiveContent } from '../lib/adaptive-content';
import { CheckCircle, Shield, Clock, TrendingDown } from 'lucide-react';

const MirrorPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { content: adaptiveContent, isReady } = useAdaptiveContent();

  // Trouver la page correspondante
  const page = MIRROR_PAGES.find(p => p.url === `/${slug}`);

  useEffect(() => {
    if (page) {
      initBehavioralTracking();
    }
  }, [page]);

  if (!page) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Page non trouvée</h1>
          <a href="/" className="btn-primary">
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  const content = generateMirrorPageContent(page);
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Assurance Taxi', url: '/assurance-taxi' },
    { name: page.title, url: page.url }
  ];

  return (
    <>
      <SEOHead
        title={page.title}
        description={page.metaDescription}
        keywords={page.keywords.join(', ')}
        canonical={page.url}
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />

        <main>
          {/* Hero Adaptatif */}
          <section className="relative py-20 bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden">
            <div className="container-max relative z-20">
              <div className="max-w-4xl mx-auto text-center">
                {isReady ? (
                  <>
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                      {adaptiveContent.hero.title}
                    </h1>
                    <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                      {adaptiveContent.hero.subtitle}
                    </p>
                    <a href="#devis" className="btn-primary text-lg px-8 py-4 inline-block">
                      {adaptiveContent.hero.cta}
                    </a>
                    <div className="mt-6">
                      <p className="text-sm text-green-400 font-semibold mb-2">
                        {adaptiveContent.trustSignal}
                      </p>
                      <p className="text-sm text-gray-400">
                        {adaptiveContent.socialProof}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                      {page.h1}
                    </h1>
                    <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                      {page.metaDescription}
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Calculateur Instantané */}
          {page.intent === 'transactional' && (
            <section className="py-12 bg-gradient-to-br from-gray-900 to-black">
              <div className="container-max max-w-2xl">
                <InstantQuoteCalculator variant="full" />
              </div>
            </section>
          )}

          {/* Contenu Principal + Navigation */}
          <section className="py-16 bg-gradient-to-br from-gray-950 via-gray-900 to-black">
            <div className="container-max">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Contenu */}
                <div className="lg:col-span-2">
                  <div className="ai-card p-8 mb-8">
                    <div className="prose prose-invert max-w-none">
                      <div className="text-lg text-gray-300 mb-6 leading-relaxed">
                        {content.intro}
                      </div>

                      {/* Avantages selon le type */}
                      <div className="grid md:grid-cols-2 gap-6 my-8">
                        <div className="bg-gray-800/50 rounded-lg p-6 border border-green-500/30">
                          <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
                          <h3 className="text-white font-bold mb-2">Économie Garantie</h3>
                          <p className="text-gray-400 text-sm">
                            Jusqu'à 40% moins cher que le tarif standard marché
                          </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-6 border border-yellow-500/30">
                          <Clock className="w-8 h-8 text-yellow-400 mb-3" />
                          <h3 className="text-white font-bold mb-2">Réponse Rapide</h3>
                          <p className="text-gray-400 text-sm">
                            Devis personnalisé en 2 minutes maximum
                          </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-6 border border-amber-500/30">
                          <Shield className="w-8 h-8 text-yellow-500 mb-3" />
                          <h3 className="text-white font-bold mb-2">Couverture Complète</h3>
                          <p className="text-gray-400 text-sm">
                            RC Pro + Tous risques + Assistance 0km inclus
                          </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-6 border border-purple-500/30">
                          <TrendingDown className="w-8 h-8 text-yellow-400 mb-3" />
                          <h3 className="text-white font-bold mb-2">Tarif Négocié</h3>
                          <p className="text-gray-400 text-sm">
                            Conditions préférentielles courtier spécialisé
                          </p>
                        </div>
                      </div>

                      {/* Contenu spécifique selon variant */}
                      {page.contentVariant === 'price_focused' && (
                        <div className="my-8">
                          <h2 className="text-2xl font-bold text-white mb-4">
                            Comment Obtenir le Prix le Plus Bas ?
                          </h2>
                          <ul className="space-y-3 text-gray-300">
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                              <span>Comparez au moins 5 assureurs différents</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                              <span>Utilisez un courtier spécialisé taxi (tarifs négociés)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                              <span>Adaptez vos garanties à votre usage réel</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                              <span>Regroupez vos contrats (auto + habitation)</span>
                            </li>
                          </ul>
                        </div>
                      )}

                      {page.contentVariant === 'urgency_focused' && (
                        <div className="my-8 bg-red-900/20 border border-red-500/30 rounded-lg p-6">
                          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <Clock className="w-6 h-6 text-red-400" />
                            Service Express 24h
                          </h2>
                          <p className="text-gray-300 mb-4">
                            Nous comprenons l'urgence. Notre service express vous garantit :
                          </p>
                          <ul className="space-y-2 text-gray-300">
                            <li>✓ Attestation provisoire sous 2h</li>
                            <li>✓ Attestation définitive sous 24h maximum</li>
                            <li>✓ Service disponible 7j/7</li>
                            <li>✓ Prise d'effet immédiate possible</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CTA Conversion */}
                  <UltraConversionCTA
                    variant="trust"
                    position="inline"
                    city={page.targetCity}
                  />
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                  <SEOInternalLinks currentUrl={page.url} variant="sidebar" />
                </div>
              </div>
            </div>
          </section>

          {/* Formulaire Lead */}
          <section id="devis" className="py-16 bg-gradient-to-br from-gray-900 to-black">
            <div className="container-max max-w-3xl">
              <LeadForm />
            </div>
          </section>
        </main>

        <Footer />
        <StickyCTA />
      </div>
    </>
  );
};

export default MirrorPage;
