import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import RouteErrorFallback from './components/RouteErrorFallback';

const Home = lazy(() => import('./pages/Home'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const EspaceClient = lazy(() => import('./pages/EspaceClient'));
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
const DownPaymentPage = lazy(() => import('./pages/DownPaymentPage'));
const TestNotifications = lazy(() => import('./pages/TestNotifications'));
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

const AuthCallbackLinkedin = lazy(() => import('./pages/AuthCallbackLinkedin'));
const AuthCallbackTwitter = lazy(() => import('./pages/AuthCallbackTwitter'));
const AuthCallbackYoutube = lazy(() => import('./pages/AuthCallbackYoutube'));
const AuthCallbackPinterest = lazy(() => import('./pages/AuthCallbackPinterest'));

const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const ClientDocuments = lazy(() => import('./pages/client/ClientDocuments'));
const ClientNotifications = lazy(() => import('./pages/client/ClientNotifications'));
const ClientPaiements = lazy(() => import('./pages/client/ClientPaiements'));
const ClientProfil = lazy(() => import('./pages/client/ClientProfil'));
const ClientSinistres = lazy(() => import('./pages/client/ClientSinistres'));
const ClientInsuranceSpace = lazy(() => import('./pages/client/ClientInsuranceSpace'));

const BackofficeDashboard = lazy(() => import('./backoffice/Dashboard'));
const CRMLayout = lazy(() => import('./backoffice/CRMLayout'));
const CRMKillerDashboard = lazy(() => import('./backoffice/CRMKillerDashboard'));
const CRMLeadDetail = lazy(() => import('./backoffice/CRMLeadDetail'));
const CRMPipelineKanban = lazy(() => import('./backoffice/CRMPipelineKanban'));
const CRMInboxMulticanal = lazy(() => import('./backoffice/CRMInboxMulticanal'));
const CRMRetentionCenter = lazy(() => import('./backoffice/CRMRetentionCenter'));
const CRMAIGovernance = lazy(() => import('./backoffice/CRMAIGovernance'));
const CRMAdminSettings = lazy(() => import('./backoffice/CRMAdminSettings'));
const CRMTemplatesManager = lazy(() => import('./backoffice/CRMTemplatesManager'));
const CRMCommercial = lazy(() => import('./backoffice/CRMCommercial'));
const InboxIntelligent = lazy(() => import('./backoffice/InboxIntelligent'));
const LeadManager = lazy(() => import('./backoffice/LeadManager'));
const PartnerPortal = lazy(() => import('./backoffice/PartnerPortal'));
const PartnerAuth = lazy(() => import('./backoffice/PartnerAuth'));
const SocialMediaManager = lazy(() => import('./backoffice/SocialMediaManager'));
const AutomationDashboard = lazy(() => import('./backoffice/AutomationDashboard'));
const AnalyticsDashboard = lazy(() => import('./backoffice/AnalyticsDashboard'));
const WhatsAppManager = lazy(() => import('./backoffice/WhatsAppManager'));
const EmailMarketingHub = lazy(() => import('./backoffice/EmailMarketingHub'));
const DuplicateLeadsManager = lazy(() => import('./backoffice/DuplicateLeadsManager'));
const TestAutomations = lazy(() => import('./backoffice/TestAutomations'));
const ClientsManager = lazy(() => import('./backoffice/ClientsManager'));
const ClientInsuranceManager = lazy(() => import('./backoffice/ClientInsuranceManager'));
const MoneticoAccountingDashboard = lazy(() => import('./backoffice/MoneticoAccountingDashboard'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/admin',
    element: <AdminDashboard />,
  },
  {
    path: '/espace-client',
    element: <EspaceClient />,
  },
  {
    path: '/espace-client/assurances',
    element: <ClientInsuranceSpace />,
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
    path: '/offers',
    element: <Offers />,
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
    path: '/down-payment',
    element: <DownPaymentPage />,
  },
  {
    path: '/test-notifications',
    element: <TestNotifications />,
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
    path: '/client/paiements',
    element: <ClientPaiements />,
  },
  {
    path: '/client/profil',
    element: <ClientProfil />,
  },
  {
    path: '/client/sinistres',
    element: <ClientSinistres />,
  },
  {
    path: '/backoffice',
    element: <BackofficeDashboard />,
  },
  {
    path: '/backoffice/dashboard',
    element: <BackofficeDashboard />,
  },
  {
    path: '/backoffice/clients',
    element: <ClientsManager />,
  },
  {
    path: '/backoffice/clients/:leadId',
    element: <ClientInsuranceManager />,
  },
  {
    path: '/backoffice/monetico-accounting',
    element: <MoneticoAccountingDashboard />,
  },
  {
    path: '/backoffice/crm',
    element: <CRMLayout />,
    children: [
      {
        index: true,
        element: <CRMKillerDashboard />,
      },
    ],
  },
  {
    path: '/backoffice/crm-killer',
    element: <CRMLayout />,
    children: [
      {
        index: true,
        element: <CRMKillerDashboard />,
      },
      {
        path: 'pipeline',
        element: <CRMPipelineKanban />,
      },
      {
        path: 'inbox',
        element: <CRMInboxMulticanal />,
      },
      {
        path: 'inbox-intelligent',
        element: <InboxIntelligent />,
      },
      {
        path: 'retention',
        element: <CRMRetentionCenter />,
      },
      {
        path: 'ia',
        element: <CRMAIGovernance />,
      },
      {
        path: 'templates',
        element: <CRMTemplatesManager />,
      },
      {
        path: 'settings',
        element: <CRMAdminSettings />,
      },
      {
        path: 'lead/:leadId',
        element: <CRMLeadDetail />,
      },
    ],
  },
  {
    path: '/backoffice/crm-commercial',
    element: <CRMCommercial />,
  },
  {
    path: '/backoffice/lead-manager',
    element: <LeadManager />,
  },
  {
    path: '/backoffice/partner-portal',
    element: <PartnerPortal />,
  },
  {
    path: '/backoffice/partner-auth',
    element: <PartnerAuth />,
  },
  {
    path: '/backoffice/social-media',
    element: <SocialMediaManager />,
  },
  {
    path: '/backoffice/social-connections',
    element: <SocialMediaManager />,
  },
  {
    path: '/backoffice/automations',
    element: <AutomationDashboard />,
  },
  {
    path: '/backoffice/test-automations',
    element: <TestAutomations />,
  },
  {
    path: '/backoffice/analytics',
    element: <AnalyticsDashboard />,
  },
  {
    path: '/backoffice/whatsapp',
    element: <WhatsAppManager />,
  },
  {
    path: '/backoffice/email-marketing',
    element: <EmailMarketingHub />,
  },
  {
    path: '/backoffice/doublons',
    element: <DuplicateLeadsManager />,
  },
]);
