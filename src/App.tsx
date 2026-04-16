import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Suspense, lazy, type ComponentType } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { HomePage } from '@/pages/HomePage'
import { CityPage } from '@/pages/CityPage'
import { SEOHead } from '@/components/SEOHead'

function Loading() {
  return <div className="loading-container"><div className="spinner" /></div>
}

function safeLazy(factory: () => Promise<{ default: ComponentType }>) {
  return lazy(() =>
    factory().catch(() => ({
      default: FallbackPage,
    }))
  )
}

function namedLazy(factory: () => Promise<Record<string, unknown>>, name: string) {
  return lazy(() =>
    factory()
      .then(m => ({ default: (m[name] || m.default) as ComponentType }))
      .catch(() => ({ default: FallbackPage }))
  )
}

function FallbackPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 24px' }}>
      <SEOHead
        title="TaxiAssur - Assurance Taxi Professionnelle"
        description="TaxiAssur, courtier en assurance taxi. Devis gratuit en 2 minutes."
        canonical="/"
      />
      <h1>TaxiAssur</h1>
      <p style={{ color: '#a3a3a3', marginTop: 16, lineHeight: 1.6 }}>
        Cette page est en cours de mise a jour. Demandez votre devis gratuit sur notre page d'accueil.
      </p>
      <a href="/" className="cta-button" style={{ marginTop: 24, display: 'inline-block' }}>
        Retour a l'accueil
      </a>
    </div>
  )
}

const MentionsLegales = namedLazy(() => import('@/pages/MentionsLegales'), 'MentionsLegales')
const ConditionsGenerales = namedLazy(() => import('@/pages/ConditionsGenerales'), 'ConditionsGenerales')
const PolitiqueConfidentialite = namedLazy(() => import('@/pages/PolitiqueConfidentialite'), 'PolitiqueConfidentialite')
const GuideAssuranceTaxi = namedLazy(() => import('@/pages/GuideAssuranceTaxi'), 'GuideAssuranceTaxi')
const FlotteVehicules = namedLazy(() => import('@/pages/FlotteVehicules'), 'FlotteVehicules')
const AvisPage = namedLazy(() => import('@/pages/AvisPage'), 'AvisPage')
const BlogPage = namedLazy(() => import('@/pages/BlogPage'), 'BlogPage')
const BlogPostPage = namedLazy(() => import('@/pages/BlogPostPage'), 'BlogPostPage')
const PlanDuSite = namedLazy(() => import('@/pages/PlanDuSite'), 'PlanDuSite')
const MerciPage = namedLazy(() => import('@/pages/MerciPage'), 'MerciPage')

const Actualites = safeLazy(() => import('@/pages/Actualites'))
const PrixAssuranceTaxi = safeLazy(() => import('@/pages/PrixAssuranceTaxi'))
const AssuranceMotoTaxi = safeLazy(() => import('@/pages/AssuranceMotoTaxi'))
const RCProfessionnelle = safeLazy(() => import('@/pages/RCProfessionnelle'))
const GestionSinistres = safeLazy(() => import('@/pages/GestionSinistres'))
const Newsletter = safeLazy(() => import('@/pages/Newsletter'))
const FAQ = safeLazy(() => import('@/pages/FAQ'))
const AssuranceTaxiVTC = safeLazy(() => import('@/pages/AssuranceTaxiVTC'))
const AssuranceObligatoireTaxi = safeLazy(() => import('@/pages/AssuranceObligatoireTaxi'))
const PartnershipPage = safeLazy(() => import('@/pages/PartnershipPage'))
const DevisAssuranceTaxi = safeLazy(() => import('@/pages/DevisAssuranceTaxi'))
const AssuranceTaxi = safeLazy(() => import('@/pages/AssuranceTaxi'))
const QuelleAssuranceTaxi = safeLazy(() => import('@/pages/QuelleAssuranceTaxi'))
const CourtierAssuranceTaxi = safeLazy(() => import('@/pages/CourtierAssuranceTaxi'))
const ConseilPersonnalise = safeLazy(() => import('@/pages/ConseilPersonnalise'))
const Contact = safeLazy(() => import('@/pages/Contact'))
const NewsArticle = safeLazy(() => import('@/pages/NewsArticle'))
const NewsletterSubscribe = safeLazy(() => import('@/pages/NewsletterSubscribe'))
const NewsletterUnsubscribe = safeLazy(() => import('@/pages/NewsletterUnsubscribe'))
const Merci = safeLazy(() => import('@/pages/Merci'))

