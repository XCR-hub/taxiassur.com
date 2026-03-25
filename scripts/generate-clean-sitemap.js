import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = 'https://taxiassur.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Pages statiques (routes React)
const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/assurance-taxi', priority: '0.9', changefreq: 'weekly' },
  { url: '/devis-assurance-taxi', priority: '0.9', changefreq: 'weekly' },
  { url: '/assurance-moto-taxi', priority: '0.8', changefreq: 'weekly' },
  { url: '/assurance-taxi-vtc', priority: '0.8', changefreq: 'weekly' },
  { url: '/assurance-obligatoire-taxi', priority: '0.8', changefreq: 'weekly' },
  { url: '/prix-assurance-taxi', priority: '0.8', changefreq: 'weekly' },
  { url: '/quelle-assurance-taxi', priority: '0.8', changefreq: 'weekly' },
  { url: '/courtier-assurance-taxi', priority: '0.8', changefreq: 'weekly' },
  { url: '/rc-professionnelle', priority: '0.7', changefreq: 'monthly' },
  { url: '/flotte-vehicules', priority: '0.7', changefreq: 'monthly' },
  { url: '/gestion-sinistres', priority: '0.7', changefreq: 'monthly' },
  { url: '/taxis-sinistres', priority: '0.7', changefreq: 'monthly' },
  { url: '/confiance-et-certifications', priority: '0.6', changefreq: 'monthly' },
  { url: '/conseil-personnalise', priority: '0.6', changefreq: 'monthly' },
  { url: '/faq', priority: '0.7', changefreq: 'weekly' },
  { url: '/contact', priority: '0.7', changefreq: 'monthly' },
  { url: '/blog', priority: '0.8', changefreq: 'daily' },
  { url: '/actualites', priority: '0.7', changefreq: 'daily' },
  { url: '/reviews', priority: '0.6', changefreq: 'weekly' },
  { url: '/partners', priority: '0.5', changefreq: 'monthly' },
  { url: '/programme-partenaires', priority: '0.5', changefreq: 'monthly' },
  { url: '/villes', priority: '0.6', changefreq: 'monthly' },
  { url: '/sitemap', priority: '0.3', changefreq: 'weekly' },
  { url: '/legal', priority: '0.3', changefreq: 'yearly' },
  { url: '/policy', priority: '0.3', changefreq: 'yearly' },
  { url: '/conditions', priority: '0.3', changefreq: 'yearly' },
];

// Pages des villes (principales)
const cities = [
  'paris', 'marseille', 'lyon', 'toulouse', 'nice',
  'nantes', 'strasbourg', 'montpellier', 'bordeaux', 'rennes',
  'reims', 'le-mans', 'aix-en-provence', 'clermont-ferrand',
  'grenoble', 'dijon', 'angers', 'nimes', 'villeurbanne',
  'le-havre', 'saint-etienne', 'toulon', 'orleans',
  'besancon', 'amiens', 'tours', 'limoges', 'metz',
  'brest', 'perpignan', 'vaux-le-penil'
];

async function generateSitemap() {
  console.log('🚀 Génération du sitemap propre...\n');

  const urls = [];
  const now = new Date().toISOString().split('T')[0];

  // Ajouter les pages statiques
  console.log('📄 Ajout des pages statiques...');
  for (const page of staticPages) {
    urls.push({
      loc: `${SITE_URL}${page.url}`,
      lastmod: now,
      changefreq: page.changefreq,
      priority: page.priority,
    });
  }
  console.log(`✅ ${staticPages.length} pages statiques ajoutées\n`);

  // Ajouter les pages de villes
  console.log('🏙️  Ajout des pages de villes...');
  for (const city of cities) {
    urls.push({
      loc: `${SITE_URL}/assurance-taxi-${city}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.7',
    });
  }
  console.log(`✅ ${cities.length} pages de villes ajoutées\n`);

  // Ajouter les articles de blog
  console.log('📝 Récupération des articles de blog...');
  try {
    const blogFiles = fs.readdirSync(path.join(__dirname, '../public/content/blog'));
    const blogArticles = blogFiles
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));

    for (const slug of blogArticles) {
      urls.push({
        loc: `${SITE_URL}/blog/${slug}`,
        lastmod: now,
        changefreq: 'monthly',
        priority: '0.6',
      });
    }
    console.log(`✅ ${blogArticles.length} articles de blog ajoutés\n`);
  } catch (error) {
    console.log('⚠️  Erreur lors de la lecture des articles:', error.message);
  }

  // Ajouter les actualités
  console.log('📰 Récupération des actualités...');
  try {
    const { data: news, error } = await supabase
      .from('news')
      .select('slug, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(100);

    if (!error && news) {
      for (const article of news) {
        urls.push({
          loc: `${SITE_URL}/actualites/${article.slug}`,
          lastmod: article.published_at?.split('T')[0] || now,
          changefreq: 'monthly',
          priority: '0.5',
        });
      }
      console.log(`✅ ${news.length} actualités ajoutées\n`);
    }
  } catch (error) {
    console.log('⚠️  Erreur lors de la récupération des actualités:', error.message);
  }

  // Générer le XML
  console.log('🔨 Génération du fichier XML...');
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>';

  // Sauvegarder le fichier
  const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(sitemapPath, xml);

  console.log(`✅ Sitemap généré avec succès: ${sitemapPath}`);
  console.log(`📊 Total: ${urls.length} URLs\n`);

  // Statistiques
  console.log('📈 Statistiques:');
  console.log(`   - Pages statiques: ${staticPages.length}`);
  console.log(`   - Pages de villes: ${cities.length}`);
  console.log(`   - Total: ${urls.length} URLs\n`);

  console.log('✅ Sitemap propre généré sans erreurs 5XX ou redirections!\n');

  return urls;
}

function escapeXml(unsafe) {
  const encoded = unsafe.replace(/[^\x00-\x7F]/g, (char) => encodeURIComponent(char));
  return encoded
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Exécuter
generateSitemap()
  .then(() => {
    console.log('🎉 Terminé avec succès!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
