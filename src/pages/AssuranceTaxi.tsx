import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import StickyCTA from '../components/StickyCTA';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import AcquisitionGuide, { AcquisitionQuestions } from '../components/AcquisitionGuide';
import { ACQUISITION_PAGES } from '../../shared/acquisition-pages.js';

export default function AssuranceTaxi() {
  const page = ACQUISITION_PAGES['/assurance-taxi'];
  return <>
    <SEOHead title={page.title} description={page.description} canonical="/assurance-taxi" />
    <JsonLd type="breadcrumb" data={[{ name: 'Accueil', url: '/' }, { name: page.title, url: '/assurance-taxi' }]} />
    <JsonLd type="organization" />
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <section className="py-8 sm:py-12">
          <div className="container-max grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
            <div className="space-y-5">
              <p className="text-sm font-semibold text-amber-300">Courtier spécialisé taxi · Devis gratuit et sans engagement</p>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{page.h1}</h1>
              <p className="text-gray-200 leading-relaxed">{page.intro}</p>
              <a href="#devis-form" className="inline-flex rounded-xl bg-amber-400 text-gray-950 px-5 py-3 font-bold">Demander mon devis personnalisé</a>
            </div>
            <LeadForm compact />
          </div>
        </section>
        <AcquisitionGuide pathname="/assurance-taxi" />
        <AcquisitionQuestions />
      </main>
      <Footer /><StickyCTA />
    </div>
  </>;
}
