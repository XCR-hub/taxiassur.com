import React, { lazy, Suspense } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Hero from '../components/Hero';
import StickyCTA from '../components/StickyCTA';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import { usePageTracking } from '../hooks/usePageTracking';

const SocialProof = lazy(() => import('../components/SocialProof'));
const Avantages = lazy(() => import('../components/Avantages'));
const Steps = lazy(() => import('../components/Steps'));
const FAQ = lazy(() => import('../components/FAQ'));
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
        title="Assurance Taxi Pas Cher - Devis Gratuit 2 min | TaxiAssur Courtier ORIAS"
        description="ASSURANCE TAXI PAS CHER : Devis GRATUIT 2 min. Economisez 35% - RC Pro incluse - Courtier ORIAS - Reponse 15min - Tarifs negocies - Service expert taxi"
        keywords="assurance taxi, insurance for taxi, assurance taxi pas cher, taxi insurance cheap, courtier assurance taxi, devis assurance taxi gratuit, prix assurance taxi, taxi insurance cost, insurance for taxi drivers, rc professionnelle taxi, assurance taxi professionnel, insurance for taxi company, taxi insurance near me, how much is taxi insurance, assurance taxi france, assurance taxi paris, assurance taxi lyon, assurance taxi marseille"
        canonical="/"
      />
      <JsonLd type="organization" />
      <JsonLd type="local-business" />
      <JsonLd type="reviews" />
      <JsonLd type="breadcrumb" data={[
        { name: 'Accueil', url: '/' }
      ]} />
      <JsonLd type="faq" data={[
        {
          question: "Quel est le prix d'une assurance taxi ?",
          answer: "Le prix d'une assurance taxi varie entre 1200€ et 3500€ par an selon votre profil, votre véhicule et vos garanties. Avec TaxiAssur, économisez en moyenne 35% grâce à nos tarifs négociés."
        },
        {
          question: "How much is taxi insurance in France?",
          answer: "The average cost of taxi insurance in France ranges from €1,200 to €3,500 per year, depending on factors like location, driving experience, vehicle type, and coverage level. TaxiAssur offers cheap taxi insurance with up to 35% savings through our negotiated rates with 15+ insurers."
        },
        {
          question: "What insurance is required for taxi drivers?",
          answer: "Taxi drivers in France must have: 1) Third-party liability insurance (RC Pro), 2) Comprehensive vehicle insurance, 3) Passenger coverage. TaxiAssur provides all-in-one insurance packages for taxi drivers with RC Pro included."
        },
        {
          question: "Combien de temps pour recevoir mon devis ?",
          answer: "Votre devis personnalisé est généré instantanément en ligne. Notre équipe vous contacte sous 15 minutes maximum pour finaliser votre dossier."
        },
        {
          question: "La RC Pro est-elle obligatoire pour les taxis ?",
          answer: "Oui, la RC Professionnelle est obligatoire pour tous les taxis et VTC. Elle couvre les dommages causés aux tiers dans le cadre de votre activité professionnelle. Nos contrats l'incluent systématiquement."
        },
        {
          question: "Puis-je changer d'assurance taxi en cours d'année ?",
          answer: "Oui, grâce à la loi Hamon, vous pouvez résilier votre assurance taxi à tout moment après la première année. Nous gérons gratuitement toutes vos démarches de résiliation."
        }
      ]} />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        <main>
          <Hero />

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
              <FAQ />
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
        <Footer />
        <StickyCTA />
      </div>
    </>
  );
};

export default Home;
