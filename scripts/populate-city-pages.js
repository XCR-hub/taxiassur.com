#!/usr/bin/env node

/**
 * Script de population de la table city_pages dans Supabase
 * Insère toutes les villes françaises principales avec leurs données
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const cities = [
  { name: 'Paris', dept: '75', region: 'Île-de-France', taxi_count: 18000 },
  { name: 'Lyon', dept: '69', region: 'Auvergne-Rhône-Alpes', taxi_count: 3500 },
  { name: 'Marseille', dept: '13', region: 'Provence-Alpes-Côte d\'Azur', taxi_count: 3200 },
  { name: 'Toulouse', dept: '31', region: 'Occitanie', taxi_count: 2800 },
  { name: 'Nice', dept: '06', region: 'Provence-Alpes-Côte d\'Azur', taxi_count: 1800 },
  { name: 'Nantes', dept: '44', region: 'Pays de la Loire', taxi_count: 1500 },
  { name: 'Montpellier', dept: '34', region: 'Occitanie', taxi_count: 1200 },
  { name: 'Strasbourg', dept: '67', region: 'Grand Est', taxi_count: 1100 },
  { name: 'Bordeaux', dept: '33', region: 'Nouvelle-Aquitaine', taxi_count: 1400 },
  { name: 'Lille', dept: '59', region: 'Hauts-de-France', taxi_count: 1600 },
  { name: 'Rennes', dept: '35', region: 'Bretagne', taxi_count: 900 },
  { name: 'Reims', dept: '51', region: 'Grand Est', taxi_count: 600 },
  { name: 'Saint-Étienne', dept: '42', region: 'Auvergne-Rhône-Alpes', taxi_count: 500 },
  { name: 'Toulon', dept: '83', region: 'Provence-Alpes-Côte d\'Azur', taxi_count: 700 },
  { name: 'Le Havre', dept: '76', region: 'Normandie', taxi_count: 550 },
  { name: 'Grenoble', dept: '38', region: 'Auvergne-Rhône-Alpes', taxi_count: 650 },
  { name: 'Dijon', dept: '21', region: 'Bourgogne-Franche-Comté', taxi_count: 450 },
  { name: 'Angers', dept: '49', region: 'Pays de la Loire', taxi_count: 500 },
  { name: 'Nîmes', dept: '30', region: 'Occitanie', taxi_count: 480 },
  { name: 'Villeurbanne', dept: '69', region: 'Auvergne-Rhône-Alpes', taxi_count: 400 },
  { name: 'Le Mans', dept: '72', region: 'Pays de la Loire', taxi_count: 420 },
  { name: 'Aix-en-Provence', dept: '13', region: 'Provence-Alpes-Côte d\'Azur', taxi_count: 600 },
  { name: 'Clermont-Ferrand', dept: '63', region: 'Auvergne-Rhône-Alpes', taxi_count: 450 },
  { name: 'Brest', dept: '29', region: 'Bretagne', taxi_count: 500 },
  { name: 'Tours', dept: '37', region: 'Centre-Val de Loire', taxi_count: 480 },
  { name: 'Amiens', dept: '80', region: 'Hauts-de-France', taxi_count: 400 },
  { name: 'Limoges', dept: '87', region: 'Nouvelle-Aquitaine', taxi_count: 350 },
  { name: 'Annecy', dept: '74', region: 'Auvergne-Rhône-Alpes', taxi_count: 380 },
  { name: 'Perpignan', dept: '66', region: 'Occitanie', taxi_count: 420 },
  { name: 'Boulogne-Billancourt', dept: '92', region: 'Île-de-France', taxi_count: 800 },
  { name: 'Metz', dept: '57', region: 'Grand Est', taxi_count: 450 },
  { name: 'Besançon', dept: '25', region: 'Bourgogne-Franche-Comté', taxi_count: 350 },
  { name: 'Orléans', dept: '45', region: 'Centre-Val de Loire', taxi_count: 480 },
  { name: 'Mulhouse', dept: '68', region: 'Grand Est', taxi_count: 400 }
];

async function populateCityPages() {
  console.log('🚀 Début de la population de city_pages...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const city of cities) {
    const slug = city.name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const cityData = {
      city: city.name,
      slug: slug,
      dept: city.dept,
      region: city.region,
      title: `Assurance Taxi ${city.name} (${city.dept}) - Devis Gratuit & Rapide`,
      meta_description: `Trouvez la meilleure assurance taxi à ${city.name} (${city.dept}). Devis gratuit en 2 min, tarifs négociés, service professionnel. Expert taxi ${city.region}.`,
      keywords: [
        `assurance taxi ${city.name}`,
        `assurance taxi ${city.dept}`,
        `devis assurance taxi ${city.name}`,
        `tarif assurance taxi ${city.name}`,
        `courtier assurance taxi ${city.name}`
      ],
      taxi_count: city.taxi_count,
      content: `
        <h1>Assurance Taxi à ${city.name} (${city.dept})</h1>

        <p>Vous êtes chauffeur de taxi à <strong>${city.name}</strong> et recherchez une assurance adaptée ?
        TaxiAssur, courtier spécialisé ORIAS, vous propose des solutions d'assurance professionnelle
        spécialement conçues pour les taxis de ${city.name} et du département ${city.dept}.</p>

        <h2>Pourquoi choisir TaxiAssur à ${city.name} ?</h2>

        <ul>
          <li><strong>Expertise locale</strong> : Connaissance approfondie du marché taxi de ${city.name}</li>
          <li><strong>Tarifs négociés</strong> : Conditions préférentielles pour la région ${city.region}</li>
          <li><strong>Service rapide</strong> : Devis gratuit en 2 minutes, réponse sous 15 minutes</li>
          <li><strong>Accompagnement personnalisé</strong> : Conseiller dédié expert du marché ${city.name}</li>
        </ul>

        <h2>Nos garanties pour les taxis de ${city.name}</h2>

        <ul>
          <li>Responsabilité Civile Professionnelle obligatoire</li>
          <li>Dommages tous accidents</li>
          <li>Vol et incendie</li>
          <li>Bris de glace</li>
          <li>Protection juridique</li>
          <li>Assistance 24h/7j</li>
        </ul>

        <h2>Les taxis de ${city.name} nous font confiance</h2>

        <p>Avec plus de ${city.taxi_count} taxis en activité à ${city.name}, nous sommes fiers d'accompagner
        de nombreux professionnels du transport de personnes dans la région ${city.region}.</p>

        <h2>Demandez votre devis gratuit</h2>

        <p>Obtenez votre devis d'assurance taxi pour ${city.name} en 2 minutes. Sans engagement,
        réponse rapide garantie sous 15 minutes.</p>
      `,
      status: 'published'
    };

    try {
      const { data, error } = await supabase
        .from('city_pages')
        .upsert(cityData, { onConflict: 'slug' });

      if (error) {
        console.error(`❌ ${city.name} - Erreur:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ ${city.name} (${city.dept}) - Ajoutée avec succès`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ ${city.name} - Exception:`, err.message);
      errorCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ Succès: ${successCount}`);
  console.log(`   ❌ Erreurs: ${errorCount}`);
  console.log(`   📍 Total: ${cities.length}`);
}

populateCityPages()
  .then(() => {
    console.log('\n✨ Population terminée avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });
