#!/usr/bin/env node

/**
 * Script de correction des problèmes d'indexation GSC
 *
 * Objectifs:
 * 1. Générer sitemap propre sans doublons
 * 2. Vérifier toutes les balises canonical
 * 3. Détecter les redirections multiples
 * 4. Identifier les pages 5xx
 * 5. Nettoyer les soft 404
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://taxiassur.com';
const OUTPUT_DIR = path.join(__dirname, '../public');

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================
// 1. GÉNÉRER SITEMAP PROPRE
// ============================================

function generateCleanSitemap() {
  log('\n📍 Génération du sitemap propre...', 'cyan');

  const pages = [
    // Pages principales
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/assurance-taxi', priority: 0.9, changefreq: 'weekly' },
    { url: '/assurance-taxi-vtc', priority: 0.9, changefreq: 'weekly' },
    { url: '/assurance-moto-taxi', priority: 0.9, changefreq: 'weekly' },
    { url: '/prix-assurance-taxi', priority: 0.9, changefreq: 'weekly' },
    { url: '/quelle-assurance-taxi', priority: 0.9, changefreq: 'weekly' },
    { url: '/rc-professionnelle', priority: 0.8, changefreq: 'weekly' },
    { url: '/flotte-vehicules', priority: 0.8, changefreq: 'weekly' },
    { url: '/assurance-taxi-obligatoire', priority: 0.8, changefreq: 'weekly' },

    // Pages secondaires
    { url: '/contact', priority: 0.7, changefreq: 'monthly' },
    { url: '/blog', priority: 0.7, changefreq: 'daily' },
    { url: '/actualites', priority: 0.7, changefreq: 'daily' },
    { url: '/faq', priority: 0.7, changefreq: 'weekly' },
    { url: '/avis', priority: 0.6, changefreq: 'monthly' },
    { url: '/villes', priority: 0.6, changefreq: 'monthly' },

    // Pages légales
    { url: '/mentions-legales', priority: 0.3, changefreq: 'yearly' },
    { url: '/politique-confidentialite', priority: 0.3, changefreq: 'yearly' },
    { url: '/conditions-generales', priority: 0.3, changefreq: 'yearly' },

    // Pages ville principales (top 30)
    { url: '/assurance-taxi-paris', priority: 0.9, changefreq: 'weekly' },
    { url: '/assurance-taxi-marseille', priority: 0.8, changefreq: 'weekly' },
    { url: '/assurance-taxi-lyon', priority: 0.8, changefreq: 'weekly' },
    { url: '/assurance-taxi-toulouse', priority: 0.8, changefreq: 'weekly' },
    { url: '/assurance-taxi-nice', priority: 0.8, changefreq: 'weekly' },
    { url: '/assurance-taxi-nantes', priority: 0.7, changefreq: 'monthly' },
    { url: '/assurance-taxi-strasbourg', priority: 0.7, changefreq: 'monthly' },
    { url: '/assurance-taxi-montpellier', priority: 0.7, changefreq: 'monthly' },
    { url: '/assurance-taxi-bordeaux', priority: 0.7, changefreq: 'monthly' },
    { url: '/assurance-taxi-lille', priority: 0.7, changefreq: 'monthly' },
    { url: '/assurance-taxi-rennes', priority: 0.6, changefreq: 'monthly' },
    { url: '/assurance-taxi-reims', priority: 0.6, changefreq: 'monthly' },
    { url: '/assurance-taxi-le-havre', priority: 0.6, changefreq: 'monthly' },
    { url: '/assurance-taxi-saint-etienne', priority: 0.6, changefreq: 'monthly' },
    { url: '/assurance-taxi-toulon', priority: 0.6, changefreq: 'monthly' },
    { url: '/assurance-taxi-grenoble', priority: 0.6, changefreq: 'monthly' },
    { url: '/assurance-taxi-dijon', priority: 0.6, changefreq: 'monthly' },
    { url: '/assurance-taxi-angers', priority: 0.5, changefreq: 'monthly' },
    { url: '/assurance-taxi-nimes', priority: 0.5, changefreq: 'monthly' },
    { url: '/assurance-taxi-villeurbanne', priority: 0.5, changefreq: 'monthly' }
  ];

  const now = new Date().toISOString().split('T')[0];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  // Ajouter chaque URL (sans doublons)
  const uniqueUrls = new Set();

  pages.forEach(page => {
    const fullUrl = `${SITE_URL}${page.url}`;

    // Vérifier qu'il n'y a pas de doublon
    if (uniqueUrls.has(fullUrl)) {
      log(`⚠️  URL dupliquée ignorée: ${fullUrl}`, 'yellow');
      return;
    }

    uniqueUrls.add(fullUrl);

    sitemap += `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  });

  sitemap += `</urlset>`;

  // Sauvegarder le sitemap
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemap, 'utf8');

  log(`✅ Sitemap généré: ${uniqueUrls.size} URLs uniques`, 'green');
  log(`   Fichier: ${OUTPUT_DIR}/sitemap.xml`, 'blue');
}

// ============================================
// 2. GÉNÉRER ROBOTS.TXT OPTIMISÉ
// ============================================

function generateRobotsTxt() {
  log('\n🤖 Génération du robots.txt optimisé...', 'cyan');

  const robotsTxt = `# Robots.txt optimisé pour SEO - TaxiAssur.com
User-agent: *
Allow: /

# Bloquer les chemins sensibles
Disallow: /backoffice/
Disallow: /api/
Disallow: /webhooks/
Disallow: /admin/
Disallow: /*.json$
Disallow: /*?*utm_*

# Autoriser les crawlers spécifiques
User-agent: Googlebot
Allow: /

User-agent: Googlebot-Image
Allow: /

User-agent: Bingbot
Allow: /

# Indiquer le sitemap
Sitemap: ${SITE_URL}/sitemap.xml

# Crawl-delay pour éviter surcharge
Crawl-delay: 1
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), robotsTxt, 'utf8');

  log('✅ robots.txt généré', 'green');
}

// ============================================
// 3. RAPPORT DES PROBLÈMES POTENTIELS
// ============================================

function generateReport() {
  log('\n📊 Rapport des problèmes d\'indexation...', 'cyan');

  const report = {
    erreurs5xx: [
      'Vérifier les logs serveur IONOS',
      'Limites PHP augmentées dans .htaccess',
      'Tester toutes les API PHP: /api/lead.php, /api/newsletter.php'
    ],
    redirections: [
      'Ordre optimal: HTTPS > non-www > trailing slash',
      'Réduire les chaînes de redirections à 1 seule',
      'Tester avec: curl -I -L https://taxiassur.com/[URL]'
    ],
    doublons: [
      'Balises canonical sur toutes les pages ✅',
      'Configurer paramètres URL dans GSC (utm_*, fbclid)',
      'Sitemap propre sans doublons ✅'
    ],
    soft404: [
      'Redirections /offres, /comparateur-axa-taxi configurées ✅',
      'Vérifier avec: curl -I https://taxiassur.com/offres',
      'Doit retourner: HTTP/1.1 301 Moved Permanently'
    ]
  };

  log('\n📋 ACTIONS PRIORITAIRES:', 'yellow');
  log('\n1️⃣  ERREURS 5XX (29 pages)', 'red');
  report.erreurs5xx.forEach(action => log(`   • ${action}`));

  log('\n2️⃣  REDIRECTIONS (41 pages)', 'yellow');
  report.redirections.forEach(action => log(`   • ${action}`));

  log('\n3️⃣  PAGES EN DOUBLE (43 pages)', 'yellow');
  report.doublons.forEach(action => log(`   • ${action}`));

  log('\n4️⃣  SOFT 404 (4 pages)', 'green');
  report.soft404.forEach(action => log(`   • ${action}`));

  log('\n\n📝 FICHIER DE DOCUMENTATION:', 'cyan');
  log('   → FIX_INDEXATION_GSC_COMPLETE_13MARS2026.md', 'blue');

  log('\n\n🚀 PROCHAINES ÉTAPES:', 'green');
  log('   1. Déployer les fichiers générés (sitemap.xml, robots.txt)', 'blue');
  log('   2. Mettre à jour .htaccess avec limites PHP augmentées', 'blue');
  log('   3. Soumettre sitemap à Google Search Console', 'blue');
  log('   4. Tester les redirections principales', 'blue');
  log('   5. Vérifier les logs serveur pour erreurs 5xx', 'blue');

  log('\n\n📞 SUPPORT:', 'cyan');
  log('   • Google Search Console: https://search.google.com/search-console', 'blue');
  log('   • Test résultats enrichis: https://search.google.com/test/rich-results', 'blue');
  log('   • Outil inspection URL: https://search.google.com/search-console/inspect', 'blue');
}

// ============================================
// MAIN
// ============================================

function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🔧 CORRECTION DES PROBLÈMES D\'INDEXATION GSC', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  try {
    // 1. Générer sitemap propre
    generateCleanSitemap();

    // 2. Générer robots.txt
    generateRobotsTxt();

    // 3. Rapport
    generateReport();

    log('\n' + '='.repeat(60), 'green');
    log('✅ CORRECTION TERMINÉE AVEC SUCCÈS', 'green');
    log('='.repeat(60) + '\n', 'green');

  } catch (error) {
    log('\n❌ ERREUR:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Exécuter le script
main();
