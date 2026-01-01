export function generateRobotsTxt(environment: 'production' | 'development' | 'staging'): string {
  const siteUrl = environment === 'production'
    ? 'https://www.taxiassur.com'
    : 'http://localhost:5173';

  if (environment === 'production') {
    return `# Production robots.txt - Full access for search engines
User-agent: *
Allow: /

# Disallow admin and sensitive areas
Disallow: /admin
Disallow: /backoffice
Disallow: /api/
Disallow: /espace-client/

# Disallow dynamic search/filter pages
Disallow: /*?*
Disallow: /*&*

# Allow specific query parameters for tracking
Allow: /*?utm_*
Allow: /*&utm_*

# Crawl-delay for specific bots (optional)
User-agent: Googlebot
Crawl-delay: 0

User-agent: Bingbot
Crawl-delay: 1

# Block bad bots
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: MJ12bot
Disallow: /

# Sitemaps
Sitemap: ${siteUrl}/sitemap.xml
Sitemap: ${siteUrl}/feeds/sitemap.xml
`;
  }

  return `# ${environment.toUpperCase()} environment - Block all crawlers
User-agent: *
Disallow: /

# This is a ${environment} environment
# For production robots.txt, set NODE_ENV=production
`;
}

export function shouldIndexPage(pathname: string): boolean {
  const noIndexPatterns = [
    '/admin',
    '/backoffice',
    '/espace-client',
    '/api/',
    '/merci',
    '/newsletter',
  ];

  return !noIndexPatterns.some(pattern => pathname.startsWith(pattern));
}
