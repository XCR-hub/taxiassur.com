import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const DOMAIN = 'https://taxiassur.com';

async function generateSitemap() {
  console.log('🗺️  Génération sitemap.xml...\n');

  let urls = [];

  // Pages statiques
  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/assurance-taxi', priority: 0.9, changefreq: 'weekly' },
    { url: '/blog', priority: 0.9, changefreq: 'daily' },
    { url: '/faq', priority: 0.8, changefreq: 'weekly' },
    { url: '/contact', priority: 0.7, changefreq: 'monthly' },
    { url: '/devis', priority: 0.9, changefreq: 'weekly' },
    { url: '/comparateur', priority: 0.8, changefreq: 'weekly' },
    { url: '/partenaires', priority: 0.6, changefreq: 'monthly' },
  ];

  urls.push(...staticPages.map(page => ({
    loc: `${DOMAIN}${page.url}`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: page.changefreq,
    priority: page.priority
  })));

  // Articles blog
  const { data: articles } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('published', true);

  if (articles) {
    urls.push(...articles.map(article => ({
      loc: `${DOMAIN}/blog/${article.slug}`,
      lastmod: article.updated_at.split('T')[0],
      changefreq: 'weekly',
      priority: 0.7
    })));
    console.log(`✅ ${articles.length} articles blog ajoutés`);
  }

  // Pages ville
  const { data: cities } = await supabase
    .from('city_pages')
    .select('slug, updated_at')
    .eq('status', 'published');

  if (cities) {
    urls.push(...cities.map(city => ({
      loc: `${DOMAIN}/${city.slug}`,
      lastmod: city.updated_at.split('T')[0],
      changefreq: 'monthly',
      priority: 0.6
    })));
    console.log(`✅ ${cities.length} pages ville ajoutées`);
  }

  // Générer XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  // Sauvegarder
  fs.writeFileSync('public/sitemap.xml', xml);
  console.log(`\n✅ Sitemap généré : ${urls.length} URLs`);
  console.log(`📁 Fichier : public/sitemap.xml\n`);

  // Robots.txt
  const robots = `User-agent: *
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml

# Optimisation crawl
Crawl-delay: 1

# Interdictions
Disallow: /admin/
Disallow: /api/
Disallow: /backoffice/
Disallow: /*.json$
Disallow: /*?*utm_
`;

  fs.writeFileSync('public/robots.txt', robots);
  console.log('✅ robots.txt mis à jour\n');

  return urls.length;
}

generateSitemap().then(count => {
  console.log(`🎯 ${count} pages prêtes pour indexation Google !`);
});
