import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { HomePage } from '@/pages/HomePage'
import { CityPage } from '@/pages/CityPage'
import { MentionsLegales } from '@/pages/MentionsLegales'
import { ConditionsGenerales } from '@/pages/ConditionsGenerales'
import { PolitiqueConfidentialite } from '@/pages/PolitiqueConfidentialite'
import { GuideAssuranceTaxi } from '@/pages/GuideAssuranceTaxi'
import { FlotteVehicules } from '@/pages/FlotteVehicules'
import { AvisPage } from '@/pages/AvisPage'
import { BlogPage } from '@/pages/BlogPage'
import { BlogPostPage } from '@/pages/BlogPostPage'
import { PlanDuSite } from '@/pages/PlanDuSite'
import { MerciPage } from '@/pages/MerciPage'

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />

            {/* City pages - ALL patterns serve content directly, NO redirects */}
            <Route path="/ville/:slug" element={<CityPage />} />
            <Route path="/taxi-:slug" element={<CityPage />} />
            <Route path="/assurance-taxi-:slug" element={<CityPage />} />
            <Route path="/ville/assurance-taxi-pas-cher-:slug" element={<CityPage />} />

            {/* Static pages */}
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/conditions-generales" element={<ConditionsGenerales />} />
            <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
            <Route path="/quelle-assurance-pour-taxi" element={<GuideAssuranceTaxi />} />
            <Route path="/flotte-vehicules" element={<FlotteVehicules />} />
            <Route path="/avis" element={<AvisPage />} />
            <Route path="/merci" element={<MerciPage />} />

            {/* Blog */}
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />

            {/* Sitemap */}
            <Route path="/plan-du-site" element={<PlanDuSite />} />

            {/* Catch-all for any other city-like URLs */}
            <Route path="*" element={<CityPage />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </HelmetProvider>
  )
}
