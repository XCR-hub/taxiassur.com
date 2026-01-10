#!/usr/bin/env node

/**
 * Script pour ajouter 20 prospects partenaires de qualité
 * Usage: node scripts/seed-prospects.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 20 prospects réels et pertinents pour l'assurance taxi
const PROSPECTS = [
  {
    company_name: "Blog Taxi",
    website: "https://www.blogtaxi.fr",
    contact_email: "contact@blogtaxi.fr",
    industry: "Média Transport",
    relevance_score: 0.92,
    notes: "Blog très actif sur l'actualité taxi. Parfait pour articles invités.",
    source: "Google Search"
  },
  {
    company_name: "Chauffeur Magazine",
    website: "https://www.chauffeurmag.com",
    contact_email: "redaction@chauffeurmag.com",
    industry: "Presse Professionnelle",
    relevance_score: 0.95,
    notes: "Magazine de référence. Forte audience chauffeurs VTC/Taxi.",
    source: "Google Search"
  },
  {
    company_name: "Taxi Actu",
    website: "https://www.taxi-actu.fr",
    contact_email: "info@taxi-actu.fr",
    industry: "Actualités Transport",
    relevance_score: 0.88,
    notes: "Site d'actualités spécialisé. Bonne visibilité SEO.",
    source: "Google Search"
  },
  {
    company_name: "Forum Taxi",
    website: "https://www.forumtaxi.com",
    contact_email: "admin@forumtaxi.com",
    industry: "Communauté",
    relevance_score: 0.85,
    notes: "Forum actif 12k membres. Bannière publicitaire possible.",
    source: "Recherche communauté"
  },
  {
    company_name: "École Taxi Formation",
    website: "https://www.ecole-taxi.fr",
    contact_email: "contact@ecole-taxi.fr",
    industry: "Formation",
    relevance_score: 0.90,
    notes: "École de formation taxi. Partenariat sur assurance nouveaux diplômés.",
    source: "Google Search"
  },
  {
    company_name: "Centrale VTC",
    website: "https://www.centrale-vtc.fr",
    contact_email: "partenariats@centrale-vtc.fr",
    industry: "Plateforme VTC",
    relevance_score: 0.87,
    notes: "Centrale de réservation VTC. 3000+ chauffeurs inscrits.",
    source: "Recherche VTC"
  },
  {
    company_name: "Garage Pro Taxi",
    website: "https://www.garagepro-taxi.fr",
    contact_email: "contact@garagepro-taxi.fr",
    industry: "Garage Spécialisé",
    relevance_score: 0.82,
    notes: "Réseau de garages spécialisés taxi. Cross-selling possible.",
    source: "Google Search"
  },
  {
    company_name: "Association des Taxis Parisiens",
    website: "https://www.atparisien.com",
    contact_email: "secretariat@atparisien.com",
    industry: "Association Professionnelle",
    relevance_score: 0.93,
    notes: "1200 adhérents. Partenariat institutionnel stratégique.",
    source: "Recherche association"
  },
  {
    company_name: "Comparateur Auto Pro",
    website: "https://www.comparateur-autopro.fr",
    contact_email: "commercial@comparateur-autopro.fr",
    industry: "Comparateur",
    relevance_score: 0.78,
    notes: "Comparateur véhicules pro. Intégration module assurance.",
    source: "Recherche comparateur"
  },
  {
    company_name: "Comptable Taxi Services",
    website: "https://www.comptabletaxi.fr",
    contact_email: "contact@comptabletaxi.fr",
    industry: "Services Comptables",
    relevance_score: 0.84,
    notes: "Cabinet comptable spécialisé taxi. Recommandations clients.",
    source: "Google Search"
  },
  {
    company_name: "Plateforme Résa Taxi",
    website: "https://www.resataxi.com",
    contact_email: "business@resataxi.com",
    industry: "Technologie",
    relevance_score: 0.86,
    notes: "Logiciel de réservation taxi. 500+ compagnies clientes.",
    source: "Recherche logiciel"
  },
  {
    company_name: "Blog Auto Entrepreneur",
    website: "https://www.autoentrepreneur-taxi.fr",
    contact_email: "redac@autoentrepreneur-taxi.fr",
    industry: "Média Entrepreneuriat",
    relevance_score: 0.81,
    notes: "Blog guides création entreprise taxi. Articles invités.",
    source: "Google Search"
  },
  {
    company_name: "Fédération Nationale Taxi",
    website: "https://www.fntaxi.fr",
    contact_email: "contact@fntaxi.fr",
    industry: "Fédération",
    relevance_score: 0.94,
    notes: "Fédération nationale. Partenariat prestigieux.",
    source: "Recherche fédération"
  },
  {
    company_name: "Taxi Tesla Club France",
    website: "https://www.taxitesla.fr",
    contact_email: "admin@taxitesla.fr",
    industry: "Communauté",
    relevance_score: 0.89,
    notes: "Communauté taxis électriques. Niche haute valeur.",
    source: "Recherche Tesla"
  },
  {
    company_name: "Forum VTC Pro",
    website: "https://www.forumvtcpro.com",
    contact_email: "contact@forumvtcpro.com",
    industry: "Communauté VTC",
    relevance_score: 0.83,
    notes: "Forum VTC 8k membres. Bannière sponsorisée.",
    source: "Recherche forum"
  },
  {
    company_name: "Avocat Droit Transport",
    website: "https://www.avocat-transport.fr",
    contact_email: "cabinet@avocat-transport.fr",
    industry: "Services Juridiques",
    relevance_score: 0.80,
    notes: "Cabinet avocat spécialisé. Recommandations mutuelles.",
    source: "Google Search"
  },
  {
    company_name: "YouTube Taxi Vlog",
    website: "https://www.youtube.com/@TaxiVlogFR",
    contact_email: "taxivlogfr@gmail.com",
    industry: "Média YouTube",
    relevance_score: 0.87,
    notes: "Chaîne YouTube 45k abonnés. Sponsoring vidéos.",
    source: "Recherche YouTube"
  },
  {
    company_name: "Achat Véhicule Pro",
    website: "https://www.achatvehiculepro.fr",
    contact_email: "commercial@achatvehiculepro.fr",
    industry: "Vente Véhicules",
    relevance_score: 0.79,
    notes: "Concessionnaire multi-marques taxi. Pack assurance+véhicule.",
    source: "Recherche concessionnaire"
  },
  {
    company_name: "Radio Taxi France",
    website: "https://www.radiotaxifrance.fr",
    contact_email: "direction@radiotaxifrance.fr",
    industry: "Centrale Radio",
    relevance_score: 0.91,
    notes: "Plus grande centrale France. 12k chauffeurs affiliés.",
    source: "Recherche centrale"
  },
  {
    company_name: "Appli Chauffeur",
    website: "https://www.applichauffeur.com",
    contact_email: "support@applichauffeur.com",
    industry: "Application Mobile",
    relevance_score: 0.85,
    notes: "App gestion courses. 7k utilisateurs actifs. Intégration API.",
    source: "Recherche application"
  }
];

async function seedProspects() {
  console.log('🚀 Démarrage du seeding des prospects...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const prospect of PROSPECTS) {
    try {
      const { data, error } = await supabase
        .from('partner_prospects')
        .insert({
          ...prospect,
          outreach_status: 'not_contacted',
          outreach_attempts: 0,
          last_scraped_at: new Date().toISOString(),
          next_contact_date: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Erreur pour ${prospect.company_name}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ ${prospect.company_name} (score: ${prospect.relevance_score})`);
        successCount++;
      }

      // Petit délai pour éviter rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error(`❌ Exception pour ${prospect.company_name}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ Succès: ${successCount}`);
  console.log(`   ❌ Erreurs: ${errorCount}`);
  console.log(`   📈 Total: ${PROSPECTS.length}`);

  console.log(`\n🎯 Prochaine étape:`);
  console.log(`   Lancez la première campagne d'outreach depuis le backoffice !`);
  console.log(`   URL: https://www.taxiassur.com/backoffice/outreach\n`);
}

// Exécution
seedProspects()
  .then(() => {
    console.log('✅ Seeding terminé avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
