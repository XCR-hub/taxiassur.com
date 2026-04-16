import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { SEOHead } from '@/components/SEOHead'

interface CityLink {
  slug: string
  city_name: string
}

export function PlanDuSite() {
  const [cities, setCities] = useState<CityLink[]>([])

  useEffect(() => {
    async function fetchCities() {
      const { data } = await supabase
        .from('city_pages')
        .select('slug, city_name')
        .eq('status', 'published')
        .not('city_name', 'is', null)
        .order('city_name')

      if (data) setCities(data)
    }
    fetchCities()
  }, [])

  return (
    <>
      <SEOHead
        title="Plan du Site | TaxiAssur"
        description="Plan du site TaxiAssur.com. Retrouvez toutes nos pages d'assurance taxi par ville."
        canonical="/plan-du-site"
      />
      <div className="sitemap-page">
        <h1>Plan du Site</h1>

        <section>
          <h2>Pages principales</h2>
          <ul className="sitemap-links">
            <li><Link to="/">Accueil - Devis Assurance Taxi</Link></li>
            <li><Link to="/quelle-assurance-pour-taxi">Guide : Quelle assurance pour taxi ?</Link></li>
            <li><Link to="/flotte-vehicules">Assurance Flotte Vehicules</Link></li>
            <li><Link to="/avis">Avis Clients</Link></li>
            <li><Link to="/blog">Blog</Link></li>
          </ul>
        </section>

        <section>
          <h2>Assurance Taxi par Ville ({cities.length} villes)</h2>
          <div className="sitemap-cities">
            {cities.map(city => (
              <Link to={`/ville/${city.slug}`} key={city.slug}>
                {city.city_name || city.slug}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2>Informations legales</h2>
          <ul className="sitemap-links">
            <li><Link to="/mentions-legales">Mentions Legales</Link></li>
            <li><Link to="/conditions-generales">Conditions Generales</Link></li>
            <li><Link to="/politique-confidentialite">Politique de Confidentialite</Link></li>
          </ul>
        </section>
      </div>
    </>
  )
}