const AssuranceTaxiParis = safeLazy(() => import('@/pages/AssuranceTaxiParis'))
const AssuranceTaxiLyon = safeLazy(() => import('@/pages/AssuranceTaxiLyon'))
const AssuranceTaxiMarseille = safeLazy(() => import('@/pages/AssuranceTaxiMarseille'))
const AssuranceTaxiToulouse = safeLazy(() => import('@/pages/AssuranceTaxiToulouse'))
const AssuranceTaxiNice = safeLazy(() => import('@/pages/AssuranceTaxiNice'))
const AssuranceTaxiNantes = safeLazy(() => import('@/pages/AssuranceTaxiNantes'))
const AssuranceTaxiBordeaux = safeLazy(() => import('@/pages/AssuranceTaxiBordeaux'))
const AssuranceTaxiStrasbourg = safeLazy(() => import('@/pages/AssuranceTaxiStrasbourg'))
const AssuranceTaxiMontpellier = safeLazy(() => import('@/pages/AssuranceTaxiMontpellier').catch(() => ({ default: () => <CityPage /> })))
const AssuranceTaxiRennes = safeLazy(() => import('@/pages/AssuranceTaxiRennes'))
const AssuranceTaxiReims = safeLazy(() => import('@/pages/AssuranceTaxiReims'))
const AssuranceTaxiToulon = safeLazy(() => import('@/pages/AssuranceTaxiToulon'))
const AssuranceTaxiGrenoble = safeLazy(() => import('@/pages/AssuranceTaxiGrenoble'))
const AssuranceTaxiDijon = safeLazy(() => import('@/pages/AssuranceTaxiDijon'))
const AssuranceTaxiAngers = safeLazy(() => import('@/pages/AssuranceTaxiAngers'))
const AssuranceTaxiNimes = safeLazy(() => import('@/pages/AssuranceTaxiNimes'))
const AssuranceTaxiMetz = safeLazy(() => import('@/pages/AssuranceTaxiMetz'))
const AssuranceTaxiTours = safeLazy(() => import('@/pages/AssuranceTaxiTours'))
const AssuranceTaxiBrest = safeLazy(() => import('@/pages/AssuranceTaxiBrest'))
const AssuranceTaxiAmiens = safeLazy(() => import('@/pages/AssuranceTaxiAmiens'))
const AssuranceTaxiLimoges = safeLazy(() => import('@/pages/AssuranceTaxiLimoges'))
const AssuranceTaxiPerpignan = safeLazy(() => import('@/pages/AssuranceTaxiPerpignan'))
const AssuranceTaxiBesancon = safeLazy(() => import('@/pages/AssuranceTaxiBesancon'))
const AssuranceTaxiOrleans = safeLazy(() => import('@/pages/AssuranceTaxiOrleans'))

