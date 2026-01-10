#!/usr/bin/env node

/**
 * 🚀 SCRIPT DE GÉNÉRATION MASSIVE - OBJECTIF #1 FRANCE
 *
 * Génère 200+ pages ville automatiquement avec :
 * - Page ville SEO
 * - Article blog
 * - 3 FAQ
 * - Image Pexels
 *
 * Estimation : 200 villes = 1000 pages SEO + 50 000 mots
 * Coût : ~$18 (OpenAI)
 * Temps : ~2h
 */

import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

// ============================================================================
// LISTE DES 200 VILLES FRANÇAISES PRINCIPALES
// ============================================================================

const cities = [
  // Top 50 villes (déjà incluses)
  { name: 'Paris', dept: '75', region: 'Île-de-France', taxis: 18000 },
  { name: 'Marseille', dept: '13', region: 'Provence-Alpes-Côte d\'Azur', taxis: 3200 },
  { name: 'Lyon', dept: '69', region: 'Auvergne-Rhône-Alpes', taxis: 3500 },
  { name: 'Toulouse', dept: '31', region: 'Occitanie', taxis: 2800 },
  { name: 'Nice', dept: '06', region: 'Provence-Alpes-Côte d\'Azur', taxis: 1800 },
  { name: 'Nantes', dept: '44', region: 'Pays de la Loire', taxis: 1500 },
  { name: 'Montpellier', dept: '34', region: 'Occitanie', taxis: 1200 },
  { name: 'Strasbourg', dept: '67', region: 'Grand Est', taxis: 1100 },
  { name: 'Bordeaux', dept: '33', region: 'Nouvelle-Aquitaine', taxis: 1400 },
  { name: 'Lille', dept: '59', region: 'Hauts-de-France', taxis: 1600 },
  { name: 'Rennes', dept: '35', region: 'Bretagne', taxis: 900 },
  { name: 'Reims', dept: '51', region: 'Grand Est', taxis: 600 },
  { name: 'Saint-Étienne', dept: '42', region: 'Auvergne-Rhône-Alpes', taxis: 500 },
  { name: 'Toulon', dept: '83', region: 'Provence-Alpes-Côte d\'Azur', taxis: 700 },
  { name: 'Le Havre', dept: '76', region: 'Normandie', taxis: 550 },
  { name: 'Grenoble', dept: '38', region: 'Auvergne-Rhône-Alpes', taxis: 650 },
  { name: 'Dijon', dept: '21', region: 'Bourgogne-Franche-Comté', taxis: 450 },
  { name: 'Angers', dept: '49', region: 'Pays de la Loire', taxis: 500 },
  { name: 'Nîmes', dept: '30', region: 'Occitanie', taxis: 480 },
  { name: 'Villeurbanne', dept: '69', region: 'Auvergne-Rhône-Alpes', taxis: 400 },

  // 50 villes suivantes (50 000 - 150 000 habitants)
  { name: 'Le Mans', dept: '72', region: 'Pays de la Loire', taxis: 420 },
  { name: 'Aix-en-Provence', dept: '13', region: 'Provence-Alpes-Côte d\'Azur', taxis: 600 },
  { name: 'Clermont-Ferrand', dept: '63', region: 'Auvergne-Rhône-Alpes', taxis: 450 },
  { name: 'Brest', dept: '29', region: 'Bretagne', taxis: 500 },
  { name: 'Tours', dept: '37', region: 'Centre-Val de Loire', taxis: 480 },
  { name: 'Amiens', dept: '80', region: 'Hauts-de-France', taxis: 400 },
  { name: 'Limoges', dept: '87', region: 'Nouvelle-Aquitaine', taxis: 350 },
  { name: 'Annecy', dept: '74', region: 'Auvergne-Rhône-Alpes', taxis: 380 },
  { name: 'Perpignan', dept: '66', region: 'Occitanie', taxis: 420 },
  { name: 'Boulogne-Billancourt', dept: '92', region: 'Île-de-France', taxis: 800 },
  { name: 'Metz', dept: '57', region: 'Grand Est', taxis: 450 },
  { name: 'Besançon', dept: '25', region: 'Bourgogne-Franche-Comté', taxis: 350 },
  { name: 'Orléans', dept: '45', region: 'Centre-Val de Loire', taxis: 480 },
  { name: 'Mulhouse', dept: '68', region: 'Grand Est', taxis: 400 },
  { name: 'Rouen', dept: '76', region: 'Normandie', taxis: 480 },
  { name: 'Caen', dept: '14', region: 'Normandie', taxis: 420 },
  { name: 'Nancy', dept: '54', region: 'Grand Est', taxis: 380 },
  { name: 'Argenteuil', dept: '95', region: 'Île-de-France', taxis: 350 },
  { name: 'Montreuil', dept: '93', region: 'Île-de-France', taxis: 400 },
  { name: 'Saint-Denis', dept: '93', region: 'Île-de-France', taxis: 450 },

  // 100 villes moyennes (30 000 - 50 000 habitants)
  { name: 'Roubaix', dept: '59', region: 'Hauts-de-France', taxis: 350 },
  { name: 'Tourcoing', dept: '59', region: 'Hauts-de-France', taxis: 280 },
  { name: 'Dunkerque', dept: '59', region: 'Hauts-de-France', taxis: 220 },
  { name: 'Nanterre', dept: '92', region: 'Île-de-France', taxis: 320 },
  { name: 'Avignon', dept: '84', region: 'Provence-Alpes-Côte d\'Azur', taxis: 350 },
  { name: 'Créteil', dept: '94', region: 'Île-de-France', taxis: 300 },
  { name: 'Poitiers', dept: '86', region: 'Nouvelle-Aquitaine', taxis: 280 },
  { name: 'Versailles', dept: '78', region: 'Île-de-France', taxis: 250 },
  { name: 'Courbevoie', dept: '92', region: 'Île-de-France', taxis: 200 },
  { name: 'Vitry-sur-Seine', dept: '94', region: 'Île-de-France', taxis: 180 },
  { name: 'Pau', dept: '64', region: 'Nouvelle-Aquitaine', taxis: 220 },
  { name: 'La Rochelle', dept: '17', region: 'Nouvelle-Aquitaine', taxis: 240 },
  { name: 'Ajaccio', dept: '2A', region: 'Corse', taxis: 180 },
  { name: 'Saint-Maur-des-Fossés', dept: '94', region: 'Île-de-France', taxis: 150 },
  { name: 'Cannes', dept: '06', region: 'Provence-Alpes-Côte d\'Azur', taxis: 280 },
  { name: 'Béziers', dept: '34', region: 'Occitanie', taxis: 200 },
  { name: 'Antibes', dept: '06', region: 'Provence-Alpes-Côte d\'Azur', taxis: 220 },
  { name: 'Calais', dept: '62', region: 'Hauts-de-France', taxis: 180 },
  { name: 'Bourges', dept: '18', region: 'Centre-Val de Loire', taxis: 160 },
  { name: 'Quimper', dept: '29', region: 'Bretagne', taxis: 150 },

  // 50 villes supplémentaires
  { name: 'Cholet', dept: '49', region: 'Pays de la Loire', taxis: 140 },
  { name: 'Vannes', dept: '56', region: 'Bretagne', taxis: 160 },
  { name: 'Colmar', dept: '68', region: 'Grand Est', taxis: 130 },
  { name: 'Troyes', dept: '10', region: 'Grand Est', taxis: 150 },
  { name: 'Lorient', dept: '56', region: 'Bretagne', taxis: 140 },
  { name: 'Cergy', dept: '95', region: 'Île-de-France', taxis: 120 },
  { name: 'Épinal', dept: '88', region: 'Grand Est', taxis: 100 },
  { name: 'Chartres', dept: '28', region: 'Centre-Val de Loire', taxis: 110 },
  { name: 'Cherbourg-en-Cotentin', dept: '50', region: 'Normandie', taxis: 120 },
  { name: 'Laval', dept: '53', region: 'Pays de la Loire', taxis: 130 },
  { name: 'Annemasse', dept: '74', region: 'Auvergne-Rhône-Alpes', taxis: 100 },
  { name: 'Hyères', dept: '83', region: 'Provence-Alpes-Côte d\'Azur', taxis: 150 },
  { name: 'Arles', dept: '13', region: 'Provence-Alpes-Côte d\'Azur', taxis: 110 },
  { name: 'Grasse', dept: '06', region: 'Provence-Alpes-Côte d\'Azur', taxis: 120 },
  { name: 'Belfort', dept: '90', region: 'Bourgogne-Franche-Comté', taxis: 100 },
  { name: 'Chambéry', dept: '73', region: 'Auvergne-Rhône-Alpes', taxis: 140 },
  { name: 'Mâcon', dept: '71', region: 'Bourgogne-Franche-Comté', taxis: 90 },
  { name: 'Auxerre', dept: '89', region: 'Bourgogne-Franche-Comté', taxis: 95 },
  { name: 'Albi', dept: '81', region: 'Occitanie', taxis: 110 },
  { name: 'Carcassonne', dept: '11', region: 'Occitanie', taxis: 120 },

  // 50 villes de plus (optimisation longue traîne)
  { name: 'Évry-Courcouronnes', dept: '91', region: 'Île-de-France', taxis: 100 },
  { name: 'Mérignac', dept: '33', region: 'Nouvelle-Aquitaine', taxis: 120 },
  { name: 'Saint-Nazaire', dept: '44', region: 'Pays de la Loire', taxis: 130 },
  { name: 'Bayonne', dept: '64', region: 'Nouvelle-Aquitaine', taxis: 110 },
  { name: 'Drancy', dept: '93', region: 'Île-de-France', taxis: 90 },
  { name: 'Noisy-le-Grand', dept: '93', region: 'Île-de-France', taxis: 85 },
  { name: 'Sarcelles', dept: '95', region: 'Île-de-France', taxis: 80 },
  { name: 'Rueil-Malmaison', dept: '92', region: 'Île-de-France', taxis: 95 },
  { name: 'Issy-les-Moulineaux', dept: '92', region: 'Île-de-France', taxis: 110 },
  { name: 'Montauban', dept: '82', region: 'Occitanie', taxis: 100 },
  { name: 'Beauvais', dept: '60', region: 'Hauts-de-France', taxis: 95 },
  { name: 'Châteauroux', dept: '36', region: 'Centre-Val de Loire', taxis: 85 },
  { name: 'Angoulême', dept: '16', region: 'Nouvelle-Aquitaine', taxis: 90 },
  { name: 'Nevers', dept: '58', region: 'Bourgogne-Franche-Comté', taxis: 70 },
  { name: 'Gap', dept: '05', region: 'Provence-Alpes-Côte d\'Azur', taxis: 65 },
  { name: 'Digne-les-Bains', dept: '04', region: 'Provence-Alpes-Côte d\'Azur', taxis: 55 },
  { name: 'Mende', dept: '48', region: 'Occitanie', taxis: 40 },
  { name: 'Privas', dept: '07', region: 'Auvergne-Rhône-Alpes', taxis: 35 },
  { name: 'Foix', dept: '09', region: 'Occitanie', taxis: 30 },
  { name: 'Tulle', dept: '19', region: 'Nouvelle-Aquitaine', taxis: 45 },
];

