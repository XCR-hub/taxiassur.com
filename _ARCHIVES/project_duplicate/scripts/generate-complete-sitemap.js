#!/usr/bin/env node

/**
 * Génère un sitemap.xml complet avec TOUTES les pages du site
 * Inclut: pages statiques, articles blog, pages villes, etc.
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://taxiassur.com';
const TODAY = new Date().toISOString().split('T')[0];

// Pages statiques principales
const staticPages = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/assurance-taxi', priority: '0.9', changefreq: 'weekly' },
  { loc: '/blog', priority: '0.9', changefreq: 'daily' },
  { loc: '/faq', priority: '0.8', changefreq: 'weekly' },
  { loc: '/contact', priority: '0.8', changefreq: 'monthly' },
  { loc: '/devis-instantane', priority: '0.9', changefreq: 'weekly' },
  { loc: '/comparateur-axa', priority: '0.8', changefreq: 'weekly' },
  { loc: '/partenaires', priority: '0.6', changefreq: 'monthly' },
  { loc: '/partenariat', priority: '0.7', changefreq: 'monthly' },
  { loc: '/ambassadeur', priority: '0.7', changefreq: 'monthly' },
  { loc: '/confiance-certifications', priority: '0.7', changefreq: 'monthly' },
  { loc: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
  { loc: '/politique-confidentialite', priority: '0.3', changefreq: 'yearly' },
  { loc: '/conditions-generales', priority: '0.3', changefreq: 'yearly' },
  { loc: '/sitemap', priority: '0.5', changefreq: 'monthly' },
  { loc: '/avis', priority: '0.7', changefreq: 'monthly' },
  { loc: '/actualites', priority: '0.8', changefreq: 'daily' },
];

// Pages offres
const offerPages = [
  { loc: '/assurance-taxi-vtc', priority: '0.8', changefreq: 'weekly' },
  { loc: '/assurance-taxi-vtc-combine', priority: '0.8', changefreq: 'weekly' },
  { loc: '/rc-professionnelle', priority: '0.8', changefreq: 'weekly' },
  { loc: '/flotte-vehicules', priority: '0.8', changefreq: 'weekly' },
  { loc: '/assurance-taxi-urgence', priority: '0.8', changefreq: 'weekly' },
  { loc: '/assurance-taxi-tesla', priority: '0.8', changefreq: 'weekly' },
  { loc: '/assurance-moto-taxi', priority: '0.8', changefreq: 'weekly' },
  { loc: '/assurance-taxi-paris', priority: '0.8', changefreq: 'weekly' },
  { loc: '/quelle-assurance-taxi', priority: '0.8', changefreq: 'weekly' },
  { loc: '/assurance-taxi-obligatoire', priority: '0.8', changefreq: 'weekly' },
  { loc: '/prix-assurance-taxi', priority: '0.8', changefreq: 'weekly' },
  { loc: '/conseil-personnalise', priority: '0.7', changefreq: 'monthly' },
  { loc: '/gestion-sinistres', priority: '0.7', changefreq: 'monthly' },
  { loc: '/taxis-sinistres', priority: '0.7', changefreq: 'monthly' },
];

// 100+ grandes villes de France
const cities = [
  'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Montpellier',
  'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Saint-Étienne',
  'Toulon', 'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne',
  'Clermont-Ferrand', 'Le Mans', 'Aix-en-Provence', 'Brest', 'Tours', 'Amiens',
  'Limoges', 'Annecy', 'Perpignan', 'Boulogne-Billancourt', 'Metz', 'Besançon',
  'Orléans', 'Saint-Denis', 'Argenteuil', 'Rouen', 'Mulhouse', 'Montreuil',
  'Caen', 'Nancy', 'Tourcoing', 'Roubaix', 'Nanterre', 'Avignon',
  'Vitry-sur-Seine', 'Créteil', 'Dunkerque', 'Poitiers', 'Asnières-sur-Seine',
  'Versailles', 'Courbevoie', 'Colombes', 'Aulnay-sous-Bois', 'Rueil-Malmaison',
  'Aubervilliers', 'Champigny-sur-Marne', 'Saint-Maur-des-Fossés', 'Antibes',
  'Cannes', 'Calais', 'Béziers', 'Bourges', 'Saint-Nazaire', 'Valence',
  'Quimper', 'Lorient', 'Troyes', 'Chambéry', 'Niort', 'Sarcelles', 'Villejuif',
  'La Rochelle', 'Maisons-Alfort', 'Épinay-sur-Seine', 'Cholet', 'Ivry-sur-Seine',
  'Évry', 'Cergy', 'Pessac', 'Levallois-Perret', 'Vénissieux', 'Hyères',
  'Cayenne', 'Clichy', 'Beauvais', 'Neuilly-sur-Seine', 'Antony', 'Grasse',
  'Clamart', 'Sartrouville', 'Issy-les-Moulineaux', 'Noisy-le-Grand', 'Colmar',
  'Drancy', 'Pantin', 'La Seyne-sur-Mer', 'Saint-Quentin', 'Belfort',
  'Châteauroux', 'Mérignac', 'Chartres'
];

// Générer les pages villes (2 URLs par ville: blog + page ville)
const cityPages = [];
cities.forEach(city => {
  const citySlug = city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ /g, '-')
    .replace(/'/g, '-');

  // Page ville
  cityPages.push({
    loc: `/taxi-${citySlug}`,
    priority: '0.7',
    changefreq: 'monthly'
  });

  // Article blog ville
  cityPages.push({
    loc: `/blog/assurance-taxi-${citySlug}-2025`,
    priority: '0.7',
    changefreq: 'weekly'
  });
});

// Articles de blog principaux
const blogArticles = [
  'assurance-taxi-2024',
  'assurance-flotte-taxi-guide-complet-2025',
  'assurance-taxi-jeune-conducteur',
  'assurance-taxi-jeune-conducteur-solutions-2025',
  'assurance-taxi-resilié',
  'comparatif-assurances-taxi-2025-axa-generali-covea',
  'economiser-assurance-taxi-2024',
  'changement-assurance-taxi-mode-emploi',
  'sinistre-taxi-procedure-complete-2025',
  'sinistre-taxi-que-faire',
  'rc-pro-taxi-3-erreurs-eviter-2025',
  'rc-pro-taxi-obligatoire-guide-complet-2025',
  'assurance-vtc-vs-taxi-differences-2025',
  'double-activite-taxi-vtc-assurance',
  'reglementation-taxi-2024',
  'devenir-chauffeur-taxi-2024',
  'choisir-vehicule-taxi-2024',
  'vehicules-electriques-taxi',
  'assurance-taxi-electrique-tesla-2025',
  'cout-assurance-taxi-par-ville',
  'comment-payer-30-moins-cher-assurance-taxi-2025',
  'comparateur-assurance-taxi-guide-2025',
  // Articles SEO généraux
  'examen-taxi-guide-complet-2025',
  'assurance-taxi-pas-cher-guide-complet-2025',
  'meilleure-assurance-taxi-2025-guide-complet-2025',
  'comparateur-assurance-taxi-guide-complet-2025',
  'assurance-taxi-jeune-conducteur-guide-complet-2025',
  'assurance-taxi-senior-guide-complet-2025',
  'assurance-taxi-électrique-guide-complet-2025',
  'assurance-taxi-hybride-guide-complet-2025',
  'assurance-taxi-tesla-guide-complet-2025',
  'assurance-taxi-mercedes-guide-complet-2025',
  'assurance-taxi-prius-guide-complet-2025',
  'formation-taxi-guide-complet-2025',
  'garantie-décennale-taxi-guide-complet-2025',
  'assurance-flotte-taxi-guide-complet-2025',
  'assurance-multi-véhicules-taxi-guide-complet-2025',
  'assurance-taxi-vtc-guide-complet-2025',
  'double-activité-taxi-vtc-guide-complet-2025',
  'changement-assurance-taxi-guide-complet-2025',
  'résiliation-assurance-taxi-guide-complet-2025',
  'sinistre-taxi-procédure-guide-complet-2025',
  'accident-taxi-responsabilité-guide-complet-2025',
  'franchise-assurance-taxi-guide-complet-2025',
  'malus-assurance-taxi-guide-complet-2025',
  'bonus-assurance-taxi-guide-complet-2025',
  'prix-assurance-taxi-paris-guide-complet-2025',
  'tarif-assurance-taxi-lyon-guide-complet-2025',
  'cout-assurance-taxi-marseille-guide-complet-2025',
  'assurance-taxi-aeroport-guide-complet-2025',
  'assurance-taxi-gare-guide-complet-2025',
  'assurance-taxi-maraude-guide-complet-2025',
  'assurance-taxi-conventionne-guide-complet-2025',
  'assurance-taxi-pmr-guide-complet-2025',
  'assurance-taxi-handicap-guide-complet-2025',
  'assurance-taxi-7-places-guide-complet-2025',
  'assurance-taxi-break-guide-complet-2025',
  'assurance-taxi-berline-guide-complet-2025',
  'comment-devenir-taxi-guide-complet-2025',
  'carte-professionnelle-taxi-guide-complet-2025',
  'licence-taxi-prix-guide-complet-2025',
  'rachat-licence-taxi-guide-complet-2025',
  'location-licence-taxi-guide-complet-2025',
  'réglementation-taxi-2025-guide-complet-2025',
  'loi-taxi-2025-guide-complet-2025',
  'ordonnance-taxi-guide-complet-2025',
  'prefecture-taxi-guide-complet-2025',
  'cpam-taxi-guide-complet-2025',
  'assurance-taxi-independant-guide-complet-2025',
  'assurance-taxi-salarie-guide-complet-2025',
  'statut-taxi-artisan-guide-complet-2025',
];

const blogPages = blogArticles.map(slug => ({
  loc: `/blog/${slug}`,
  priority: '0.7',
  changefreq: 'weekly'
}));

// Combiner toutes les pages
const allPages = [
  ...staticPages,
  ...offerPages,
  ...cityPages,
  ...blogPages,
];

// Générer le XML
function generateSitemap() {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
  xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

  allPages.forEach(page => {
    xml += '  <url>\n';
    xml += `    <loc>${SITE_URL}${page.loc}</loc>\n`;
    xml += `    <lastmod>${TODAY}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';

  return xml;
}

// Écrire le sitemap
const sitemapContent = generateSitemap();
const outputPath = path.join(__dirname, '../public/sitemap.xml');

fs.writeFileSync(outputPath, sitemapContent, 'utf8');

console.log('✅ Sitemap généré avec succès!');
console.log(`📊 Total URLs: ${allPages.length}`);
console.log(`📍 Pages statiques: ${staticPages.length}`);
console.log(`📍 Pages offres: ${offerPages.length}`);
console.log(`📍 Pages villes: ${cityPages.length}`);
console.log(`📍 Articles blog: ${blogPages.length}`);
console.log(`📄 Fichier: ${outputPath}`);
console.log('');
console.log('🎯 Prochaines étapes:');
console.log('1. Uploader le sitemap.xml sur votre serveur');
console.log('2. Soumettre à Google Search Console');
console.log('3. Attendre 24-48h pour voir les premières indexations');
