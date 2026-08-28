import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import RouteErrorFallback from './components/RouteErrorFallback';
import NotFound from './pages/NotFound';
import Home from './pages/Home';
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const EspaceClient = lazy(() => import('./pages/EspaceClient'));
const ClientAccessByToken = lazy(() => import('./pages/ClientAccessByToken'));
const EspaceProspect = lazy(() => import('./pages/EspaceProspect'));
const ProspectDocuments = lazy(() => import('./pages/ProspectDocuments'));
const Contact = lazy(() => import('./pages/Contact'));
const Blog = lazy(() => import('./pages/Blog'));
const Post = lazy(() => import('./pages/Post'));
const AssuranceTaxi = lazy(() => import('./pages/AssuranceTaxi'));
const AssuranceMotoTaxi = lazy(() => import('./pages/AssuranceMotoTaxi'));
const AssuranceTaxiVTC = lazy(() => import('./pages/AssuranceTaxiVTC'));
const AssuranceObligatoireTaxi = lazy(() => import('./pages/AssuranceObligatoireTaxi'));
const PrixAssuranceTaxi = lazy(() => import('./pages/PrixAssuranceTaxi'));
const QuelleAssuranceTaxi = lazy(() => import('./pages/QuelleAssuranceTaxi'));
const RCProfessionnelle = lazy(() => import('./pages/RCProfessionnelle'));
const FlotteVehicules = lazy(() => import('./pages/FlotteVehicules'));
const GestionSinistres = lazy(() => import('./pages/GestionSinistres'));
const TaxisSinistres = lazy(() => import('./pages/TaxisSinistres'));
const ConfianceEtCertifications = lazy(() => import('./pages/ConfianceEtCertifications'));
const ConseilPersonnalise = lazy(() => import('./pages/ConseilPersonnalise'));
const CourtierAssuranceTaxi = lazy(() => import('./pages/CourtierAssuranceTaxi'));
const DevisAssuranceTaxi = lazy(() => import('./pages/DevisAssuranceTaxi'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Legal = lazy(() => import('./pages/Legal'));
const Policy = lazy(() => import('./pages/Policy'));
const Conditions = lazy(() => import('./pages/Conditions'));
const Merci = lazy(() => import('./pages/Merci'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Offers = lazy(() => import('./pages/Offers'));
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
const PaiementLibre = lazy(() => import('./pages/PaiementLibre'));
const PaiementSuccess = lazy(() => import('./pages/PaiementSuccess'));
const PaiementError = lazy(() => import('./pages/PaiementError'));

const AssuranceTaxiParis = lazy(() => import('./pages/AssuranceTaxiParis'));
const AssuranceTaxiMarseille = lazy(() => import('./pages/AssuranceTaxiMarseille'));
const AssuranceTaxiLyon = lazy(() => import('./pages/AssuranceTaxiLyon'));
const AssuranceTaxiToulouse = lazy(() => import('./pages/AssuranceTaxiToulouse'));
const AssuranceTaxiNice = lazy(() => import('./pages/AssuranceTaxiNice'));
const AssuranceTaxiNantes = lazy(() => import('./pages/AssuranceTaxiNantes'));
const AssuranceTaxiStrasbourg = lazy(() => import('./pages/AssuranceTaxiStrasbourg'));
const AssuranceTaxiMontpellier = lazy(() => import('./pages/AssuranceTaxiMontpellier'));
const AssuranceTaxiBordeaux = lazy(() => import('./pages/AssuranceTaxiBordeaux'));
const AssuranceTaxiRennes = lazy(() => import('./pages/AssuranceTaxiRennes'));
const AssuranceTaxiReims = lazy(() => import('./pages/AssuranceTaxiReims'));
const AssuranceTaxiLeMans = lazy(() => import('./pages/AssuranceTaxiLe-Mans'));
const AssuranceTaxiAixEnProvence = lazy(() => import('./pages/AssuranceTaxiAix-en-Provence'));
const AssuranceTaxiClermontFerrand = lazy(() => import('./pages/AssuranceTaxiClermont-Ferrand'));
const AssuranceTaxiGrenoble = lazy(() => import('./pages/AssuranceTaxiGrenoble'));
const AssuranceTaxiDijon = lazy(() => import('./pages/AssuranceTaxiDijon'));
const AssuranceTaxiAngers = lazy(() => import('./pages/AssuranceTaxiAngers'));
const AssuranceTaxiNimes = lazy(() => import('./pages/AssuranceTaxiNimes'));
const AssuranceTaxiVilleurbanne = lazy(() => import('./pages/AssuranceTaxiVilleurbanne'));
const AssuranceTaxiLeHavre = lazy(() => import('./pages/AssuranceTaxiLe-Havre'));
const AssuranceTaxiSaintEtienne = lazy(() => import('./pages/AssuranceTaxiSaint-Etienne'));
const AssuranceTaxiToulon = lazy(() => import('./pages/AssuranceTaxiToulon'));
const AssuranceTaxiOrleans = lazy(() => import('./pages/AssuranceTaxiOrleans'));
const AssuranceTaxiBesancon = lazy(() => import('./pages/AssuranceTaxiBesancon'));
const AssuranceTaxiAmiens = lazy(() => import('./pages/AssuranceTaxiAmiens'));
const AssuranceTaxiTours = lazy(() => import('./pages/AssuranceTaxiTours'));
const AssuranceTaxiLimoges = lazy(() => import('./pages/AssuranceTaxiLimoges'));
const AssuranceTaxiMetz = lazy(() => import('./pages/AssuranceTaxiMetz'));
const AssuranceTaxiBrest = lazy(() => import('./pages/AssuranceTaxiBrest'));
const AssuranceTaxiPerpignan = lazy(() => import('./pages/AssuranceTaxiPerpignan'));
const AssuranceTaxiVauxLePenil = lazy(() => import('./pages/AssuranceTaxiVauxLePenil'));
const AssuranceTaxiSollyAzar = lazy(() => import('./pages/AssuranceTaxiSollyAzar'));

const AuthCallbackLinkedin = lazy(() => import('./pages/AuthCallbackLinkedin'));
const AuthCallbackTwitter = lazy(() => import('./pages/AuthCallbackTwitter'));
const AuthCallbackYoutube = lazy(() => import('./pages/AuthCallbackYoutube'));
const AuthCallbackPinterest = lazy(() => import('./pages/AuthCallbackPinterest'));
const SetPassword = lazy(() => import('./pages/SetPassword'));

const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const ClientDocuments = lazy(() => import('./pages/client/ClientDocuments'));
const ClientNotifications = lazy(() => import('./pages/client/ClientNotifications'));
const ClientPaiements = lazy(() => import('./pages/client/ClientPaiements'));
const ClientDemandes = lazy(() => import('./pages/client/ClientDemandes'));
const ClientParrainage = lazy(() => import('./pages/client/ClientParrainage'));
const ClientConfidentialite = lazy(() => import('./pages/client/ClientConfidentialite'));
const ClientProfil = lazy(() => import('./pages/client/ClientProfil'));
const ClientSinistres = lazy(() => import('./pages/client/ClientSinistres'));

const CRMLayout = lazy(() => import('./backoffice/CRMLayout'));
const CRMKillerDashboard = lazy(() => import('./backoffice/CRMKillerDashboard'));
const WorkflowGuide = lazy(() => import('./backoffice/WorkflowGuide'));
const CRMLeadDetail = lazy(() => import('./backoffice/CRMLeadDetail'));
const CRMPipelineKanban = lazy(() => import('./backoffice/CRMPipelineKanban'));
const CRMInboxMulticanal = lazy(() => import('./backoffice/CRMInboxMulticanal'));
const CRMRetentionCenter = lazy(() => import('./backoffice/CRMRetentionCenter'));
const ClaimsManager = lazy(() => import('./backoffice/ClaimsManager'));
const CRMAIGovernance = lazy(() => import('./backoffice/CRMAIGovernance'));
const CRMAdminSettings = lazy(() => import('./backoffice/CRMAdminSettings'));
const NativePasswordSettings = lazy(() => import('./backoffice/NativePasswordSettings'));
const EmailBlacklistManager = lazy(() => import('./backoffice/EmailBlacklistManager'));
const CRMTemplatesManager = lazy(() => import('./backoffice/CRMTemplatesManager'));
const CRMCommercial = lazy(() => import('./backoffice/CRMCommercial'));
const InboxIntelligent = lazy(() => import('./backoffice/InboxIntelligent'));
const LeadManager = lazy(() => import('./backoffice/LeadManager'));
const ManualLeadCreation = lazy(() => import('./backoffice/ManualLeadCreation'));
const PartnerPortal = lazy(() => import('./backoffice/PartnerPortal'));
const PartnerAuth = lazy(() => import('./backoffice/PartnerAuth'));
const SocialMediaManager = lazy(() => import('./backoffice/SocialMediaManager'));
const AutomationDashboard = lazy(() => import('./backoffice/AutomationDashboard'));
const AutomationLayout = lazy(() => import('./backoffice/AutomationLayout'));
const AnalyticsDashboard = lazy(() => import('./backoffice/AnalyticsDashboard'));
const WhatsAppManager = lazy(() => import('./backoffice/WhatsAppManager'));
const WhatsAppLayout = lazy(() => import('./backoffice/WhatsAppLayout'));
const WhatsAppSettings = lazy(() => import('./backoffice/WhatsAppSettings'));
const EmailMarketingHub = lazy(() => import('./backoffice/EmailMarketingHub'));
const DuplicateLeadsManager = lazy(() => import('./backoffice/DuplicateLeadsManager'));
const MergeLeadsManager = lazy(() => import('./backoffice/MergeLeadsManager'));
const TestAutomations = lazy(() => import('./backoffice/TestAutomations'));
const ClientsManager = lazy(() => import('./backoffice/ClientsManager'));
const ClientInsuranceManager = lazy(() => import('./backoffice/ClientInsuranceManager'));
const ClientsLayout = lazy(() => import('./backoffice/ClientsLayout'));
const MoneticoAccountingDashboard = lazy(() => import('./backoffice/MoneticoAccountingDashboard'));
const FreeInvoicing = lazy(() => import('./backoffice/FreeInvoicing'));
const LeadInvoicing = lazy(() => import('./backoffice/LeadInvoicing'));
const CRMProductionManager = lazy(() => import('./backoffice/CRMProductionManager'));
const WebImportManager = lazy(() => import('./backoffice/WebImportManager'));
const InsuranceCompaniesManager = lazy(() => import('./backoffice/InsuranceCompaniesManager'));
const InsuranceCompaniesStats = lazy(() => import('./backoffice/InsuranceCompaniesStats'));
const InsurerDossierDashboard = lazy(() => import('./backoffice/InsurerDossierDashboard'));
const QuotesManager = lazy(() => import('./backoffice/QuotesManager'));
const PendingDocumentsManager = lazy(() => import('./backoffice/PendingDocumentsManager'));
const AllDocumentsViewer = lazy(() => import('./backoffice/AllDocumentsViewer'));
const QuoteQueueDashboard = lazy(() => import('./backoffice/QuoteQueueDashboard'));
const NewsletterDashboard = lazy(() => import('./backoffice/NewsletterDashboard'));
const EmailSubscribersManager = lazy(() => import('./backoffice/EmailSubscribersManager'));
const NotificationsManager = lazy(() => import('./backoffice/NotificationsManager'));
const EmailMarketingLayout = lazy(() => import('./backoffice/EmailMarketingLayout'));
const SmartTemplatesManager = lazy(() => import('./backoffice/SmartTemplatesManager'));
const ABTestingManager = lazy(() => import('./backoffice/ABTestingManager'));
const EmailAdvancedAnalytics = lazy(() => import('./backoffice/EmailAdvancedAnalytics'));
const PartnerManager = lazy(() => import('./backoffice/PartnerManager'));
const LLMDashboard = lazy(() => import('./backoffice/LLMDashboard'));
const LLMCouncilDashboard = lazy(() => import('./backoffice/LLMCouncilDashboard'));
const AIAutonomousDashboard = lazy(() => import('./backoffice/AIAutonomousDashboard'));
const MasterAI = lazy(() => import('./backoffice/MasterAI'));
const UltronCommandCenter = lazy(() => import('./backoffice/UltronCommandCenter'));
const AutomationScheduler = lazy(() => import('./backoffice/AutomationScheduler'));
const AutoOptimizer = lazy(() => import('./backoffice/AutoOptimizer'));
const AIContentGeneratorUnified = lazy(() => import('./backoffice/AIContentGeneratorUnified'));
const ContentManager = lazy(() => import('./backoffice/ContentManager'));
const NewsManager = lazy(() => import('./backoffice/NewsManager'));
const PopupManager = lazy(() => import('./backoffice/PopupManager'));
const CityPageGenerator = lazy(() => import('./backoffice/CityPageGenerator'));
const TrendAnalyzer = lazy(() => import('./backoffice/TrendAnalyzer'));
const SeoTools = lazy(() => import('./backoffice/SeoTools'));
const SEOStrategyDashboard = lazy(() => import('./backoffice/SEOStrategyDashboard'));
const GSCOptimizationDashboard = lazy(() => import('./backoffice/GSCOptimizationDashboard'));
const GSCAutonomousDashboard = lazy(() => import('./backoffice/GSCAutonomousDashboard'));
const GA4SEODashboard = lazy(() => import('./backoffice/GA4SEODashboard'));
const SEOOpportunitiesDashboard = lazy(() => import('./backoffice/SEOOpportunitiesDashboard'));
const BacklinkManager = lazy(() => import('./backoffice/BacklinkManager'));
const BacklinkProspector = lazy(() => import('./backoffice/BacklinkProspector'));
const BacklinkAutomationDashboard = lazy(() => import('./backoffice/BacklinkAutomationDashboard'));
const OutreachComposer = lazy(() => import('./backoffice/OutreachComposer'));
const MarketingTemplates = lazy(() => import('./backoffice/MarketingTemplates'));
const QRCodeGenerator = lazy(() => import('./backoffice/QRCodeGenerator'));
const Dashboard = lazy(() => import('./backoffice/Dashboard'));
const ConversionAnalytics = lazy(() => import('./backoffice/ConversionAnalytics'));
const AnalyticsLayout = lazy(() => import('./backoffice/AnalyticsLayout'));
const LeadMarketplace = lazy(() => import('./backoffice/LeadMarketplace'));
const UserManagement = lazy(() => import('./backoffice/UserManagement'));
const SecurityDashboard = lazy(() => import('./backoffice/SecurityDashboard'));
const ComplianceCenter = lazy(() => import('./backoffice/ComplianceCenter'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/old-admin',
    element: <AdminDashboard />,
  },
  {
    path: '/espace-client',
    element: <EspaceClient />,
  },
  {
    path: '/espace-client/:token',
    element: <ClientAccessByToken />,
  },
  {
    path: '/espace-client/assurances',
    element: <Navigate to="/client/dashboard" replace />,
  },
  {
    path: '/espace-prospect',
    element: <EspaceProspect />,
  },
  {
    path: '/espace-prospect/:token',
    element: <EspaceProspect />,
  },
  {
    path: '/prospect/documents',
    element: <ProspectDocuments />,
  },
  {
    path: '/espace-prospect/paiement-success',
    element: <PaiementSuccess />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/espace-prospect/paiement-error',
    element: <PaiementError />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/contact',
    element: <Contact />,
  },
  {
    path: '/blog',
    element: <Blog />,
  },
  {
    path: '/blog/:slug',
    element: <Post />,
  },
  {
    path: '/assurance-taxi',
    element: <AssuranceTaxi />,
  },
  {
    path: '/assurance-moto-taxi',
    element: <AssuranceMotoTaxi />,
  },
  {
    path: '/assurance-taxi-vtc',
    element: <AssuranceTaxiVTC />,
  },
  {
    path: '/assurance-obligatoire-taxi',
    element: <AssuranceObligatoireTaxi />,
  },
  {
    path: '/prix-assurance-taxi',
    element: <PrixAssuranceTaxi />,
  },
  {
    path: '/quelle-assurance-taxi',
    element: <QuelleAssuranceTaxi />,
  },
  {
    path: '/rc-professionnelle',
    element: <RCProfessionnelle />,
  },
  {
    path: '/flotte-vehicules',
    element: <FlotteVehicules />,
  },
  {
    path: '/gestion-sinistres',
    element: <GestionSinistres />,
  },
  {
    path: '/taxis-sinistres',
    element: <TaxisSinistres />,
  },
  {
    path: '/confiance-et-certifications',
    element: <ConfianceEtCertifications />,
  },
  {
    path: '/conseil-personnalise',
    element: <ConseilPersonnalise />,
  },
  {
    path: '/courtier-assurance-taxi',
    element: <CourtierAssuranceTaxi />,
  },
  {
    path: '/devis-assurance-taxi',
    element: <DevisAssuranceTaxi />,
  },
  {
    path: '/faq',
    element: <FAQ />,
  },
  {
    path: '/legal',
    element: <Legal />,
  },
  {
    path: '/policy',
    element: <Policy />,
  },
  {
    path: '/conditions',
    element: <Conditions />,
  },
  {
    path: '/merci',
    element: <Merci />,
  },
  {
    path: '/reviews',
    element: <Reviews />,
  },
  {
    path: '/avis',
    element: <Reviews />,
  },
  {
    path: '/offres',
    element: <Offers />,
  },
  {
    path: '/offers',
    element: <Navigate to="/offres" replace />,
  },
  {
    path: '/partners',
    element: <Partners />,
  },
  {
    path: '/partnership',
    element: <PartnershipPage />,
  },
  {
    path: '/programme-partenaires',
    element: <PartnershipPage />,
  },
  {
    path: '/ambassador',
    element: <AmbassadorSignup />,
  },
  {
    path: '/newsletter',
    element: <Newsletter />,
  },
  {
    path: '/newsletter/subscribe',
    element: <NewsletterSubscribe />,
  },
  {
    path: '/newsletter/unsubscribe',
    element: <NewsletterUnsubscribe />,
  },
  {
    path: '/actualites',
    element: <Actualites />,
  },
  {
    path: '/actualites/:slug',
    element: <NewsArticle />,
  },
  {
    path: '/sitemap',
    element: <SitemapPage />,
  },
  {
    path: '/plan-du-site',
    element: <SitemapPage />,
  },
  {
    path: '/villes',
    element: <CityIndex />,
  },
  {
    path: '/villes/:slug',
    element: <CityPage />,
  },
  {
    path: '/ville/:slug',
    element: <CityPage />,
  },
  {
    path: '/m/:path',
    element: <MirrorPage />,
  },
  {
    path: '/paiement/:reference',
    element: <PaiementLibre />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/assurance-taxi-paris',
    element: <AssuranceTaxiParis />,
  },
  {
    path: '/assurance-taxi-marseille',
    element: <AssuranceTaxiMarseille />,
  },
  {
    path: '/assurance-taxi-lyon',
    element: <AssuranceTaxiLyon />,
  },
  {
    path: '/assurance-taxi-toulouse',
    element: <AssuranceTaxiToulouse />,
  },
  {
    path: '/assurance-taxi-nice',
    element: <AssuranceTaxiNice />,
  },
  {
    path: '/assurance-taxi-nantes',
    element: <AssuranceTaxiNantes />,
  },
  {
    path: '/assurance-taxi-strasbourg',
    element: <AssuranceTaxiStrasbourg />,
  },
  {
    path: '/assurance-taxi-montpellier',
    element: <AssuranceTaxiMontpellier />,
  },
  {
    path: '/assurance-taxi-bordeaux',
    element: <AssuranceTaxiBordeaux />,
  },
  {
    path: '/assurance-taxi-rennes',
    element: <AssuranceTaxiRennes />,
  },
  {
    path: '/assurance-taxi-reims',
    element: <AssuranceTaxiReims />,
  },
  {
    path: '/assurance-taxi-le-mans',
    element: <AssuranceTaxiLeMans />,
  },
  {
    path: '/assurance-taxi-aix-en-provence',
    element: <AssuranceTaxiAixEnProvence />,
  },
  {
    path: '/assurance-taxi-clermont-ferrand',
    element: <AssuranceTaxiClermontFerrand />,
  },
  {
    path: '/assurance-taxi-grenoble',
    element: <AssuranceTaxiGrenoble />,
  },
  {
    path: '/assurance-taxi-dijon',
    element: <AssuranceTaxiDijon />,
  },
  {
    path: '/assurance-taxi-angers',
    element: <AssuranceTaxiAngers />,
  },
  {
    path: '/assurance-taxi-nimes',
    element: <AssuranceTaxiNimes />,
  },
  {
    path: '/assurance-taxi-villeurbanne',
    element: <AssuranceTaxiVilleurbanne />,
  },
  {
    path: '/assurance-taxi-le-havre',
    element: <AssuranceTaxiLeHavre />,
  },
  {
    path: '/assurance-taxi-saint-etienne',
    element: <AssuranceTaxiSaintEtienne />,
  },
  {
    path: '/assurance-taxi-toulon',
    element: <AssuranceTaxiToulon />,
  },
  {
    path: '/assurance-taxi-orleans',
    element: <AssuranceTaxiOrleans />,
  },
  {
    path: '/assurance-taxi-besancon',
    element: <AssuranceTaxiBesancon />,
  },
  {
    path: '/assurance-taxi-amiens',
    element: <AssuranceTaxiAmiens />,
  },
  {
    path: '/assurance-taxi-tours',
    element: <AssuranceTaxiTours />,
  },
  {
    path: '/assurance-taxi-limoges',
    element: <AssuranceTaxiLimoges />,
  },
  {
    path: '/assurance-taxi-metz',
    element: <AssuranceTaxiMetz />,
  },
  {
    path: '/assurance-taxi-brest',
    element: <AssuranceTaxiBrest />,
  },
  {
    path: '/assurance-taxi-perpignan',
    element: <AssuranceTaxiPerpignan />,
  },
  {
    path: '/assurance-taxi-vaux-le-penil',
    element: <AssuranceTaxiVauxLePenil />,
  },
  {
    path: '/assurance-taxi-solly-azar',
    element: <AssuranceTaxiSollyAzar />,
  },
  {
    path: '/auth/callback/linkedin',
    element: <AuthCallbackLinkedin />,
  },
  {
    path: '/auth/callback/twitter',
    element: <AuthCallbackTwitter />,
  },
  {
    path: '/auth/callback/youtube',
    element: <AuthCallbackYoutube />,
  },
  {
    path: '/auth/callback/pinterest',
    element: <AuthCallbackPinterest />,
  },
  {
    path: '/auth/set-password',
    element: <SetPassword />,
  },
  {
    path: '/auth/reset-password',
    element: <SetPassword />,
  },
  {
    path: '/reset-password',
    element: <SetPassword />,
  },
  {
    path: '/set-password',
    element: <SetPassword />,
  },
  {
    path: '/mot-de-passe-oublie',
    element: <SetPassword />,
  },
  {
    path: '/client/dashboard',
    element: <ClientDashboard />,
  },
  {
    path: '/client/documents',
    element: <ClientDocuments />,
  },
  {
    path: '/client/notifications',
    element: <ClientNotifications />,
  },
  {
    path: '/client/demandes',
    element: <ClientDemandes />,
  },
  {
    path: '/client/paiements',
    element: <ClientPaiements />,
  },
  {
    path: '/client/parrainage',
    element: <ClientParrainage />,
  },
  {
    path: '/client/confidentialite',
    element: <ClientConfidentialite />,
  },
  {
    path: '/client/profil',
    element: <ClientProfil />,
  },
  {
    path: '/client/sinistres',
    element: <ClientSinistres />,
  },

  /* ─────────────────────────────────────────────────────────────────────
     BACKOFFICE — single CRMLayout parent, all routes as children.
     This ensures the sidebar mounts once and persists across navigation.
  ───────────────────────────────────────────────────────────────────── */
  {
    path: '/backoffice',
    element: <CRMLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      /* ── Dashboard ── */
      { index: true, element: <CRMKillerDashboard /> },
      { path: 'dashboard', element: <CRMKillerDashboard /> },
      { path: 'crm', element: <CRMKillerDashboard /> },

      /* ── CRM Killer sub-section ── */
      {
        path: 'crm-killer',
        children: [
          { index: true, element: <CRMKillerDashboard /> },
          { path: 'pipeline', element: <CRMPipelineKanban /> },
          { path: 'inbox', element: <CRMInboxMulticanal /> },
          { path: 'inbox-intelligent', element: <InboxIntelligent /> },
          { path: 'retention', element: <CRMRetentionCenter /> },
          { path: 'ia', element: <CRMAIGovernance /> },
          { path: 'templates', element: <CRMTemplatesManager /> },
          { path: 'settings', element: <CRMAdminSettings /> },
          { path: 'email-blacklist', element: <EmailBlacklistManager /> },
          { path: 'lead/:leadId', element: <CRMLeadDetail /> },
        ],
      },

      /* ── CRM direct routes ── */
      { path: 'crm/create-lead', element: <ManualLeadCreation /> },
      { path: 'change-password', element: <NativePasswordSettings /> },
      { path: 'crm/lead/:leadId', element: <CRMLeadDetail /> },

      /* ── Leads & Clients ── */
      { path: 'claims', element: <ClaimsManager /> },
      { path: 'crm-commercial', element: <CRMCommercial /> },
      { path: 'lead-manager', element: <LeadManager /> },
      { path: 'doublons', element: <DuplicateLeadsManager /> },
      { path: 'fusion-leads', element: <MergeLeadsManager /> },
      { path: 'quote-queue', element: <QuoteQueueDashboard /> },
      { path: 'workflow-guide', element: <WorkflowGuide /> },
      { path: 'quotes', element: <QuotesManager /> },
      { path: 'pending-documents', element: <PendingDocumentsManager /> },
      { path: 'documents', element: <AllDocumentsViewer /> },

      /* ── Clients section — secondary inner sidebar ── */
      {
        path: 'clients',
        element: <ClientsLayout />,
        children: [
          { index: true, element: <ClientsManager /> },
          { path: ':leadId', element: <ClientInsuranceManager /> },
        ],
      },

      /* ── Insurance & Production ── */
      { path: 'insurance-companies', element: <InsuranceCompaniesManager /> },
      { path: 'insurance-companies-stats', element: <InsuranceCompaniesStats /> },
      { path: 'insurer-dossiers', element: <InsurerDossierDashboard /> },
      { path: 'production', element: <CRMProductionManager /> },
      { path: 'web-import', element: <WebImportManager /> },

      /* ── Finance ── */
      { path: 'monetico-accounting', element: <MoneticoAccountingDashboard /> },
      { path: 'invoicing', element: <FreeInvoicing /> },
      { path: 'free-invoicing', element: <FreeInvoicing /> },
      { path: 'lead-invoicing', element: <LeadInvoicing /> },

      /* ── Partners ── */
      { path: 'partner-portal', element: <PartnerPortal /> },
      { path: 'partner-auth', element: <PartnerAuth /> },
      { path: 'partners', element: <PartnerManager /> },
      { path: 'lead-marketplace', element: <LeadMarketplace /> },

      /* ── Social ── */
      { path: 'social-media', element: <SocialMediaManager /> },
      { path: 'social-connections', element: <SocialMediaManager /> },

      /* ── Email Marketing — secondary inner sidebar ── */
      {
        path: 'email-marketing',
        element: <EmailMarketingLayout />,
        children: [{ index: true, element: <EmailMarketingHub /> }],
      },
      {
        path: 'newsletter',
        element: <EmailMarketingLayout />,
        children: [{ index: true, element: <NewsletterDashboard /> }],
      },
      {
        path: 'email-subscribers',
        element: <EmailMarketingLayout />,
        children: [{ index: true, element: <EmailSubscribersManager /> }],
      },
      {
        path: 'notifications',
        element: <EmailMarketingLayout />,
        children: [{ index: true, element: <NotificationsManager /> }],
      },
      {
        path: 'smart-templates',
        element: <EmailMarketingLayout />,
        children: [{ index: true, element: <SmartTemplatesManager /> }],
      },
      {
        path: 'ab-testing',
        element: <EmailMarketingLayout />,
        children: [{ index: true, element: <ABTestingManager /> }],
      },
      {
        path: 'email-analytics',
        element: <EmailMarketingLayout />,
        children: [{ index: true, element: <EmailAdvancedAnalytics /> }],
      },

      /* ── Analytics — secondary inner sidebar ── */
      {
        path: 'analytics',
        element: <AnalyticsLayout />,
        children: [{ index: true, element: <AnalyticsDashboard /> }],
      },
      {
        path: 'conversion',
        element: <AnalyticsLayout />,
        children: [{ index: true, element: <ConversionAnalytics /> }],
      },

      /* ── WhatsApp — secondary inner sidebar ── */
      {
        path: 'whatsapp',
        element: <WhatsAppLayout />,
        children: [{ index: true, element: <WhatsAppManager /> }],
      },
      {
        path: 'whatsapp-settings',
        element: <WhatsAppLayout />,
        children: [{ index: true, element: <WhatsAppSettings /> }],
      },

      /* ── Automations — secondary inner sidebar ── */
      {
        path: 'automations',
        element: <AutomationLayout />,
        children: [{ index: true, element: <AutomationDashboard /> }],
      },
      {
        path: 'test-automations',
        element: <AutomationLayout />,
        children: [{ index: true, element: <TestAutomations /> }],
      },
      {
        path: 'automation-scheduler',
        element: <AutomationLayout />,
        children: [{ index: true, element: <AutomationScheduler /> }],
      },
      {
        path: 'backlink-automation',
        element: <AutomationLayout />,
        children: [{ index: true, element: <BacklinkAutomationDashboard /> }],
      },

      /* ── AI ── */
      { path: 'llm-dashboard', element: <LLMDashboard /> },
      { path: 'llm-council', element: <LLMCouncilDashboard /> },
      { path: 'ai-autonomous', element: <AIAutonomousDashboard /> },
      { path: 'master-ai', element: <MasterAI /> },
      { path: 'ultron', element: <UltronCommandCenter /> },
      { path: 'auto-optimizer', element: <AutoOptimizer /> },
      { path: 'ai-generator', element: <AIContentGeneratorUnified /> },

      /* ── Content ── */
      { path: 'content', element: <ContentManager /> },
      { path: 'news', element: <NewsManager /> },
      { path: 'popups', element: <PopupManager /> },
      { path: 'generate-cities', element: <CityPageGenerator /> },
      { path: 'trend-analyzer', element: <TrendAnalyzer /> },

      /* ── SEO ── */
      { path: 'seo', element: <SeoTools /> },
      { path: 'seo-strategy', element: <SEOStrategyDashboard /> },
      { path: 'gsc-optimization', element: <GSCOptimizationDashboard /> },
      { path: 'gsc-autonomous', element: <GSCAutonomousDashboard /> },
      { path: 'ga4-seo', element: <GA4SEODashboard /> },
      { path: 'seo-opportunities', element: <SEOOpportunitiesDashboard /> },
      { path: 'backlinks', element: <BacklinkManager /> },
      { path: 'backlink-prospector', element: <BacklinkProspector /> },
      { path: 'outreach', element: <OutreachComposer /> },

      /* ── Marketing ── */
      { path: 'marketing-templates', element: <MarketingTemplates /> },
      { path: 'qr-codes', element: <QRCodeGenerator /> },

      /* ── Admin ── */
      { path: 'users', element: <UserManagement /> },
      { path: 'security', element: <SecurityDashboard /> },
      { path: 'compliance', element: <ComplianceCenter /> },

      /* ── Legacy ── */
      { path: 'old-dashboard', element: <Dashboard /> },
    ],
  },

  /* Legacy /admin alias */
  {
    path: '/admin',
    element: <CRMLayout />,
    children: [{ index: true, element: <CRMKillerDashboard /> }],
  },

  {
    path: '/:slug',
    element: <CityPage />,
  },

  {
    path: '*',
    element: <NotFound />,
  },
]);
