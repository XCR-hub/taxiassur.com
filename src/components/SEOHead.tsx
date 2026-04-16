import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getNoIndex } from '../lib/env';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  city?: string;
  children?: React.ReactNode;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogType = 'website',
  noindex = false,
  city,
  children
}) => {
  const location = useLocation();
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

  const pathname = location.pathname.replace(/\/$/, '');
  const canonicalUrl = canonical
    ? `${siteUrl}${canonical}`
    : `${siteUrl}${pathname || ''}`;
  const defaultImage = `${siteUrl}/og-image.jpg`;
  const metaImage = ogImage || defaultImage;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{enhancedTitle}</title>
      <meta name="description" content={enhancedDescription} />
      <meta name="keywords" content={enhancedKeywords} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      <meta name="robots" content={(noindex || globalNoIndex) ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large"} />
      
      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={enhancedTitle} />
      <meta property="og:description" content={enhancedDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:image:alt" content={`${title || 'TaxiAssur'} - Courtier assurance taxi`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={brandName} />
      <meta property="og:locale" content="fr_FR" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@taxiassur" />
      <meta name="twitter:title" content={enhancedTitle} />
      <meta name="twitter:description" content={enhancedDescription} />
      <meta name="twitter:image" content={metaImage} />
      <meta name="twitter:image:alt" content={`${title || 'TaxiAssur'} - Courtier assurance taxi`} />
      
      {/* Additional Meta */}
      <meta name="author" content={brandName} />
      <meta name="geo.region" content="FR" />
      <meta name="geo.placename" content={city || "France"} />
      
      
      {/* Theme */}
      <meta name="theme-color" content="#f59e0b" />
      
      {children}
    </Helmet>
  );
};

export default SEOHead;