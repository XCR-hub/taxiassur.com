import { supabase } from './supabase';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export async function generateSitemap(): Promise<string> {
  const baseUrl = 'https://www.taxiassur.com';
  const urls: SitemapUrl[] = [];

  urls.push({
    loc: baseUrl,
    lastmod: new Date().toISOString(),
    changefreq: 'daily',
    priority: 1.0,
  });

  const staticPages = [
    { path: '/assurance-taxi', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/assurance-taxi-vtc', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/assurance-moto-taxi', priority: 0.8, changefreq: 'weekly' as const },
    { path: '/prix-assurance-taxi', priority: 0.8, changefreq: 'weekly' as const },
    { path: '/quelle-assurance-taxi', priority: 0.8, changefreq: 'weekly' as const },
    { path: '/rc-professionnelle', priority: 0.8, changefreq: 'weekly' as const },
    { path: '/flotte-vehicules', priority: 0.7, changefreq: 'weekly' as const },
    { path: '/gestion-sinistres', priority: 0.7, changefreq: 'weekly' as const },
    { path: '/blog', priority: 0.8, changefreq: 'daily' as const },
    { path: '/actualites', priority: 0.7, changefreq: 'daily' as const },
    { path: '/faq', priority: 0.6, changefreq: 'weekly' as const },
    { path: '/contact', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/partenaires', priority: 0.5, changefreq: 'monthly' as const },
    { path: '/mentions-legales', priority: 0.3, changefreq: 'yearly' as const },
    { path: '/politique-confidentialite', priority: 0.3, changefreq: 'yearly' as const },
    { path: '/conditions-generales', priority: 0.3, changefreq: 'yearly' as const },
  ];

  staticPages.forEach(page => {
    urls.push({
      loc: `${baseUrl}${page.path}`,
      lastmod: new Date().toISOString(),
      changefreq: page.changefreq,
      priority: page.priority,
    });
  });

  try {
    const { data: cityPages } = await supabase
      .from('city_pages')
      .select('slug, updated_at')
      .eq('published', true)
      .order('updated_at', { ascending: false });

    if (cityPages) {
      cityPages.forEach(page => {
        urls.push({
          loc: `${baseUrl}/assurance-taxi/${page.slug}`,
          lastmod: page.updated_at || new Date().toISOString(),
          changefreq: 'monthly',
          priority: 0.7,
        });
      });
    }
  } catch (error) {
    console.error('Error fetching city pages for sitemap:', error);
  }

  try {
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, created_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (blogPosts) {
      blogPosts.forEach(post => {
        urls.push({
          loc: `${baseUrl}/blog/${post.slug}`,
          lastmod: post.updated_at || post.created_at || new Date().toISOString(),
          changefreq: 'monthly',
          priority: 0.6,
        });
      });
    }
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error);
  }

  try {
    const { data: newsArticles } = await supabase
      .from('news_articles')
      .select('slug, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(100);

    if (newsArticles) {
      newsArticles.forEach(article => {
        urls.push({
          loc: `${baseUrl}/actualites/${article.slug}`,
          lastmod: article.published_at || new Date().toISOString(),
          changefreq: 'weekly',
          priority: 0.5,
        });
      });
    }
  } catch (error) {
    console.error('Error fetching news articles for sitemap:', error);
  }

  return generateXmlSitemap(urls);
}

function generateXmlSitemap(urls: SitemapUrl[]): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority.toFixed(1)}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function generateSitemapIndex(): Promise<string> {
  const baseUrl = 'https://www.taxiassur.com';

  const sitemaps = [
    { loc: `${baseUrl}/sitemap.xml`, lastmod: new Date().toISOString() },
    { loc: `${baseUrl}/feeds/sitemap.xml`, lastmod: new Date().toISOString() },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${escapeXml(sitemap.loc)}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  return xml;
}
