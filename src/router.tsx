import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import RootLayout from './components/RootLayout';
import ErrorBoundary from './components/ErrorBoundary';
import RouteErrorFallback from './components/RouteErrorFallback';

const Home = lazy(() => import('./pages/Home'));
const AssuranceTaxi = lazy(() => import('./pages/AssuranceTaxi'));
const AssuranceTaxiVTC = lazy(() => import('./pages/AssuranceTaxiVTC'));
const AssuranceMotoTaxi = lazy(() => import('./pages/AssuranceMotoTaxi'));
const AssuranceObligatoireTaxi = lazy(() => import('./pages/AssuranceObligatoireTaxi'));
const PrixAssuranceTaxi = lazy(() => import('./pages/PrixAssuranceTaxi'));
const QuelleAssuranceTaxi = lazy(() => import('./pages/QuelleAssuranceTaxi'));
const RCProfessionnelle = lazy(() => import('./pages/RCProfessionnelle'));
const FlotteVehicules = lazy(() => import('./pages/FlotteVehicules'));
const GestionSinistres = lazy(() => import('./pages/GestionSinistres'));
const TaxisSinistres = lazy(() => import('./pages/TaxisSinistres'));
const Offers = lazy(() => import('./pages/Offers'));
const ConseilPersonnalise = lazy(() => import('./pages/ConseilPersonnalise'));
const ConfianceEtCertifications = lazy(() => import('./pages/ConfianceEtCertifications'));
const Blog = lazy(() => import('./pages/Blog'));
const Post = lazy(() => import('./pages/Post'));
const Actualites = lazy(() => import('./pages/Actualites'));
const NewsArticle = lazy(() => import('./pages/NewsArticle'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Contact = lazy(() => import('./pages/Contact'));
const Legal = lazy(() => import('./pages/Legal'));
const Policy = lazy(() => import('./pages/Policy'));
const Conditions = lazy(() => import('./pages/Conditions'));
const Merci = lazy(() => import('./pages/Merci'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Partners = lazy(() => import('./pages/Partners'));
const PartnershipPage = lazy(() => import('./pages/PartnershipPage'));
const AmbassadorSignup = lazy(() => import('./pages/AmbassadorSignup'));
const Newsletter = lazy(() => import('./pages/Newsletter'));
const NewsletterSubscribe = lazy(() => import('./pages/NewsletterSubscribe'));
const NewsletterUnsubscribe = lazy(() => import('./pages/NewsletterUnsubscribe'));
const CityPage = lazy(() => import('./pages/CityPage'));
const CityIndex = lazy(() => import('./pages/CityIndex'));
const MirrorPage = lazy(() => import('./pages/MirrorPage'));
const SitemapPage = lazy(() => import('./pages/SitemapPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const EspaceClient = lazy(() => import('./pages/EspaceClient'));
const EspaceProspect = lazy(() => import('./pages/EspaceProspect'));
const ProspectDocuments = lazy(() => import('./pages/ProspectDocuments'));
const DownPaymentPage = lazy(() => import('./pages/DownPaymentPage'));
const TestNotifications = lazy(() => import('./pages/TestNotifications'));

const AssuranceTaxiParis = lazy(() => import('./pages/AssuranceTaxiParis'));
const AssuranceTaxiLyon = lazy(() => import('./pages/AssuranceTaxiLyon'));
const AssuranceTaxiMarseille = lazy(() => import('./pages/AssuranceTaxiMarseille'));
const AssuranceTaxiBordeaux = lazy(() => import('./pages/AssuranceTaxiBordeaux'));
const AssuranceTaxiToulouse = lazy(() => import('./pages/AssuranceTaxiToulouse'));
const AssuranceTaxiNice = lazy(() => import('./pages/AssuranceTaxiNice'));
const AssuranceTaxiNantes = lazy(() => import('./pages/AssuranceTaxiNantes'));
const AssuranceTaxiStrasbourg = lazy(() => import('./pages/AssuranceTaxiStrasbourg'));
const AssuranceTaxiMontpellier = lazy(() => import('./pages/AssuranceTaxiMontpellier'));
const AssuranceTaxiRennes = lazy(() => import('./pages/AssuranceTaxiRennes'));
const AssuranceTaxiReims = lazy(() => import('./pages/AssuranceTaxiReims'));
const AssuranceTaxiToulon = lazy(() => import('./pages/AssuranceTaxiToulon'));
const AssuranceTaxiGrenoble = lazy(() => import('./pages/AssuranceTaxiGrenoble'));
const AssuranceTaxiDijon = lazy(() => import('./pages/AssuranceTaxiDijon'));
const AssuranceTaxiAngers = lazy(() => import('./pages/AssuranceTaxiAngers'));
const AssuranceTaxiNimes = lazy(() => import('./pages/AssuranceTaxiNimes'));
const AssuranceTaxiVilleurbanne = lazy(() => import('./pages/AssuranceTaxiVilleurbanne'));
const AssuranceTaxiLeHavre = lazy(() => import('./pages/AssuranceTaxiLe-Havre'));
const AssuranceTaxiLeMans = lazy(() => import('./pages/AssuranceTaxiLe-Mans'));
const AssuranceTaxiAixEnProvence = lazy(() => import('./pages/AssuranceTaxiAix-en-Provence'));
const AssuranceTaxiBrest = lazy(() => import('./pages/AssuranceTaxiBrest'));
const AssuranceTaxiTours = lazy(() => import('./pages/AssuranceTaxiTours'));
const AssuranceTaxiAmiens = lazy(() => import('./pages/AssuranceTaxiAmiens'));
const AssuranceTaxiLimoges = lazy(() => import('./pages/AssuranceTaxiLimoges'));
const AssuranceTaxiClermontFerrand = lazy(() => import('./pages/AssuranceTaxiClermont-Ferrand'));
const AssuranceTaxiBesancon = lazy(() => import('./pages/AssuranceTaxiBesancon'));
const AssuranceTaxiOrleans = lazy(() => import('./pages/AssuranceTaxiOrleans'));
const AssuranceTaxiMetz = lazy(() => import('./pages/AssuranceTaxiMetz'));
const AssuranceTaxiPerpignan = lazy(() => import('./pages/AssuranceTaxiPerpignan'));
const AssuranceTaxiSaintEtienne = lazy(() => import('./pages/AssuranceTaxiSaint-Etienne'));

const AuthCallbackLinkedin = lazy(() => import('./pages/AuthCallbackLinkedin'));
const AuthCallbackTwitter = lazy(() => import('./pages/AuthCallbackTwitter'));
const AuthCallbackYoutube = lazy(() => import('./pages/AuthCallbackYoutube'));
const AuthCallbackPinterest = lazy(() => import('./pages/AuthCallbackPinterest'));

const CRMKiller = lazy(() => import('./backoffice/CRMKiller'));
const CRMLeadDetail = lazy(() => import('./backoffice/CRMLeadDetail'));
const CRMCommercial = lazy(() => import('./backoffice/CRMCommercial'));
const LeadManager = lazy(() => import('./backoffice/LeadManager'));
const Dashboard = lazy(() => import('./backoffice/Dashboard'));
const AnalyticsDashboard = lazy(() => import('./backoffice/AnalyticsDashboard'));
const ContentManager = lazy(() => import('./backoffice/ContentManager'));
const SeoTools = lazy(() => import('./backoffice/SeoTools'));
const EmailInboxManager = lazy(() => import('./backoffice/EmailInboxManager'));
const EmailMarketingHub = lazy(() => import('./backoffice/EmailMarketingHub'));
const NewsletterDashboard = lazy(() => import('./backoffice/NewsletterDashboard'));
const AutomationDashboard = lazy(() => import('./backoffice/AutomationDashboard'));
const BacklinkManager = lazy(() => import('./backoffice/BacklinkManager'));
const SecurityDashboard = lazy(() => import('./backoffice/SecurityDashboard'));
const UserManagement = lazy(() => import('./backoffice/UserManagement'));
const MasterDashboard = lazy(() => import('./backoffice/MasterDashboard'));
const QuoteManager = lazy(() => import('./backoffice/QuoteManager'));
const InsuranceCompaniesManager = lazy(() => import('./backoffice/InsuranceCompaniesManager'));
const PendingDocumentsManager = lazy(() => import('./backoffice/PendingDocumentsManager'));

const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const ClientProfil = lazy(() => import('./pages/client/ClientProfil'));
const ClientDocuments = lazy(() => import('./pages/client/ClientDocuments'));
const ClientPaiements = lazy(() => import('./pages/client/ClientPaiements'));
const ClientSinistres = lazy(() => import('./pages/client/ClientSinistres'));
const ClientNotifications = lazy(() => import('./pages/client/ClientNotifications'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <Home /> },
      { path: 'assurance-taxi', element: <AssuranceTaxi /> },
      { path: 'assurance-taxi-vtc', element: <AssuranceTaxiVTC /> },
      { path: 'assurance-moto-taxi', element: <AssuranceMotoTaxi /> },
      { path: 'assurance-obligatoire-taxi', element: <AssuranceObligatoireTaxi /> },
      { path: 'prix-assurance-taxi', element: <PrixAssuranceTaxi /> },
      { path: 'quelle-assurance-taxi', element: <QuelleAssuranceTaxi /> },
      { path: 'rc-professionnelle', element: <RCProfessionnelle /> },
      { path: 'flotte-vehicules', element: <FlotteVehicules /> },
      { path: 'gestion-sinistres', element: <GestionSinistres /> },
      { path: 'taxis-sinistres', element: <TaxisSinistres /> },
      { path: 'offres', element: <Offers /> },
      { path: 'conseil-personnalise', element: <ConseilPersonnalise /> },
      { path: 'confiance-certifications', element: <ConfianceEtCertifications /> },
      { path: 'blog', element: <Blog /> },
      { path: 'blog/:slug', element: <Post /> },
      { path: 'actualites', element: <Actualites /> },
      { path: 'actualites/:slug', element: <NewsArticle /> },
      { path: 'faq', element: <FAQ /> },
      { path: 'contact', element: <Contact /> },
      { path: 'mentions-legales', element: <Legal /> },
      { path: 'politique-confidentialite', element: <Policy /> },
      { path: 'conditions-generales', element: <Conditions /> },
      { path: 'merci', element: <Merci /> },
      { path: 'avis', element: <Reviews /> },
      { path: 'partenaires', element: <Partners /> },
      { path: 'devenir-partenaire', element: <PartnershipPage /> },
      { path: 'ambassadeur', element: <AmbassadorSignup /> },
      { path: 'newsletter', element: <Newsletter /> },
      { path: 'newsletter/subscribe', element: <NewsletterSubscribe /> },
      { path: 'newsletter/unsubscribe', element: <NewsletterUnsubscribe /> },
      { path: 'villes', element: <CityIndex /> },
      { path: 'villes/:city', element: <CityPage /> },
      { path: 'mirror/:slug', element: <MirrorPage /> },
      { path: 'sitemap', element: <SitemapPage /> },
      { path: 'test-notifications', element: <TestNotifications /> },

      { path: 'assurance-taxi-paris', element: <AssuranceTaxiParis /> },
      { path: 'assurance-taxi-lyon', element: <AssuranceTaxiLyon /> },
      { path: 'assurance-taxi-marseille', element: <AssuranceTaxiMarseille /> },
      { path: 'assurance-taxi-bordeaux', element: <AssuranceTaxiBordeaux /> },
      { path: 'assurance-taxi-toulouse', element: <AssuranceTaxiToulouse /> },
      { path: 'assurance-taxi-nice', element: <AssuranceTaxiNice /> },
      { path: 'assurance-taxi-nantes', element: <AssuranceTaxiNantes /> },
      { path: 'assurance-taxi-strasbourg', element: <AssuranceTaxiStrasbourg /> },
      { path: 'assurance-taxi-montpellier', element: <AssuranceTaxiMontpellier /> },
      { path: 'assurance-taxi-rennes', element: <AssuranceTaxiRennes /> },
      { path: 'assurance-taxi-reims', element: <AssuranceTaxiReims /> },
      { path: 'assurance-taxi-toulon', element: <AssuranceTaxiToulon /> },
      { path: 'assurance-taxi-grenoble', element: <AssuranceTaxiGrenoble /> },
      { path: 'assurance-taxi-dijon', element: <AssuranceTaxiDijon /> },
      { path: 'assurance-taxi-angers', element: <AssuranceTaxiAngers /> },
      { path: 'assurance-taxi-nimes', element: <AssuranceTaxiNimes /> },
      { path: 'assurance-taxi-villeurbanne', element: <AssuranceTaxiVilleurbanne /> },
      { path: 'assurance-taxi-le-havre', element: <AssuranceTaxiLeHavre /> },
      { path: 'assurance-taxi-le-mans', element: <AssuranceTaxiLeMans /> },
      { path: 'assurance-taxi-aix-en-provence', element: <AssuranceTaxiAixEnProvence /> },
      { path: 'assurance-taxi-brest', element: <AssuranceTaxiBrest /> },
      { path: 'assurance-taxi-tours', element: <AssuranceTaxiTours /> },
      { path: 'assurance-taxi-amiens', element: <AssuranceTaxiAmiens /> },
      { path: 'assurance-taxi-limoges', element: <AssuranceTaxiLimoges /> },
      { path: 'assurance-taxi-clermont-ferrand', element: <AssuranceTaxiClermontFerrand /> },
      { path: 'assurance-taxi-besancon', element: <AssuranceTaxiBesancon /> },
      { path: 'assurance-taxi-orleans', element: <AssuranceTaxiOrleans /> },
      { path: 'assurance-taxi-metz', element: <AssuranceTaxiMetz /> },
      { path: 'assurance-taxi-perpignan', element: <AssuranceTaxiPerpignan /> },
      { path: 'assurance-taxi-saint-etienne', element: <AssuranceTaxiSaintEtienne /> },

      { path: 'auth/callback/linkedin', element: <AuthCallbackLinkedin /> },
      { path: 'auth/callback/twitter', element: <AuthCallbackTwitter /> },
      { path: 'auth/callback/youtube', element: <AuthCallbackYoutube /> },
      { path: 'auth/callback/pinterest', element: <AuthCallbackPinterest /> },

      { path: 'admin', element: <AdminDashboard /> },
      { path: 'espace-client', element: <EspaceClient /> },
      { path: 'espace-prospect', element: <EspaceProspect /> },
      { path: 'prospect-documents', element: <ProspectDocuments /> },
      { path: 'down-payment', element: <DownPaymentPage /> },

      { path: 'client/dashboard', element: <ClientDashboard /> },
      { path: 'client/profil', element: <ClientProfil /> },
      { path: 'client/documents', element: <ClientDocuments /> },
      { path: 'client/paiements', element: <ClientPaiements /> },
      { path: 'client/sinistres', element: <ClientSinistres /> },
      { path: 'client/notifications', element: <ClientNotifications /> },

      { path: 'backoffice', element: <Navigate to="/backoffice/crm" replace /> },
      { path: 'backoffice/crm', element: <CRMKiller /> },
      { path: 'backoffice/crm/leads/:leadId', element: <CRMLeadDetail /> },
      { path: 'backoffice/commercial', element: <CRMCommercial /> },
      { path: 'backoffice/leads', element: <LeadManager /> },
      { path: 'backoffice/dashboard', element: <Dashboard /> },
      { path: 'backoffice/analytics', element: <AnalyticsDashboard /> },
      { path: 'backoffice/content', element: <ContentManager /> },
      { path: 'backoffice/seo', element: <SeoTools /> },
      { path: 'backoffice/inbox', element: <EmailInboxManager /> },
      { path: 'backoffice/email-marketing', element: <EmailMarketingHub /> },
      { path: 'backoffice/newsletter', element: <NewsletterDashboard /> },
      { path: 'backoffice/automation', element: <AutomationDashboard /> },
      { path: 'backoffice/backlinks', element: <BacklinkManager /> },
      { path: 'backoffice/security', element: <SecurityDashboard /> },
      { path: 'backoffice/users', element: <UserManagement /> },
      { path: 'backoffice/master', element: <MasterDashboard /> },
      { path: 'backoffice/quotes', element: <QuoteManager /> },
      { path: 'backoffice/insurance-companies', element: <InsuranceCompaniesManager /> },
      { path: 'backoffice/pending-documents', element: <PendingDocumentsManager /> },

      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
]);
