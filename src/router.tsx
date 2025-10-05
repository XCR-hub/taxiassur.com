import { createBrowserRouter } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Blog from './pages/Blog';
import Post from './pages/Post';
import FAQ from './pages/FAQ';
import Reviews from './pages/Reviews';
import Offers from './pages/Offers';
import Contact from './pages/Contact';
import Merci from './pages/Merci';
import Legal from './pages/Legal';
import Policy from './pages/Policy';
import Conditions from './pages/Conditions';
import SitemapPage from './pages/SitemapPage';
import Partners from './pages/Partners';
import CityIndex from './pages/CityIndex';
import CityPage from './pages/CityPage';
import PartnershipPage from './pages/PartnershipPage';
import AssuranceTaxi from './pages/AssuranceTaxi';
import RCProfessionnelle from './pages/RCProfessionnelle';
import FlotteVehicules from './pages/FlotteVehicules';
import ConseilPersonnalise from './pages/ConseilPersonnalise';
import GestionSinistres from './pages/GestionSinistres';
import OfferPage from './components/OfferPage';
import Dashboard from './backoffice/Dashboard';
import BacklinkManager from './backoffice/BacklinkManager';
import PartnerManager from './backoffice/PartnerManager';
import ContentManager from './backoffice/ContentManager';
import SeoTools from './backoffice/SeoTools';
import SecurityDashboard from './backoffice/SecurityDashboard';
import ConversionAnalytics from './backoffice/ConversionAnalytics';
import PartnerFinder from './backoffice/PartnerFinder';
import ProspectReview from './backoffice/ProspectReview';
import OutreachComposer from './backoffice/OutreachComposer';
import ComplianceCenter from './backoffice/ComplianceCenter';
import DirectoryAssistant from './backoffice/DirectoryAssistant';
import PopupManager from './backoffice/PopupManager';
import NewsManager from './backoffice/NewsManager';
import LeadMarketplace from './backoffice/LeadMarketplace';
import PartnerPortal from './backoffice/PartnerPortal';
import LeadManager from './backoffice/LeadManager';
import AuthGuard from './components/AuthGuard';
import NewsletterPage from './pages/Newsletter';

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
    element: <Home />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/assurance-taxi',
    element: <AssuranceTaxi />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/rc-professionnelle',
    element: <RCProfessionnelle />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/flotte-vehicules',
    element: <FlotteVehicules />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/conseil-personnalise',
    element: <ConseilPersonnalise />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/gestion-sinistres',
    element: <GestionSinistres />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/blog',
    element: <Blog />,
    errorElement: <ErrorBoundary><Navigate to="/blog" replace /></ErrorBoundary>
  },
  {
    path: '/blog/:id',
    element: <Post />,
    errorElement: <ErrorBoundary><Navigate to="/blog" replace /></ErrorBoundary>
  },
  {
    path: '/faq',
    element: <FAQ />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/avis',
    element: <Reviews />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/offres',
    element: <Offers />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/offres/:id',
    element: <OfferPage />,
    errorElement: <ErrorBoundary><Navigate to="/offres" replace /></ErrorBoundary>
  },
  {
    path: '/contact',
    element: <Contact />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/merci',
    element: <Merci />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/mentions-legales',
    element: <Legal />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/politique-confidentialite',
    element: <Policy />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/conditions-generales',
    element: <Conditions />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/plan-du-site',
    element: <SitemapPage />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/newsletter',
    element: <NewsletterPage />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/partenaires',
    element: <Partners />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/programme-partenaires',
    element: <PartnershipPage />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/devenir-partenaire',
    element: <PartnershipPage />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/villes',
    element: <CityIndex />,
    errorElement: <ErrorBoundary><Navigate to="/" replace /></ErrorBoundary>
  },
  {
    path: '/ville/:city',
    element: <CityPage />,
    errorElement: <ErrorBoundary><Navigate to="/villes" replace /></ErrorBoundary>
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  },
  {
    path: '/backoffice',
    element: <AuthGuard><Dashboard /></AuthGuard>
  },
  {
    path: '/backoffice/backlinks',
    element: <AuthGuard><BacklinkManager /></AuthGuard>
  },
  {
    path: '/backoffice/partners',
    element: <AuthGuard><PartnerManager /></AuthGuard>
  },
  {
    path: '/backoffice/content',
    element: <AuthGuard><ContentManager /></AuthGuard>
  },
  {
    path: '/backoffice/seo',
    element: <AuthGuard><SeoTools /></AuthGuard>
  },
  {
    path: '/backoffice/security',
    element: <AuthGuard><SecurityDashboard /></AuthGuard>
  },
  {
    path: '/backoffice/analytics',
    element: <AuthGuard><ConversionAnalytics /></AuthGuard>
  },
  {
    path: '/backoffice/partner-finder',
    element: <AuthGuard><PartnerFinder /></AuthGuard>
  },
  {
    path: '/backoffice/prospects',
    element: <AuthGuard><ProspectReview /></AuthGuard>
  },
  {
    path: '/backoffice/outreach',
    element: <AuthGuard><OutreachComposer /></AuthGuard>
  },
  {
    path: '/backoffice/compliance',
    element: <AuthGuard><ComplianceCenter /></AuthGuard>
  },
  {
    path: '/backoffice/directory',
    element: <AuthGuard><DirectoryAssistant /></AuthGuard>
  },
  {
    path: '/backoffice/popups',
    element: <AuthGuard><PopupManager /></AuthGuard>
  },
  {
    path: '/backoffice/news',
    element: <AuthGuard><NewsManager /></AuthGuard>
  },
  {
    path: '/backoffice/lead-marketplace',
    element: <AuthGuard><LeadMarketplace /></AuthGuard>
  },
  {
    path: '/backoffice/partner-portal',
    element: <AuthGuard><PartnerPortal /></AuthGuard>
  },
  {
    path: '/backoffice/leads',
    element: <AuthGuard><LeadManager /></AuthGuard>
  },
  {
    path: '/backoffice/lead-manager',
    element: <AuthGuard><LeadManager /></AuthGuard>
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});