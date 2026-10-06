import React, { lazy, Suspense } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import AcquisitionGuide, { AcquisitionQuestions } from '../components/AcquisitionGuide';
import { ACQUISITION_PAGES, ACQUISITION_FAQ } from '../../shared/acquisition-pages.js';
import { usePageTracking } from '../hooks/usePageTracking';

const Footer = lazy(() => import('../components/Footer'));
const StickyCTA = lazy(() => import('../components/StickyCTA'));

const SocialProof = lazy(() => import('../components/SocialProof'));
const Avantages = lazy(() => import('../components/Avantages'));
const Steps = lazy(() => import('../components/Steps'));
const InstantQuoteCalculator = lazy(() => import('../components/InstantQuoteCalculator'));
const DynamicReviews = lazy(() => import('../components/DynamicReviews'));
const InteractiveQuiz = lazy(() => import('../components/InteractiveQuiz'));
const Avis = lazy(() => import('../components/Avis'));
const NewsSection = lazy(() => import('../components/NewsSection'));
const LocalSEO = lazy(() => import('../components/LocalSEO'));
const TrustSignals = lazy(() => import('../components/TrustSignals'));
const TrustBadges = lazy(() => import('../components/TrustBadges'));
const Newsletter = lazy(() => import('../components/Newsletter'));
const SubtleConversionHelper = lazy(() => import('../components/SubtleConversionHelper'));
const UltimateConversion = lazy(() => import('../components/UltimateConversion'));
const LeadMagnetSection = lazy(() => import('../components/LeadMagnetSection'));

const SectionSkeleton = () => (
  <div className="py-16">
    <div className="container-max">
      <div className="h-8 bg-gray-800/30 rounded w-1/3 mx-auto mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-800/20 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

const Home: React.FC = () => {
  usePageTracking();

  return (
    <>
      <SEOHead
        title={ACQUISITION_PAGES['/'].title}
        description={ACQUISITION_PAGES['/'].description}
        keywords="assurance taxi, insurance for taxi, assurance taxi pas cher, taxi insurance cheap, courtier assurance taxi, devis assurance taxi gratuit, prix assurance taxi, taxi insurance cost, insurance for taxi drivers, rc professionnelle taxi, assurance taxi professionnel, insurance for taxi company, taxi insurance near me, how much is taxi insurance, assurance taxi france, assurance taxi paris, assurance taxi lyon, assurance taxi marseille"
        canonical="/"
      />
      <JsonLd type="website" />
      <JsonLd type="organization" />
      <JsonLd type="local-business" />
      <JsonLd type="service" />
      <JsonLd type="speakable" data={{ name: ACQUISITION_PAGES['/'].title, url: '/' }} />
      <JsonLd type="breadcrumb" data={[
        { name: 'Accueil', url: '/' }
      ]} />
      <JsonLd type="faq" data={ACQUISITION_FAQ} />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        <main id="main-content" tabIndex={-1}>
          <Hero />
          <AcquisitionGuide pathname="/" />

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <SocialProof />
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <Avantages />
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <Steps />
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <AcquisitionQuestions />
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <InstantQuoteCalculator />
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <DynamicReviews />
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <LeadMagnetSection sourcePage="homepage" />
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <section className="py-12 sm:py-16 bg-gradient-to-br from-gray-950 via-gray-900 to-black">
                <div className="container mx-auto px-4">
                  <div className="text-center mb-8 sm:mb-12">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-3 sm:mb-4 text-white">Testez Vos Connaissances !</h2>
                    <p className="text-base sm:text-xl text-gray-300 font-semibold">5 questions pour devenir expert assurance taxi</p>
                  </div>
                  <InteractiveQuiz />
                </div>
              </section>
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <Avis />
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <NewsSection limit={3} showTitle={true} />
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <LocalSEO />
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <TrustSignals />
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <section className="py-12 sm:py-16 bg-white border border-yellow-100">
                <div className="container-max">
                  <TrustBadges variant="compact" showLogos={false} />
                  <div className="text-center mt-6 sm:mt-8">
                    <a
                      href="/confiance-certifications"
                      className="inline-block bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-gray-900 font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
                    >
                      En savoir plus sur nos certifications
                    </a>
                  </div>
                </div>
              </section>
            </Suspense>
          </div>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <Newsletter />
            </Suspense>
          </div>

          <Suspense fallback={null}>
            <SubtleConversionHelper />
          </Suspense>

          <div className="section-below-fold">
            <Suspense fallback={<SectionSkeleton />}>
              <UltimateConversion />
            </Suspense>
          </div>
        </main>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
        <Suspense fallback={null}>
          <StickyCTA />
        </Suspense>
      </div>
    </>
  );
};

export default Home;
