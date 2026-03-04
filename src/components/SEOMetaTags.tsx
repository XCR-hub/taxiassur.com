import { Helmet } from 'react-helmet-async';

export interface SEOMetaTagsProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  noindex?: boolean;
  nofollow?: boolean;
}

export function SEOMetaTags({
  title,
  description,
  canonical,
  image = 'https://taxiassur.com/logo-600x300.png',
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  section,
  tags,
  noindex = false,
  nofollow = false,
}: SEOMetaTagsProps) {
  const siteUrl = 'https://taxiassur.com';
  const fullCanonical = canonical ? `${siteUrl}${canonical}` : undefined;
  const fullImage = image.startsWith('http') ? image : `${siteUrl}${image}`;

  const siteName = 'TaxiAssur';
  const twitterHandle = '@taxiassur';

  const robots = [];
  if (noindex) robots.push('noindex');
  if (nofollow) robots.push('nofollow');
  const robotsContent = robots.length > 0 ? robots.join(', ') : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />

      {fullCanonical && <link rel="canonical" href={fullCanonical} />}

      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {fullCanonical && <meta property="og:url" content={fullCanonical} />}
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:locale" content="fr_FR" />

      {type === 'article' && (
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
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:creator" content={twitterHandle} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:image:alt" content={title} />

      <meta name="theme-color" content="#2563eb" />
      <meta name="msapplication-TileColor" content="#2563eb" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteName} />

      <link rel="apple-touch-icon" sizes="180x180" href="/favicon.svg" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="manifest" href="/manifest.json" />

      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: siteName,
          url: siteUrl,
          logo: `${siteUrl}/logo-512x512.svg`,
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+33-1-XX-XX-XX-XX',
            contactType: 'Customer Service',
            areaServed: 'FR',
            availableLanguage: 'French',
          },
          sameAs: [
            'https://www.facebook.com/taxiassur',
            'https://twitter.com/taxiassur',
            'https://www.linkedin.com/company/taxiassur',
          ],
        })}
      </script>
    </Helmet>
  );
}
