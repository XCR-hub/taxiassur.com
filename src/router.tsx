import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import RootLayout from './components/RootLayout';
import ErrorBoundary from './components/ErrorBoundary';
import RouteErrorFallback from './components/RouteErrorFallback';
import { OptimizedSuspense } from './components/OptimizedSuspense';

const Home = lazy(() => import('./pages/Home'));
const AssuranceTaxi = lazy(() => import('./pages/AssuranceTaxi'));
const AssuranceTaxiVTC = lazy(() => import('./pages/AssuranceTaxiVTC'));
const AssuranceMotoTaxi = lazy(() => import('./pages/AssuranceMotoTaxi'));
const RCProfessionnelle = lazy(() => import('./pages/RCProfessionnelle'));
const FlotteVehicules = lazy(() => import('./pages/FlotteVehicules'));
const GestionSinistres = lazy(() => import('./pages/GestionSinistres'));
const AssuranceObligatoireTaxi = lazy(() => import('./pages/AssuranceObligatoireTaxi'));
const PrixAssuranceTaxi = lazy(() => import('./pages/PrixAssuranceTaxi'));
const QuelleAssuranceTaxi = lazy(() => import('./pages/QuelleAssuranceTaxi'));
const TaxisSinistres = lazy(() => import('./pages/TaxisSinistres'));
const ConfianceEtCertifications = lazy(() => import('./pages/ConfianceEtCertifications'));
const ConseilPersonnalise = lazy(() => import('./pages/ConseilPersonnalise'));
const Blog = lazy(() => import('./pages/Blog'));
const Post = lazy(() => import('./pages/Post'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Contact = lazy(() => import('./pages/Contact'));
const Legal = lazy(() => import('./pages/Legal'));
const Policy = lazy(() => import('./pages/Policy'));
const Conditions = lazy(() => import('./pages/Conditions'));
const Merci = lazy(() => import('./pages/Merci'));
const Offers = lazy(() => import('./pages/Offers'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Partners = lazy(() => import('./pages/Partners'));
const PartnershipPage = lazy(() => import('./pages/PartnershipPage'));
const AmbassadorSignup = lazy(() => import('./pages/AmbassadorSignup'));
const Newsletter = lazy(() => import('./pages/Newsletter'));
const NewsletterSubscribe = lazy(() => import('./pages/NewsletterSubscribe'));
const NewsletterUnsubscribe = lazy(() => import('./pages/NewsletterUnsubscribe'));
const Actualites = lazy(() => import('./pages/Actualites'));
const NewsArticle = lazy(() => import('./pages/NewsArticle'));
const SitemapPage = lazy(() => import('./pages/SitemapPage'));
const CityIndex = lazy(() => import('./pages/CityIndex'));
const CityPage = lazy(() => import('./pages/CityPage'));
const MirrorPage = lazy(() => import('./pages/MirrorPage'));
const EspaceClient = lazy(() => import('./pages/EspaceClient'));
const EspaceProspect = lazy(() => import('./pages/EspaceProspect'));
const ProspectDocuments = lazy(() => import('./pages/ProspectDocuments'));
const DownPaymentPage = lazy(() => import('./pages/DownPaymentPage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TestNotifications = lazy(() => import('./pages/TestNotifications'));

const Dashboard = lazy(() => import('./backoffice/Dashboard'));
const MasterDashboard = lazy(() => import('./backoffice/MasterDashboard'));
const LeadManager = lazy(() => import('./backoffice/LeadManager'));
const LeadCRM = lazy(() => import('./backoffice/LeadCRM'));
const CRMUniversal = lazy(() => import('./backoffice/CRMUniversal'));
const CRMKiller = lazy(() => import('./backoffice/CRMKiller'));
const CRMCommercial = lazy(() => import('./backoffice/CRMCommercial'));
const CRMLeadDetail = lazy(() => import('./backoffice/CRMLeadDetail'));
const CRMPipelineKanban = lazy(() => import('./backoffice/CRMPipelineKanban'));
const CRMInboxMulticanal = lazy(() => import('./backoffice/CRMInboxMulticanal'));
const CRMTemplatesManager = lazy(() => import('./backoffice/CRMTemplatesManager'));
const CRMAdminSettings = lazy(() => import('./backoffice/CRMAdminSettings'));
const ManualLeadCreation = lazy(() => import('./backoffice/ManualLeadCreation'));
const DuplicateLeadsManager = lazy(() => import('./backoffice/DuplicateLeadsManager'));
const PendingDocumentsManager = lazy(() => import('./backoffice/PendingDocumentsManager'));
const InsuranceCompaniesManager = lazy(() => import('./backoffice/InsuranceCompaniesManager'));
const QuoteQueueDashboard = lazy(() => import('./backoffice/QuoteQueueDashboard'));
const EmailInboxManager = lazy(() => import('./backoffice/EmailInboxManager'));
const QuoteManager = lazy(() => import('./backoffice/QuoteManager'));
const DocumentsViewer = lazy(() => import('./backoffice/DocumentsViewer'));
const UserManagement = lazy(() => import('./backoffice/UserManagement'));
const AnalyticsDashboard = lazy(() => import('./backoffice/AnalyticsDashboard'));
const ContentManager = lazy(() => import('./backoffice/ContentManager'));
const SeoTools = lazy(() => import('./backoffice/SeoTools'));
const NewsManager = lazy(() => import('./backoffice/NewsManager'));
const PopupManager = lazy(() => import('./backoffice/PopupManager'));
const PartnerManager = lazy(() => import('./backoffice/PartnerManager'));
const NewsletterDashboard = lazy(() => import('./backoffice/NewsletterDashboard'));
const AutomationDashboard = lazy(() => import('./backoffice/AutomationDashboard'));
const TestAutomations = lazy(() => import('./backoffice/TestAutomations'));
const WhatsAppManager = lazy(() => import('./backoffice/WhatsAppManager'));
const BacklinkManager = lazy(() => import('./backoffice/BacklinkManager'));
const SocialMediaManager = lazy(() => import('./backoffice/SocialMediaManager'));
const EmailTrackingDashboard = lazy(() => import('./backoffice/EmailTrackingDashboard'));
const LLMDashboard = lazy(() => import('./backoffice/LLMDashboard'));
const MasterAI = lazy(() => import('./backoffice/MasterAI'));

const AuthCallbackLinkedin = lazy(() => import('./pages/AuthCallbackLinkedin'));
const AuthCallbackTwitter = lazy(() => import('./pages/AuthCallbackTwitter'));
const AuthCallbackPinterest = lazy(() => import('./pages/AuthCallbackPinterest'));
const AuthCallbackYoutube = lazy(() => import('./pages/AuthCallbackYoutube'));

const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const ClientDocuments = lazy(() => import('./pages/client/ClientDocuments'));
const ClientProfil = lazy(() => import('./pages/client/ClientProfil'));
const ClientSinistres = lazy(() => import('./pages/client/ClientSinistres'));
const ClientPaiements = lazy(() => import('./pages/client/ClientPaiements'));
const ClientNotifications = lazy(() => import('./pages/client/ClientNotifications'));
const NotFound = lazy(() => import('./pages/NotFound'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <OptimizedSuspense><Home /></OptimizedSuspense> },
      { path: 'assurance-taxi', element: <OptimizedSuspense><AssuranceTaxi /></OptimizedSuspense> },
      { path: 'assurance-taxi-vtc', element: <OptimizedSuspense><AssuranceTaxiVTC /></OptimizedSuspense> },
      { path: 'assurance-moto-taxi', element: <OptimizedSuspense><AssuranceMotoTaxi /></OptimizedSuspense> },
      { path: 'rc-professionnelle', element: <OptimizedSuspense><RCProfessionnelle /></OptimizedSuspense> },
      { path: 'flotte-vehicules', element: <OptimizedSuspense><FlotteVehicules /></OptimizedSuspense> },
      { path: 'gestion-sinistres', element: <OptimizedSuspense><GestionSinistres /></OptimizedSuspense> },
      { path: 'assurance-obligatoire-taxi', element: <OptimizedSuspense><AssuranceObligatoireTaxi /></OptimizedSuspense> },
      { path: 'prix-assurance-taxi', element: <OptimizedSuspense><PrixAssuranceTaxi /></OptimizedSuspense> },
      { path: 'quelle-assurance-taxi', element: <OptimizedSuspense><QuelleAssuranceTaxi /></OptimizedSuspense> },
      { path: 'sinistres-taxis', element: <OptimizedSuspense><TaxisSinistres /></OptimizedSuspense> },
      { path: 'confiance-certifications', element: <OptimizedSuspense><ConfianceEtCertifications /></OptimizedSuspense> },
      { path: 'conseil-personnalise', element: <OptimizedSuspense><ConseilPersonnalise /></OptimizedSuspense> },
      { path: 'blog', element: <OptimizedSuspense><Blog /></OptimizedSuspense> },
      { path: 'blog/:slug', element: <OptimizedSuspense><Post /></OptimizedSuspense> },
      { path: 'faq', element: <OptimizedSuspense><FAQ /></OptimizedSuspense> },
      { path: 'contact', element: <OptimizedSuspense><Contact /></OptimizedSuspense> },
      { path: 'mentions-legales', element: <OptimizedSuspense><Legal /></OptimizedSuspense> },
      { path: 'politique-confidentialite', element: <OptimizedSuspense><Policy /></OptimizedSuspense> },
      { path: 'conditions-generales', element: <OptimizedSuspense><Conditions /></OptimizedSuspense> },
      { path: 'merci', element: <OptimizedSuspense><Merci /></OptimizedSuspense> },
      { path: 'offres', element: <OptimizedSuspense><Offers /></OptimizedSuspense> },
      { path: 'avis', element: <OptimizedSuspense><Reviews /></OptimizedSuspense> },
      { path: 'partenaires', element: <OptimizedSuspense><Partners /></OptimizedSuspense> },
      { path: 'devenir-partenaire', element: <OptimizedSuspense><PartnershipPage /></OptimizedSuspense> },
      { path: 'devenir-ambassadeur', element: <OptimizedSuspense><AmbassadorSignup /></OptimizedSuspense> },
      { path: 'newsletter', element: <OptimizedSuspense><Newsletter /></OptimizedSuspense> },
      { path: 'newsletter/subscribe', element: <OptimizedSuspense><NewsletterSubscribe /></OptimizedSuspense> },
      { path: 'newsletter/unsubscribe', element: <OptimizedSuspense><NewsletterUnsubscribe /></OptimizedSuspense> },
      { path: 'actualites', element: <OptimizedSuspense><Actualites /></OptimizedSuspense> },
      { path: 'actualites/:slug', element: <OptimizedSuspense><NewsArticle /></OptimizedSuspense> },
      { path: 'plan-du-site', element: <OptimizedSuspense><SitemapPage /></OptimizedSuspense> },
      { path: 'villes', element: <OptimizedSuspense><CityIndex /></OptimizedSuspense> },
      { path: 'assurance-taxi-:city', element: <OptimizedSuspense><CityPage /></OptimizedSuspense> },
      { path: 'mirror/:path', element: <OptimizedSuspense><MirrorPage /></OptimizedSuspense> },
      { path: 'espace-client', element: <OptimizedSuspense><EspaceClient /></OptimizedSuspense> },
      { path: 'espace-prospect', element: <OptimizedSuspense><EspaceProspect /></OptimizedSuspense> },
      { path: 'prospect/documents/:token', element: <OptimizedSuspense><ProspectDocuments /></OptimizedSuspense> },
      { path: 'down-payment/:leadId', element: <OptimizedSuspense><DownPaymentPage /></OptimizedSuspense> },
      { path: 'test-notifications', element: <OptimizedSuspense><TestNotifications /></OptimizedSuspense> },

      { path: 'backoffice', element: <Navigate to="/admin/login" replace /> },
      { path: 'backoffice/*', element: <Navigate to="/admin/login" replace /> },
      { path: 'login', element: <Navigate to="/admin/login" replace /> },

      { path: 'auth/callback/linkedin', element: <OptimizedSuspense><AuthCallbackLinkedin /></OptimizedSuspense> },
      { path: 'auth/callback/twitter', element: <OptimizedSuspense><AuthCallbackTwitter /></OptimizedSuspense> },
      { path: 'auth/callback/pinterest', element: <OptimizedSuspense><AuthCallbackPinterest /></OptimizedSuspense> },
      { path: 'auth/callback/youtube', element: <OptimizedSuspense><AuthCallbackYoutube /></OptimizedSuspense> },

      {
        path: 'client',
        children: [
          { index: true, element: <Navigate to="/client/dashboard" replace /> },
          { path: 'dashboard', element: <OptimizedSuspense><ClientDashboard /></OptimizedSuspense> },
          { path: 'documents', element: <OptimizedSuspense><ClientDocuments /></OptimizedSuspense> },
          { path: 'profil', element: <OptimizedSuspense><ClientProfil /></OptimizedSuspense> },
          { path: 'sinistres', element: <OptimizedSuspense><ClientSinistres /></OptimizedSuspense> },
          { path: 'paiements', element: <OptimizedSuspense><ClientPaiements /></OptimizedSuspense> },
          { path: 'notifications', element: <OptimizedSuspense><ClientNotifications /></OptimizedSuspense> },
        ],
      },

      {
        path: 'admin',
        children: [
          { path: 'login', element: <OptimizedSuspense><AdminLogin /></OptimizedSuspense> },
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard', element: <OptimizedSuspense><AdminDashboard /></OptimizedSuspense> },
          { path: 'master', element: <OptimizedSuspense><MasterDashboard /></OptimizedSuspense> },
          { path: 'leads', element: <OptimizedSuspense><LeadManager /></OptimizedSuspense> },
          { path: 'crm', element: <OptimizedSuspense><LeadCRM /></OptimizedSuspense> },
          { path: 'crm-universal', element: <OptimizedSuspense><CRMUniversal /></OptimizedSuspense> },
          { path: 'crm-killer', element: <OptimizedSuspense><CRMKiller /></OptimizedSuspense> },
          { path: 'crm-commercial', element: <OptimizedSuspense><CRMCommercial /></OptimizedSuspense> },
          { path: 'crm/leads/:leadId', element: <OptimizedSuspense><CRMLeadDetail /></OptimizedSuspense> },
          { path: 'crm/pipeline', element: <OptimizedSuspense><CRMPipelineKanban /></OptimizedSuspense> },
          { path: 'crm/inbox', element: <OptimizedSuspense><CRMInboxMulticanal /></OptimizedSuspense> },
          { path: 'crm/templates', element: <OptimizedSuspense><CRMTemplatesManager /></OptimizedSuspense> },
          { path: 'crm/settings', element: <OptimizedSuspense><CRMAdminSettings /></OptimizedSuspense> },
          { path: 'leads/create', element: <OptimizedSuspense><ManualLeadCreation /></OptimizedSuspense> },
          { path: 'leads/duplicates', element: <OptimizedSuspense><DuplicateLeadsManager /></OptimizedSuspense> },
          { path: 'pending-documents', element: <OptimizedSuspense><PendingDocumentsManager /></OptimizedSuspense> },
          { path: 'insurance-companies', element: <OptimizedSuspense><InsuranceCompaniesManager /></OptimizedSuspense> },
          { path: 'quote-queue', element: <OptimizedSuspense><QuoteQueueDashboard /></OptimizedSuspense> },
          { path: 'inbox', element: <OptimizedSuspense><EmailInboxManager /></OptimizedSuspense> },
          { path: 'quotes', element: <OptimizedSuspense><QuoteManager /></OptimizedSuspense> },
          { path: 'documents', element: <OptimizedSuspense><DocumentsViewer /></OptimizedSuspense> },
          { path: 'users', element: <OptimizedSuspense><UserManagement /></OptimizedSuspense> },
          { path: 'analytics', element: <OptimizedSuspense><AnalyticsDashboard /></OptimizedSuspense> },
          { path: 'content', element: <OptimizedSuspense><ContentManager /></OptimizedSuspense> },
          { path: 'seo', element: <OptimizedSuspense><SeoTools /></OptimizedSuspense> },
          { path: 'news', element: <OptimizedSuspense><NewsManager /></OptimizedSuspense> },
          { path: 'popups', element: <OptimizedSuspense><PopupManager /></OptimizedSuspense> },
          { path: 'partners', element: <OptimizedSuspense><PartnerManager /></OptimizedSuspense> },
          { path: 'newsletter', element: <OptimizedSuspense><NewsletterDashboard /></OptimizedSuspense> },
          { path: 'automations', element: <OptimizedSuspense><AutomationDashboard /></OptimizedSuspense> },
          { path: 'test-automations', element: <OptimizedSuspense><TestAutomations /></OptimizedSuspense> },
          { path: 'whatsapp', element: <OptimizedSuspense><WhatsAppManager /></OptimizedSuspense> },
          { path: 'backlinks', element: <OptimizedSuspense><BacklinkManager /></OptimizedSuspense> },
          { path: 'social', element: <OptimizedSuspense><SocialMediaManager /></OptimizedSuspense> },
          { path: 'email-tracking', element: <OptimizedSuspense><EmailTrackingDashboard /></OptimizedSuspense> },
          { path: 'llm', element: <OptimizedSuspense><LLMDashboard /></OptimizedSuspense> },
          { path: 'ai', element: <OptimizedSuspense><MasterAI /></OptimizedSuspense> },
        ],
      },

      { path: '*', element: <OptimizedSuspense><NotFound /></OptimizedSuspense> },
    ],
  },
]);
