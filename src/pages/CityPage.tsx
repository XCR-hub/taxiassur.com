import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { SEOHead } from '@/components/SEOHead'
import { QuoteForm } from '@/components/QuoteForm'
import { extractCitySlugFromPath, buildCitySearchSlugs } from '@/lib/url-resolver'

interface CityData {
  slug: string
  title: string
  h1_title: string
  meta_description: string
  content: string
  city_name: string
  department: string
  region: string
  keywords: string
}

export function CityPage() {
  const location = useLocation()
  const [city, setCity] = useState<CityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchCity() {
      setLoading(true)
      const citySlug = extractCitySlugFromPath(location.pathname)
      if (!citySlug) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const slugsToSearch = buildCitySearchSlugs(citySlug)

      const { data, error } = await supabase
        .from('city_pages')
        .select('slug, title, h1_title, meta_description, content, city_name, department, region, keywords')
        .in('slug', slugsToSearch)
        .eq('status', 'published')
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        const { data: fallback } = await supabase
          .from('city_pages')
          .select('slug, title, h1_title, meta_description, content, city_name, department, region, keywords')
          .ilike('slug', `%${citySlug}%`)
          .eq('status', 'published')
          .limit(1)
          .maybeSingle()

        if (fallback) {
          setCity(fallback)
        } else {
          setNotFound(true)
        }
      } else {
        setCity(data)
      }
      setLoading(false)
    }

    fetchCity()
  }, [location.pathname])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    )
  }

  if (notFound || !city) {
    return <NotFoundCity />
  }

  const parsedContent = parseContent(city.content)
  const displayName = city.city_name || city.slug.replace(/-/g, ' ')
  const canonicalPath = `/ville/${city.slug.replace(/^assurance-taxi-(pas-cher-)?/, '')}`

  return (
    <>
      <SEOHead
        title={city.title || `Assurance Taxi ${displayName} - Devis Gratuit | TaxiAssur`}
        description={city.meta_description || `Assurance taxi professionnelle a ${displayName}. Devis gratuit en 2 minutes.`}
        canonical={canonicalPath}
        keywords={city.keywords || `assurance taxi ${displayName}, taxi ${displayName}, assurance taxi pas cher ${displayName}`}
      />

      <section className="city-hero">
        <div className="city-hero-content">
          <h1>{city.h1_title || `Assurance Taxi ${displayName}`}</h1>
          <p className="city-subtitle">
            {parsedContent.intro || `Trouvez la meilleure assurance taxi a ${displayName}. Devis gratuit et personnalise en 2 minutes.`}
          </p>
          {parsedContent.tarif_moyen && (
            <div className="price-badge">
              Tarif moyen : {parsedContent.tarif_moyen}
            </div>
          )}
        </div>
        <div className="city-form">
          <h2>Devis Gratuit - {displayName}</h2>
          <QuoteForm city={displayName} />
        </div>
      </section>

      {parsedContent.specificites && parsedContent.specificites.length > 0 && (
        <section className="city-details">
          <div className="city-details-inner">
            <h2>Specificites taxi a {displayName}</h2>
            <ul className="specificites-list">
              {parsedContent.specificites.map((spec: string, i: number) => (
                <li key={i}>{spec}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="city-info">
        <div className="city-info-inner">
          <h2>Assurance taxi professionnelle a {displayName}</h2>
          <div className="info-grid">
            {city.department && (
              <div className="info-card">
                <strong>Departement</strong>
                <span>{city.department}</span>
              </div>
            )}
            {city.region && (
              <div className="info-card">
                <strong>Region</strong>
                <span>{city.region}</span>
              </div>
            )}
            {parsedContent.tarif_moyen && (
              <div className="info-card">
                <strong>Tarif moyen</strong>
                <span>{parsedContent.tarif_moyen}</span>
              </div>
            )}
          </div>
          <p>
            En tant que chauffeur de taxi a {displayName}, il est essentiel de disposer d'une assurance
            adaptee a votre activite professionnelle. TaxiAssur vous propose des contrats sur mesure
            avec les meilleures garanties du marche.
          </p>
        </div>
      </section>
    </>
  )
}

interface ParsedContent {
  intro?: string
  tarif_moyen?: string
  specificites?: string[]
}

function parseContent(content: string): ParsedContent {
  try {
    return JSON.parse(content) as ParsedContent
  } catch {
    return { intro: content }
  }
}

function NotFoundCity() {
  return (
    <>
      <SEOHead
        title="Page non trouvee | TaxiAssur"
        description="La page que vous recherchez n'existe pas."
        canonical="/404"
      />
      <section className="not-found">
        <h1>Page non trouvee</h1>
        <p>Cette page de ville n'existe pas encore.</p>
        <a href="/" className="cta-button">Retour a l'accueil</a>
      </section>
    </>
  )
}
