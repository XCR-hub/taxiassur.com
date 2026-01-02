import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getNoIndex } from '../lib/env';

interface SeoProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  children?: React.ReactNode;
}

const Seo: React.FC<SeoProps> = ({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogType = 'website',
  noindex = false,
  children
}) => {
  const location = useLocation();
  const siteUrl = 'https://taxiassur.com';
  const brandName = 'TaxiAssur';
  const globalNoIndex = getNoIndex();

  const fullTitle = title ? `${title} | ${brandName}` : `${brandName} - Assurance Taxi Professionnelle`;
  const defaultDescription = 'Devis d\'assurance taxi gratuit et personnalisé. Courtier spécialiste avec tarifs négociés. Service professionnel et réponse rapide.';
  const metaDescription = description || defaultDescription;

  const pathname = location.pathname.replace(/\/$/, '');
  const canonicalUrl = canonical
    ? `${siteUrl}${canonical}`
    : `${siteUrl}${pathname || ''}`;

  const defaultImage = `${siteUrl}/logo-600x300.png`;
  const metaImage = ogImage || defaultImage;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Canonical URL - CRITICAL pour éviter duplicate content */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Alternate URLs pour multilangue (préparation future) */}
      <link rel="alternate" href={canonicalUrl} hrefLang="fr" />
      <link rel="alternate" href={canonicalUrl} hrefLang="x-default" />

      {/* Robots */}
      {(noindex || globalNoIndex) ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:image:width" content="600" />
      <meta property="og:image:height" content="300" />
      <meta property="og:site_name" content={brandName} />
      <meta property="og:locale" content="fr_FR" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

      {/* Additional Meta */}
      <meta name="author" content={brandName} />
      <meta name="geo.region" content="FR" />
      <meta name="geo.placename" content="France" />
      <meta name="language" content="French" />

      {/* Preconnect pour performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://drohhxrkoequjphvabvq.supabase.co" />

      {children}
    </Helmet>
  );
};

export default Seo;