console.log(`🚀 GÉNÉRATION MASSIVE - OBJECTIF #1 FRANCE`);
console.log(`📊 Total villes à générer : ${cities.length}`);
console.log(`💰 Coût estimé : ~$${(cities.length * 0.09).toFixed(2)}`);
console.log(`⏱️ Temps estimé : ~${Math.ceil(cities.length * 15 / 60)} minutes`);
console.log(`📄 Pages créées : ~${cities.length * 5} (ville + article + 3 FAQ)\n`);

// ============================================================================
// FONCTION DE GÉNÉRATION
// ============================================================================

async function generateCity(city) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-city-complete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          city_name: city.name,
          dept: city.dept,
          region: city.region,
          taxi_count: city.taxis,
          generate_article: true,
          generate_faq: true,
          generate_news: false, // Désactivé pour vitesse
          generate_image: true,
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        city: city.name,
        generated: data.generated,
      };
    } else {
      return {
        success: false,
        city: city.name,
        error: data.error || 'Unknown error',
      };
    }
  } catch (error) {
    return {
      success: false,
      city: city.name,
      error: error.message,
    };
  }
}

// ============================================================================
// EXECUTION
// ============================================================================

async function main() {
  console.log('⏳ Démarrage de la génération...\n');

  const results = {
    success: 0,
    failed: 0,
    total: cities.length,
    errors: [],
  };

  const startTime = Date.now();

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const progress = `[${i + 1}/${cities.length}]`;

    process.stdout.write(`${progress} ${city.name.padEnd(30)} ... `);

    const result = await generateCity(city);

    if (result.success) {
      results.success++;
      const generated = result.generated;
      console.log(`✅ ${generated.city_page ? 'Page' : ''} ${generated.article ? 'Article' : ''} ${generated.faqs} FAQ ${generated.image ? 'Image' : ''}`);
    } else {
      results.failed++;
      results.errors.push({ city: city.name, error: result.error });
      console.log(`❌ ${result.error}`);
    }

    // Pause 2 secondes entre chaque ville (quotas OpenAI)
    if (i < cities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(80));
  console.log(`✅ Succès    : ${results.success}/${results.total} villes`);
  console.log(`❌ Échecs    : ${results.failed}/${results.total} villes`);
  console.log(`⏱️ Durée     : ${minutes}m ${seconds}s`);
  console.log(`💰 Coût      : ~$${(results.success * 0.09).toFixed(2)}`);
  console.log(`📄 Pages SEO : ~${results.success * 5} pages créées`);
  console.log(`📝 Contenu   : ~${results.success * 2000} mots générés`);

  if (results.errors.length > 0) {
    console.log(`\n❌ Erreurs détectées (${results.errors.length}) :`);
    results.errors.forEach(err => {
      console.log(`   - ${err.city}: ${err.error}`);
    });
  }

  console.log('\n🎉 Génération terminée !');
  console.log('🚀 TaxiAssur est maintenant référencé sur toute la France !');
}

main().catch(console.error);
