import { Helmet } from 'react-helmet-async'
import { canonicalUrl } from '@/lib/seo'

interface SEOHeadProps {
  title: string
  description: string
  canonical: string
  keywords?: string
  ogImage?: string
  type?: string
}

export function SEOHead({ title, description, canonical, keywords, ogImage, type = 'website' }: SEOHeadProps) {
  const fullCanonical = canonicalUrl(canonical)

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={fullCanonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="TaxiAssur" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="robots" content="index, follow" />
    </Helmet>
  )
}