const Blog = safeLazy(() => import('@/pages/Blog'))
const SitemapPage = safeLazy(() => import('@/pages/SitemapPage'))
const CityIndex = safeLazy(() => import('@/pages/CityIndex'))
const EspaceProspect = safeLazy(() => import('@/pages/EspaceProspect'))
const EspaceClient = safeLazy(() => import('@/pages/EspaceClient'))
const PaiementSuccess = safeLazy(() => import('@/pages/PaiementSuccess'))
const PaiementError = safeLazy(() => import('@/pages/PaiementError'))
const PaiementLibre = safeLazy(() => import('@/pages/PaiementLibre'))

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Header />
        <main>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />

              {/* City pages: ALL URL patterns serve content directly - NO REDIRECTS */}
              <Route path="/ville/:slug" element={<CityPage />} />
              <Route path="/taxi-:slug" element={<CityPage />} />
              <Route path="/ville/assurance-taxi-:slug" element={<CityPage />} />
              <Route path="/ville/assurance-taxi-pas-cher-:slug" element={<CityPage />} />

              {/* Named city pages (old /assurance-taxi-{city} pattern) */}
              <Route path="/assurance-taxi-paris" element={<Suspense fallback={<Loading />}><AssuranceTaxiParis /></Suspense>} />
              <Route path="/assurance-taxi-lyon" element={<Suspense fallback={<Loading />}><AssuranceTaxiLyon /></Suspense>} />
              <Route path="/assurance-taxi-marseille" element={<Suspense fallback={<Loading />}><AssuranceTaxiMarseille /></Suspense>} />
              <Route path="/assurance-taxi-toulouse" element={<Suspense fallback={<Loading />}><AssuranceTaxiToulouse /></Suspense>} />
              <Route path="/assurance-taxi-nice" element={<Suspense fallback={<Loading />}><AssuranceTaxiNice /></Suspense>} />
              <Route path="/assurance-taxi-nantes" element={<Suspense fallback={<Loading />}><AssuranceTaxiNantes /></Suspense>} />
              <Route path="/assurance-taxi-bordeaux" element={<Suspense fallback={<Loading />}><AssuranceTaxiBordeaux /></Suspense>} />
              <Route path="/assurance-taxi-strasbourg" element={<Suspense fallback={<Loading />}><AssuranceTaxiStrasbourg /></Suspense>} />
              <Route path="/assurance-taxi-montpellier" element={<Suspense fallback={<Loading />}><AssuranceTaxiMontpellier /></Suspense>} />
              <Route path="/assurance-taxi-rennes" element={<Suspense fallback={<Loading />}><AssuranceTaxiRennes /></Suspense>} />
              <Route path="/assurance-taxi-reims" element={<Suspense fallback={<Loading />}><AssuranceTaxiReims /></Suspense>} />
              <Route path="/assurance-taxi-toulon" element={<Suspense fallback={<Loading />}><AssuranceTaxiToulon /></Suspense>} />
              <Route path="/assurance-taxi-grenoble" element={<Suspense fallback={<Loading />}><AssuranceTaxiGrenoble /></Suspense>} />
              <Route path="/assurance-taxi-dijon" element={<Suspense fallback={<Loading />}><AssuranceTaxiDijon /></Suspense>} />
              <Route path="/assurance-taxi-angers" element={<Suspense fallback={<Loading />}><AssuranceTaxiAngers /></Suspense>} />
              <Route path="/assurance-taxi-nimes" element={<Suspense fallback={<Loading />}><AssuranceTaxiNimes /></Suspense>} />
              <Route path="/assurance-taxi-metz" element={<Suspense fallback={<Loading />}><AssuranceTaxiMetz /></Suspense>} />
              <Route path="/assurance-taxi-tours" element={<Suspense fallback={<Loading />}><AssuranceTaxiTours /></Suspense>} />
              <Route path="/assurance-taxi-brest" element={<Suspense fallback={<Loading />}><AssuranceTaxiBrest /></Suspense>} />
              <Route path="/assurance-taxi-amiens" element={<Suspense fallback={<Loading />}><AssuranceTaxiAmiens /></Suspense>} />
              <Route path="/assurance-taxi-limoges" element={<Suspense fallback={<Loading />}><AssuranceTaxiLimoges /></Suspense>} />
              <Route path="/assurance-taxi-perpignan" element={<Suspense fallback={<Loading />}><AssuranceTaxiPerpignan /></Suspense>} />
              <Route path="/assurance-taxi-besancon" element={<Suspense fallback={<Loading />}><AssuranceTaxiBesancon /></Suspense>} />
              <Route path="/assurance-taxi-orleans" element={<Suspense fallback={<Loading />}><AssuranceTaxiOrleans /></Suspense>} />
              {/* Catch remaining /assurance-taxi-* that don't have dedicated pages */}
              <Route path="/assurance-taxi-:slug" element={<CityPage />} />

              {/* Content pages - all serve content directly */}
              <Route path="/actualites" element={<Suspense fallback={<Loading />}><Actualites /></Suspense>} />
              <Route path="/prix-assurance-taxi" element={<Suspense fallback={<Loading />}><PrixAssuranceTaxi /></Suspense>} />
              <Route path="/assurance-moto-taxi" element={<Suspense fallback={<Loading />}><AssuranceMotoTaxi /></Suspense>} />
              <Route path="/rc-professionnelle" element={<Suspense fallback={<Loading />}><RCProfessionnelle /></Suspense>} />
              <Route path="/gestion-sinistres" element={<Suspense fallback={<Loading />}><GestionSinistres /></Suspense>} />
              <Route path="/newsletter" element={<Suspense fallback={<Loading />}><Newsletter /></Suspense>} />
              <Route path="/faq" element={<Suspense fallback={<Loading />}><FAQ /></Suspense>} />
              <Route path="/assurance-taxi-vtc" element={<Suspense fallback={<Loading />}><AssuranceTaxiVTC /></Suspense>} />
              <Route path="/assurance-obligatoire-taxi" element={<Suspense fallback={<Loading />}><AssuranceObligatoireTaxi /></Suspense>} />
              <Route path="/programme-partenaires" element={<Suspense fallback={<Loading />}><PartnershipPage /></Suspense>} />
              <Route path="/devis-assurance-taxi" element={<Suspense fallback={<Loading />}><DevisAssuranceTaxi /></Suspense>} />
              <Route path="/devis-instantane" element={<Suspense fallback={<Loading />}><DevisAssuranceTaxi /></Suspense>} />
              <Route path="/assurance-taxi" element={<Suspense fallback={<Loading />}><AssuranceTaxi /></Suspense>} />
              <Route path="/quelle-assurance-pour-taxi" element={<Suspense fallback={<Loading />}><QuelleAssuranceTaxi /></Suspense>} />
              <Route path="/courtier-assurance-taxi" element={<Suspense fallback={<Loading />}><CourtierAssuranceTaxi /></Suspense>} />
              <Route path="/conseil-personnalise" element={<Suspense fallback={<Loading />}><ConseilPersonnalise /></Suspense>} />
              <Route path="/contact" element={<Suspense fallback={<Loading />}><Contact /></Suspense>} />

              {/* Blog - serves content at all blog URLs */}
              <Route path="/blog" element={<Suspense fallback={<Loading />}><BlogPage /></Suspense>} />
              <Route path="/blog/:slug" element={<Suspense fallback={<Loading />}><BlogPostPage /></Suspense>} />
              <Route path="/actualites/:slug" element={<Suspense fallback={<Loading />}><NewsArticle /></Suspense>} />

              {/* Legal pages */}
              <Route path="/mentions-legales" element={<Suspense fallback={<Loading />}><MentionsLegales /></Suspense>} />
              <Route path="/conditions-generales" element={<Suspense fallback={<Loading />}><ConditionsGenerales /></Suspense>} />
              <Route path="/politique-confidentialite" element={<Suspense fallback={<Loading />}><PolitiqueConfidentialite /></Suspense>} />

              {/* Info pages */}
              <Route path="/flotte-vehicules" element={<Suspense fallback={<Loading />}><FlotteVehicules /></Suspense>} />
              <Route path="/offres/flotte-vehicules" element={<Suspense fallback={<Loading />}><FlotteVehicules /></Suspense>} />
              <Route path="/avis" element={<Suspense fallback={<Loading />}><AvisPage /></Suspense>} />
              <Route path="/merci" element={<Suspense fallback={<Loading />}><MerciPage /></Suspense>} />
              <Route path="/merci.html" element={<Suspense fallback={<Loading />}><MerciPage /></Suspense>} />
              <Route path="/newsletter/subscribe" element={<Suspense fallback={<Loading />}><NewsletterSubscribe /></Suspense>} />
              <Route path="/newsletter/unsubscribe" element={<Suspense fallback={<Loading />}><NewsletterUnsubscribe /></Suspense>} />

              {/* Sitemap */}
              <Route path="/plan-du-site" element={<Suspense fallback={<Loading />}><PlanDuSite /></Suspense>} />

              {/* Prospect / Client */}
              <Route path="/espace-prospect" element={<Suspense fallback={<Loading />}><EspaceProspect /></Suspense>} />
              <Route path="/espace-prospect/:token" element={<Suspense fallback={<Loading />}><EspaceProspect /></Suspense>} />
              <Route path="/espace-client" element={<Suspense fallback={<Loading />}><EspaceClient /></Suspense>} />
              <Route path="/paiement/success" element={<Suspense fallback={<Loading />}><PaiementSuccess /></Suspense>} />
              <Route path="/paiement/error" element={<Suspense fallback={<Loading />}><PaiementError /></Suspense>} />
              <Route path="/paiement-libre" element={<Suspense fallback={<Loading />}><PaiementLibre /></Suspense>} />

              {/* City index */}
              <Route path="/villes" element={<Suspense fallback={<Loading />}><CityIndex /></Suspense>} />

              {/* Catch-all: treat unknown paths as potential city pages */}
              <Route path="*" element={<CityPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </BrowserRouter>
    </HelmetProvider>
  )
}
