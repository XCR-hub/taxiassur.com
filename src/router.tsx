import { createBrowserRouter } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));
const Blog = lazy(() => import('./pages/Blog'));
const Post = lazy(() => import('./pages/Post'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Offers = lazy(() => import('./pages/Offers'));
const Contact = lazy(() => import('./pages/Contact'));
const Merci = lazy(() => import('./pages/Merci'));
const Legal = lazy(() => import('./pages/Legal'));
const Policy = lazy(() => import('./pages/Policy'));
const Conditions = lazy(() => import('./pages/Conditions'));
const SitemapPage = lazy(() => import('./pages/SitemapPage'));
const Partners = lazy(() => import('./pages/Partners'));
const CityIndex = lazy(() => import('./pages/CityIndex'));
const CityPage = lazy(() => import('./pages/CityPage'));
const PartnershipPage = lazy(() => import('./pages/PartnershipPage'));
const AssuranceTaxi = lazy(() => import('./pages/AssuranceTaxi'));
const RCProfessionnelle = lazy(() => import('./pages/RCProfessionnelle'));
const FlotteVehicules = lazy(() => import('./pages/FlotteVehicules'));
const ConseilPersonnalise = lazy(() => import('./pages/ConseilPersonnalise'));
const GestionSinistres = lazy(() => import('./pages/GestionSinistres'));
const OfferPage = lazy(() => import('./components/OfferPage'));
const Dashboard = lazy(() => import('./backoffice/Dashboard'));
const BacklinkManager = lazy(() => import('./backoffice/BacklinkManager'));
const PartnerManager = lazy(() => import('./backoffice/PartnerManager'));
const ContentManager = lazy(() => import('./backoffice/ContentManager'));
const SeoTools = lazy(() => import('./backoffice/SeoTools'));
const SecurityDashboard = lazy(() => import('./backoffice/SecurityDashboard'));
const ConversionAnalytics = lazy(() => import('./backoffice/ConversionAnalytics'));
const PartnerFinder = lazy(() => import('./backoffice/PartnerFinder'));
const ProspectReview = lazy(() => import('./backoffice/ProspectReview'));
const OutreachComposer = lazy(() => import('./backoffice/OutreachComposer'));
const ComplianceCenter = lazy(() => import('./backoffice/ComplianceCenter'));
const DirectoryAssistant = lazy(() => import('./backoffice/DirectoryAssistant'));
const PopupManager = lazy(() => import('./backoffice/PopupManager'));
const NewsManager = lazy(() => import('./backoffice/NewsManager'));
const LeadMarketplace = lazy(() => import('./backoffice/LeadMarketplace'));
const PartnerPortal = lazy(() => import('./backoffice/PartnerPortal'));
const LeadManager = lazy(() => import('./backoffice/LeadManager'));
const AuthGuard = lazy(() => import('./components/AuthGuard'));
const NewsletterPage = lazy(() => import('./pages/Newsletter'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-300">Chargement...</p>
    </div>
  </div>
);

const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
);

// Error boundary component for better error handling
const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Oops ! Une erreur s'est produite
        </h1>
        <p className="text-gray-600 mb-6">
          Nous nous excusons pour ce désagrément. Veuillez réessayer ou nous contacter.
        </p>
        <div className="space-x-4">
          <a 
            href="/" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Retour à l'accueil
          </a>
          <a 
            href="tel:0180855786" 
            className="border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            01 80 85 57 86
          </a>
        </div>
      </div>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SuspenseWrapper><Home /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/assurance-taxi',
    element: <SuspenseWrapper><AssuranceTaxi /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/rc-professionnelle',
    element: <SuspenseWrapper><RCProfessionnelle /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/flotte-vehicules',
    element: <SuspenseWrapper><FlotteVehicules /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/conseil-personnalise',
    element: <SuspenseWrapper><ConseilPersonnalise /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/gestion-sinistres',
    element: <SuspenseWrapper><GestionSinistres /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/blog',
    element: <SuspenseWrapper><Blog /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/blog" replace /></ErrorBoundary>
  },
  {
    path: '/blog/:id',
    element: <SuspenseWrapper><Post /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/blog" replace /></ErrorBoundary>
  },
  {
    path: '/faq',
    element: <SuspenseWrapper><FAQ /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/avis',
    element: <SuspenseWrapper><Reviews /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/offres',
    element: <SuspenseWrapper><Offers /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/offres/:id',
    element: <SuspenseWrapper><OfferPage /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/offres" replace /></ErrorBoundary>
  },
  {
    path: '/contact',
    element: <SuspenseWrapper><Contact /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/merci',
    element: <SuspenseWrapper><Merci /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/mentions-legales',
    element: <SuspenseWrapper><Legal /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/politique-confidentialite',
    element: <SuspenseWrapper><Policy /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/conditions-generales',
    element: <SuspenseWrapper><Conditions /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/plan-du-site',
    element: <SuspenseWrapper><SitemapPage /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/newsletter',
    element: <SuspenseWrapper><NewsletterPage /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/partenaires',
    element: <SuspenseWrapper><Partners /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/programme-partenaires',
    element: <SuspenseWrapper><PartnershipPage /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/devenir-partenaire',
    element: <SuspenseWrapper><PartnershipPage /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/villes',
    element: <SuspenseWrapper><CityIndex /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/ville/:city',
    element: <SuspenseWrapper><CityPage /></SuspenseWrapper>,
    errorElement: <ErrorBoundary><Navigate to="/villes" replace /></ErrorBoundary>
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  },
  {
    path: '/backoffice',
    element: <AuthGuard><SuspenseWrapper><Dashboard /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/backlinks',
    element: <AuthGuard><SuspenseWrapper><BacklinkManager /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/partners',
    element: <AuthGuard><SuspenseWrapper><PartnerManager /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/content',
    element: <AuthGuard><SuspenseWrapper><ContentManager /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/seo',
    element: <AuthGuard><SuspenseWrapper><SeoTools /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/security',
    element: <AuthGuard><SuspenseWrapper><SecurityDashboard /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/analytics',
    element: <AuthGuard><SuspenseWrapper><ConversionAnalytics /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/partner-finder',
    element: <AuthGuard><SuspenseWrapper><PartnerFinder /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/prospects',
    element: <AuthGuard><SuspenseWrapper><ProspectReview /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/outreach',
    element: <AuthGuard><SuspenseWrapper><OutreachComposer /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/compliance',
    element: <AuthGuard><SuspenseWrapper><ComplianceCenter /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/directory',
    element: <AuthGuard><SuspenseWrapper><DirectoryAssistant /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/popups',
    element: <AuthGuard><SuspenseWrapper><PopupManager /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/news',
    element: <AuthGuard><SuspenseWrapper><NewsManager /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/lead-marketplace',
    element: <AuthGuard><SuspenseWrapper><LeadMarketplace /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/partner-portal',
    element: <AuthGuard><SuspenseWrapper><PartnerPortal /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/leads',
    element: <AuthGuard><SuspenseWrapper><LeadManager /></SuspenseWrapper></AuthGuard>
  },
  {
    path: '/backoffice/lead-manager',
    element: <AuthGuard><SuspenseWrapper><LeadManager /></SuspenseWrapper></AuthGuard>
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});