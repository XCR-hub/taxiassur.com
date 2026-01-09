import { createBrowserRouter } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ScrollToTop from './components/ScrollToTop';
import AuthGuard from './components/AuthGuard';
import RootLayout from './components/RootLayout';
import RouteErrorFallback from './components/RouteErrorFallback';

const Home = lazy(() => import('./pages/Home'));
const Blog = lazy(() => import('./pages/Blog'));
const Post = lazy(() => import('./pages/Post'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Offers = lazy(() => import('./pages/Offers'));
const Contact = lazy(() => import('./pages/Contact'));
const Merci = lazy(() => import('./pages/Merci'));
const ProspectDocuments = lazy(() => import('./pages/ProspectDocuments'));
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
const PrixAssuranceTaxi = lazy(() => import('./pages/PrixAssuranceTaxi'));
const AssuranceTaxiVTC = lazy(() => import('./pages/AssuranceTaxiVTC'));
const AssuranceTaxiParis = lazy(() => import('./pages/AssuranceTaxiParis'));
const AssuranceMotoTaxi = lazy(() => import('./pages/AssuranceMotoTaxi'));
const QuelleAssuranceTaxi = lazy(() => import('./pages/QuelleAssuranceTaxi'));
const AssuranceObligatoireTaxi = lazy(() => import('./pages/AssuranceObligatoireTaxi'));
const AssuranceTaxiLyon = lazy(() => import('./pages/AssuranceTaxiLyon'));
const AssuranceTaxiMarseille = lazy(() => import('./pages/AssuranceTaxiMarseille'));
const AssuranceTaxiToulouse = lazy(() => import('./pages/AssuranceTaxiToulouse'));
const AssuranceTaxiNice = lazy(() => import('./pages/AssuranceTaxiNice'));
const AssuranceTaxiBordeaux = lazy(() => import('./pages/AssuranceTaxiBordeaux'));
const OfferPage = lazy(() => import('./components/OfferPage'));
const Dashboard = lazy(() => import('./backoffice/Dashboard'));
const BacklinkManager = lazy(() => import('./backoffice/BacklinkManager'));
const PartnerManager = lazy(() => import('./backoffice/PartnerManager'));
const ContentManager = lazy(() => import('./backoffice/ContentManager'));
const SeoTools = lazy(() => import('./backoffice/SeoTools'));
const SecurityDashboard = lazy(() => import('./backoffice/SecurityDashboard'));
const ConversionAnalytics = lazy(() => import('./backoffice/ConversionAnalytics'));
const AnalyticsDashboard = lazy(() => import('./backoffice/AnalyticsDashboard'));
const ToastDemo = lazy(() => import('./backoffice/ToastDemo'));
const DataTableDemo = lazy(() => import('./backoffice/DataTableDemo'));
const KanbanDemo = lazy(() => import('./backoffice/KanbanDemo'));
const FileUploaderDemo = lazy(() => import('./backoffice/FileUploaderDemo'));
const CalendarDemo = lazy(() => import('./backoffice/CalendarDemo'));
const TooltipDemo = lazy(() => import('./backoffice/TooltipDemo'));
const UIComponentsDemo = lazy(() => import('./backoffice/UIComponentsDemo'));
const ProgressTimelineDemo = lazy(() => import('./backoffice/ProgressTimelineDemo'));
const InsuranceCompaniesManager = lazy(() => import('./backoffice/InsuranceCompaniesManager'));
const QuickDocumentsUpload = lazy(() => import('./backoffice/QuickDocumentsUpload'));
// PartnerFinder supprimé - redirige vers BacklinkReports
const ProspectReview = lazy(() => import('./backoffice/ProspectReview'));
const OutreachComposer = lazy(() => import('./backoffice/OutreachComposer'));
const ComplianceCenter = lazy(() => import('./backoffice/ComplianceCenter'));
const AuthCallbackYoutube = lazy(() => import('./pages/AuthCallbackYoutube'));
const AuthCallbackLinkedin = lazy(() => import('./pages/AuthCallbackLinkedin'));
const DirectoryAssistant = lazy(() => import('./backoffice/DirectoryAssistant'));
const PopupManager = lazy(() => import('./backoffice/PopupManager'));
const NewsManager = lazy(() => import('./backoffice/NewsManager'));
const LeadMarketplace = lazy(() => import('./backoffice/LeadMarketplace'));
const PartnerPortal = lazy(() => import('./backoffice/PartnerPortal'));
const LeadManager = lazy(() => import('./backoffice/LeadManager'));
const BacklinkProspector = lazy(() => import('./backoffice/BacklinkProspector'));
const BacklinkAutomationDashboard = lazy(() => import('./backoffice/BacklinkAutomationDashboard'));
const BacklinkReports = lazy(() => import('./backoffice/BacklinkReports'));
const SEOStrategyDashboard = lazy(() => import('./backoffice/SEOStrategyDashboard'));
// AIContentGenerator legacy supprimé - utiliser AIContentGeneratorUnified
const AIContentGeneratorUnified = lazy(() => import('./backoffice/AIContentGeneratorUnified'));
const AutomationScheduler = lazy(() => import('./backoffice/AutomationScheduler'));
const AutoOptimizer = lazy(() => import('./backoffice/AutoOptimizer'));
const MasterAI = lazy(() => import('./backoffice/MasterAI'));
const AIAutonomousDashboard = lazy(() => import('./backoffice/AIAutonomousDashboard'));
const TrendAnalyzer = lazy(() => import('./backoffice/TrendAnalyzer'));
const ProspectSeeder = lazy(() => import('./backoffice/ProspectSeeder'));
const CampaignLauncher = lazy(() => import('./backoffice/CampaignLauncher'));
const NewsletterPage = lazy(() => import('./pages/Newsletter'));
const MirrorPage = lazy(() => import('./pages/MirrorPage'));
const MasterDashboard = lazy(() => import('./backoffice/MasterDashboard'));
const AmbassadorSignup = lazy(() => import('./pages/AmbassadorSignup'));
const ConfianceEtCertifications = lazy(() => import('./pages/ConfianceEtCertifications'));
const SocialMediaManager = lazy(() => import('./backoffice/SocialMediaManager'));
const MarketingTemplates = lazy(() => import('./backoffice/MarketingTemplates'));
const QRCodeGenerator = lazy(() => import('./backoffice/QRCodeGenerator'));
const TaxisSinistres = lazy(() => import('./pages/TaxisSinistres'));
const Actualites = lazy(() => import('./pages/Actualites'));
const UserManagement = lazy(() => import('./backoffice/UserManagement'));
const NewsArticle = lazy(() => import('./pages/NewsArticle'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CityPageGenerator = lazy(() => import('./backoffice/CityPageGenerator'));
const TestAutomations = lazy(() => import('./backoffice/TestAutomations'));
const AIMasterDashboard = lazy(() => import('./backoffice/AIMasterDashboard'));
const CRMCommercial = lazy(() => import('./backoffice/CRMCommercial'));
const WhatsAppManager = lazy(() => import('./backoffice/WhatsAppManager'));
const WhatsAppSettings = lazy(() => import('./backoffice/WhatsAppSettings'));
const AutomationDashboard = lazy(() => import('./backoffice/AutomationDashboard'));
const AutonomousSystemDashboard = lazy(() => import('./backoffice/AutonomousSystemDashboard'));
const PipelineCRMDashboard = lazy(() => import('./backoffice/PipelineCRMDashboard'));
const CRMUniversal = lazy(() => import('./backoffice/CRMUniversal'));
const CRMMaster = lazy(() => import('./backoffice/CRMMaster'));
const CRMSaaSDashboard = lazy(() => import('./backoffice/CRMSaaSDashboard'));
const CRMKiller = lazy(() => import('./backoffice/CRMKiller'));
const CRMKillerDashboard = lazy(() => import('./backoffice/CRMKillerDashboard'));
const CRMPipelineKanban = lazy(() => import('./backoffice/CRMPipelineKanban'));
const CRMInboxMulticanal = lazy(() => import('./backoffice/CRMInboxMulticanal'));
const CRMProductionManager = lazy(() => import('./backoffice/CRMProductionManager'));
const CRMRetentionCenter = lazy(() => import('./backoffice/CRMRetentionCenter'));
const CRMTemplatesManager = lazy(() => import('./backoffice/CRMTemplatesManager'));
const CRMAIGovernance = lazy(() => import('./backoffice/CRMAIGovernance'));
const CRMLeadDetail = lazy(() => import('./backoffice/CRMLeadDetail'));
const CRMAdminSettings = lazy(() => import('./backoffice/CRMAdminSettings'));
const EspaceClient = lazy(() => import('./pages/EspaceClient'));
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const ClientDocuments = lazy(() => import('./pages/client/ClientDocuments'));
const ClientSinistres = lazy(() => import('./pages/client/ClientSinistres'));
const ClientPaiements = lazy(() => import('./pages/client/ClientPaiements'));
const ClientNotifications = lazy(() => import('./pages/client/ClientNotifications'));
const ClientProfil = lazy(() => import('./pages/client/ClientProfil'));
const EmailMarketingHub = lazy(() => import('./backoffice/EmailMarketingHub'));
const SmartTemplatesManager = lazy(() => import('./backoffice/SmartTemplatesManager'));
const ABTestingManager = lazy(() => import('./backoffice/ABTestingManager'));
const NotificationsManager = lazy(() => import('./backoffice/NotificationsManager'));
const EmailAdvancedAnalytics = lazy(() => import('./backoffice/EmailAdvancedAnalytics'));
const EmailInboxManager = lazy(() => import('./backoffice/EmailInboxManager'));
const NewsletterDashboard = lazy(() => import('./backoffice/NewsletterDashboard'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-300">Chargement...</p>
    </div>
  </div>
);

const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingFallback />}>
    <ScrollToTop />
    {children}
  </Suspense>
);

// Note: ErrorBoundary is now a proper class component in src/components/ErrorBoundary.tsx
// For route errors, we use RouteErrorFallback component

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <SuspenseWrapper><Home /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/assurance-taxi',
        element: <SuspenseWrapper><AssuranceTaxi /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/rc-professionnelle',
        element: <SuspenseWrapper><RCProfessionnelle /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/flotte-vehicules',
        element: <SuspenseWrapper><FlotteVehicules /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/conseil-personnalise',
        element: <SuspenseWrapper><ConseilPersonnalise /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/gestion-sinistres',
        element: <SuspenseWrapper><GestionSinistres /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/taxis-sinistres',
        element: <SuspenseWrapper><TaxisSinistres /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/prix-assurance-taxi',
        element: <SuspenseWrapper><PrixAssuranceTaxi /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/assurance-taxi-vtc',
        element: <SuspenseWrapper><AssuranceTaxiVTC /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/assurance-taxi-paris',
        element: <SuspenseWrapper><AssuranceTaxiParis /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/assurance-moto-taxi',
        element: <SuspenseWrapper><AssuranceMotoTaxi /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/quelle-assurance-pour-taxi',
        element: <SuspenseWrapper><QuelleAssuranceTaxi /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/assurance-obligatoire-taxi',
        element: <SuspenseWrapper><AssuranceObligatoireTaxi /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/assurance-taxi-lyon',
        element: <SuspenseWrapper><AssuranceTaxiLyon /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/assurance-taxi-marseille',
        element: <SuspenseWrapper><AssuranceTaxiMarseille /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/assurance-taxi-toulouse',
        element: <SuspenseWrapper><AssuranceTaxiToulouse /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/assurance-taxi-nice',
        element: <SuspenseWrapper><AssuranceTaxiNice /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/assurance-taxi-bordeaux',
        element: <SuspenseWrapper><AssuranceTaxiBordeaux /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/blog',
        element: <SuspenseWrapper><Blog /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/blog/:id',
        element: <SuspenseWrapper><Post /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/actualites',
        element: <SuspenseWrapper><Actualites /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/actualites/:slug',
        element: <SuspenseWrapper><NewsArticle /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/faq',
        element: <SuspenseWrapper><FAQ /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/avis',
        element: <SuspenseWrapper><Reviews /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/offres',
        element: <SuspenseWrapper><Offers /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/offres/:id',
        element: <SuspenseWrapper><OfferPage /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/contact',
        element: <SuspenseWrapper><Contact /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/merci',
        element: <SuspenseWrapper><Merci /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/espace-documents',
        element: <SuspenseWrapper><ProspectDocuments /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/mentions-legales',
        element: <SuspenseWrapper><Legal /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/legal',
        element: <SuspenseWrapper><Legal /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/politique-confidentialite',
        element: <SuspenseWrapper><Policy /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/policy',
        element: <SuspenseWrapper><Policy /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/conditions-generales',
        element: <SuspenseWrapper><Conditions /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/conditions',
        element: <SuspenseWrapper><Conditions /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/plan-du-site',
        element: <SuspenseWrapper><SitemapPage /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/newsletter',
        element: <SuspenseWrapper><NewsletterPage /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/confiance-certifications',
        element: <SuspenseWrapper><ConfianceEtCertifications /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/espace-client',
        element: <SuspenseWrapper><EspaceClient /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/client/dashboard',
        element: <SuspenseWrapper><ClientDashboard /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/client/documents',
        element: <SuspenseWrapper><ClientDocuments /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/client/sinistres',
        element: <SuspenseWrapper><ClientSinistres /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/client/paiements',
        element: <SuspenseWrapper><ClientPaiements /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/client/notifications',
        element: <SuspenseWrapper><ClientNotifications /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/client/profil',
        element: <SuspenseWrapper><ClientProfil /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/partenaires',
        element: <SuspenseWrapper><Partners /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/programme-partenaires',
        element: <SuspenseWrapper><PartnershipPage /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/devenir-partenaire',
        element: <SuspenseWrapper><PartnershipPage /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/villes',
        element: <SuspenseWrapper><CityIndex /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/ville/:city',
        element: <SuspenseWrapper><CityPage /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      },
      {
        path: '/admin',
        element: <Navigate to="/backoffice" replace />
      },
      {
        path: '/backoffice',
        element: <SuspenseWrapper><Dashboard /></SuspenseWrapper>,
        errorElement: <RouteErrorFallback />
      },
      {
        path: '/admin/dashboard',
        element: <Navigate to="/backoffice" replace />
      },
      {
        path: '/admin/leads',
        element: <Navigate to="/backoffice/leads" replace />
      },
      {
        path: '/backoffice/master-dashboard',
        element: <AuthGuard><SuspenseWrapper><MasterDashboard /></SuspenseWrapper></AuthGuard>,
        errorElement: <RouteErrorFallback />
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
        path: '/backoffice/users',
        element: <AuthGuard><SuspenseWrapper><UserManagement /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/analytics',
        element: <AuthGuard><SuspenseWrapper><AnalyticsDashboard /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/conversion-analytics',
        element: <AuthGuard><SuspenseWrapper><ConversionAnalytics /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/toast-demo',
        element: <AuthGuard><SuspenseWrapper><ToastDemo /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/datatable-demo',
        element: <AuthGuard><SuspenseWrapper><DataTableDemo /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/kanban-demo',
        element: <AuthGuard><SuspenseWrapper><KanbanDemo /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/fileuploader-demo',
        element: <AuthGuard><SuspenseWrapper><FileUploaderDemo /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/calendar-demo',
        element: <AuthGuard><SuspenseWrapper><CalendarDemo /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/tooltip-demo',
        element: <AuthGuard><SuspenseWrapper><TooltipDemo /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/ui-components-demo',
        element: <AuthGuard><SuspenseWrapper><UIComponentsDemo /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/progress-timeline-demo',
        element: <AuthGuard><SuspenseWrapper><ProgressTimelineDemo /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/insurance-companies',
        element: <AuthGuard><SuspenseWrapper><InsuranceCompaniesManager /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/quick-documents-upload',
        element: <AuthGuard><SuspenseWrapper><QuickDocumentsUpload /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/partner-finder',
        element: <Navigate to="/backoffice/backlink-reports" replace />
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
        element: <Navigate to="/backoffice/crm" replace />
      },
      {
        path: '/backoffice/crm',
        element: <AuthGuard><SuspenseWrapper><CRMKiller /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/crm-killer/pipeline',
        element: <AuthGuard><SuspenseWrapper><CRMPipelineKanban /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/crm-killer/inbox',
        element: <AuthGuard><SuspenseWrapper><CRMInboxMulticanal /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/crm-killer/production',
        element: <AuthGuard><SuspenseWrapper><CRMProductionManager /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/crm-killer/retention',
        element: <AuthGuard><SuspenseWrapper><CRMRetentionCenter /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/crm-killer/templates',
        element: <AuthGuard><SuspenseWrapper><CRMTemplatesManager /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/crm-killer/ia',
        element: <AuthGuard><SuspenseWrapper><CRMAIGovernance /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/crm-killer/lead/:leadId',
        element: <AuthGuard><SuspenseWrapper><CRMLeadDetail /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/crm-killer/settings',
        element: <AuthGuard><SuspenseWrapper><CRMAdminSettings /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/crm-killer/email-inbox',
        element: <AuthGuard><SuspenseWrapper><EmailInboxManager /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/crm-old',
        element: <AuthGuard><SuspenseWrapper><CRMSaaSDashboard /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/crm-master',
        element: <Navigate to="/backoffice/crm" replace />
      },
      {
        path: '/backoffice/crm-universal',
        element: <Navigate to="/backoffice/crm" replace />
      },
      {
        path: '/backoffice/crm-commercial',
        element: <Navigate to="/backoffice/crm" replace />
      },
      {
        path: '/backoffice/pipeline-crm',
        element: <Navigate to="/backoffice/crm" replace />
      },
      {
        path: '/backoffice/automations',
        element: <AuthGuard><SuspenseWrapper><AutomationDashboard /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/whatsapp',
        element: <AuthGuard><SuspenseWrapper><WhatsAppManager /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/whatsapp-settings',
        element: <AuthGuard><SuspenseWrapper><WhatsAppSettings /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/email-marketing',
        element: <AuthGuard><SuspenseWrapper><EmailMarketingHub /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/smart-templates',
        element: <AuthGuard><SuspenseWrapper><SmartTemplatesManager /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/ab-testing',
        element: <AuthGuard><SuspenseWrapper><ABTestingManager /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/notifications',
        element: <AuthGuard><SuspenseWrapper><NotificationsManager /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/email-analytics',
        element: <AuthGuard><SuspenseWrapper><EmailAdvancedAnalytics /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/newsletter',
        element: <AuthGuard><SuspenseWrapper><NewsletterDashboard /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/auth/youtube/callback',
        element: <SuspenseWrapper><AuthCallbackYoutube /></SuspenseWrapper>
      },
      {
        path: '/auth/linkedin/callback',
        element: <SuspenseWrapper><AuthCallbackLinkedin /></SuspenseWrapper>
      },
      {
        path: '/backoffice/lead-manager',
        element: <AuthGuard><SuspenseWrapper><LeadManager /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/backlink-prospector',
        element: <AuthGuard><SuspenseWrapper><BacklinkProspector /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/backlink-automation',
        element: <AuthGuard><SuspenseWrapper><BacklinkAutomationDashboard /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/backlink-reports',
        element: <AuthGuard><SuspenseWrapper><BacklinkReports /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/seo-strategy',
        element: <AuthGuard><SuspenseWrapper><SEOStrategyDashboard /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/ai-generator',
        element: <AuthGuard><SuspenseWrapper><AIContentGeneratorUnified /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/ai-generator-legacy',
        element: <Navigate to="/backoffice/ai-generator" replace />
      },
      {
        path: '/backoffice/automation-scheduler',
        element: <AuthGuard><SuspenseWrapper><AutomationScheduler /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/auto-optimizer',
        element: <AuthGuard><SuspenseWrapper><AutoOptimizer /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/master-ai',
        element: <AuthGuard><SuspenseWrapper><MasterAI /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/ai-master-dashboard',
        element: <AuthGuard><SuspenseWrapper><AIMasterDashboard /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/ai-autonomous',
        element: <AuthGuard><SuspenseWrapper><AIAutonomousDashboard /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/autonomous-system',
        element: <AuthGuard><SuspenseWrapper><AutonomousSystemDashboard /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/trend-analyzer',
        element: <AuthGuard><SuspenseWrapper><TrendAnalyzer /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/seed-prospects',
        element: <AuthGuard><SuspenseWrapper><ProspectSeeder /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/launch-campaign',
        element: <AuthGuard><SuspenseWrapper><CampaignLauncher /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/social-media',
        element: <AuthGuard><SuspenseWrapper><SocialMediaManager /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/marketing-templates',
        element: <AuthGuard><SuspenseWrapper><MarketingTemplates /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/qr-codes',
        element: <AuthGuard><SuspenseWrapper><QRCodeGenerator /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/data',
        element: <AuthGuard><SuspenseWrapper><AdminDashboard /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/generate-cities',
        element: <AuthGuard><SuspenseWrapper><CityPageGenerator /></SuspenseWrapper></AuthGuard>
      },
      {
        path: '/backoffice/test-automations',
        element: <AuthGuard><SuspenseWrapper><TestAutomations /></SuspenseWrapper></AuthGuard>
      },
      // Pages miroirs longue traîne (17 routes)
      { path: '/assurance-taxi-pas-cher', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/tarif-assurance-taxi-2025', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/devis-assurance-taxi-gratuit-2025', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/comparateur-assurance-taxi-2025', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-axa-vs-generali', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-urgence-24h', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-immediat', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-jeune-conducteur-moins-25-ans', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-resilié-malussé', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-auto-entrepreneur', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-electrique-hybride', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-tesla-model-3', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-et-vtc-combine', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/rc-pro-taxi-obligatoire', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-tous-risques-vs-tiers', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-rennes-35', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      { path: '/assurance-taxi-reims-51', element: <SuspenseWrapper><MirrorPage /></SuspenseWrapper> },
      // Ambassadeurs
      { path: '/devenir-ambassadeur', element: <SuspenseWrapper><AmbassadorSignup /></SuspenseWrapper> }
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});