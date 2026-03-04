import { Helmet } from 'react-helmet-async';
import { getNoIndex } from '../lib/env';

interface UnifiedSEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  city?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  children?: React.ReactNode;
}

export function UnifiedSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogType = 'website',
  noindex = false,
  city,
  author,
  publishedTime,
  modifiedTime,
  section,
  tags,
  children
}: UnifiedSEOProps) {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://taxiassur.com';
  const brandName = 'TaxiAssur';
  const globalNoIndex = getNoIndex();

  const enhancedTitle = title
    ? `${title} | ${brandName}`
    : `${brandName} - Assurance Taxi Professionnelle | Devis Gratuit`;

  const enhancedDescription = description ||
    'Devis d\'assurance taxi gratuit en 2 min. RC Pro, flotte, tarifs compétitifs. Courtier spécialisé. Réponse rapide garantie.';

  const enhancedKeywords = keywords ||
    'assurance taxi, devis gratuit, RC professionnelle, flotte taxi, courtier spécialisé';

  // Canonical SANS www
  const cleanCanonical = canonical
    ? `${siteUrl}${canonical}`.replace('taxiassur.com', 'taxiassur.com')
    : siteUrl;

  // Open Graph URL identique au canonical
  const ogUrl = cleanCanonical;

  const defaultImage = `${siteUrl}/logo-600x300.png`;
  const metaImage = ogImage || defaultImage;

  const shouldNoIndex = noindex || globalNoIndex;
  const robotsContent = shouldNoIndex
    ? "noindex, nofollow"
    : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";

  return (
    <Helmet>
      <title>{enhancedTitle}</title>
      <meta name="description" content={enhancedDescription} />
      {keywords && <meta name="keywords" content={enhancedKeywords} />}
      <link rel="canonical" href={cleanCanonical} />

      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />

      <meta property="og:site_name" content={brandName} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={enhancedTitle} />
      <meta property="og:description" content={enhancedDescription} />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={enhancedTitle} />
      <meta property="og:locale" content="fr_FR" />

      {ogType === 'article' && (
        <>
          {author && <meta property="article:author" content={author} />}
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {section && <meta property="article:section" content={section} />}
          {tags && tags.map(tag => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@taxiassur" />
      <meta name="twitter:creator" content="@taxiassur" />
      <meta name="twitter:title" content={enhancedTitle} />
      <meta name="twitter:description" content={enhancedDescription} />
      <meta name="twitter:image" content={metaImage} />
      <meta name="twitter:image:alt" content={enhancedTitle} />

      <meta name="author" content={brandName} />
      <meta name="geo.region" content="FR" />
      {city && <meta name="geo.placename" content={city} />}

      <meta name="theme-color" content="#f59e0b" />
      <meta name="msapplication-TileColor" content="#f59e0b" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={brandName} />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="apple-touch-icon" sizes="180x180" href="/favicon.svg" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="manifest" href="/manifest.json" />

      {children}
    </Helmet>
  );
}

export default UnifiedSEO;
