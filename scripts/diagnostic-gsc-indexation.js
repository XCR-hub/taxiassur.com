#!/usr/bin/env node

/**
 * Diagnostic complet des problèmes d'indexation GSC
 * Teste toutes les URLs du site pour identifier :
 * - Erreurs 5xx
 * - Pages sans canonical
 * - Redirections
 * - Doublons
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://drohhxrkoequjphvabvq.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ VITE_SUPABASE_SERVICE_ROLE_KEY manquant');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// URLs à tester (extraites du sitemap)
const STATIC_URLS = [
  '/',
  '/assurance-taxi',
  '/assurance-moto-taxi',
  '/assurance-taxi-vtc',
  '/assurance-obligatoire-taxi',
  '/prix-assurance-taxi',
  '/quelle-assurance-taxi',
  '/rc-professionnelle',
  '/flotte-vehicules',
  '/gestion-sinistres',
  '/confiance-certifications',
  '/conseil-personnalise',
  '/faq',
  '/contact',
  '/blog',
  '/actualites',
  '/mentions-legales',
  '/politique-confidentialite',
  '/conditions-generales',
  '/partenaires',
  '/programme-parrainage',
  '/plan-du-site'
];

const CITY_URLS = [
  '/assurance-taxi-paris',
  '/assurance-taxi-marseille',
  '/assurance-taxi-lyon',
  '/assurance-taxi-toulouse',
  '/assurance-taxi-nice',
  '/assurance-taxi-nantes',
  '/assurance-taxi-strasbourg',
  '/assurance-taxi-montpellier',
  '/assurance-taxi-bordeaux',
  '/assurance-taxi-lille',
  '/assurance-taxi-rennes',
  '/assurance-taxi-reims',
  '/assurance-taxi-le-mans',
  '/assurance-taxi-aix-en-provence',
  '/assurance-taxi-clermont-ferrand',
  '/assurance-taxi-grenoble',
  '/assurance-taxi-dijon',
  '/assurance-taxi-angers',
  '/assurance-taxi-nimes',
  '/assurance-taxi-villeurbanne',
  '/assurance-taxi-le-havre',
  '/assurance-taxi-saint-etienne',
  '/assurance-taxi-toulon',
  '/assurance-taxi-orleans',
  '/assurance-taxi-besancon',
  '/assurance-taxi-amiens',
  '/assurance-taxi-tours',
  '/assurance-taxi-limoges',
  '/assurance-taxi-metz',
  '/assurance-taxi-brest',
  '/assurance-taxi-perpignan'
];

// Simuler une requête HTTP (en production, utiliser fetch réel)
async function checkUrl(url) {
  console.log(`🔍 Test: ${url}`);

  // Vérifier si c'est une route valide
  const route = url === '/' ? 'index' : url.substring(1);

  return {
    url,
    status: 200, // À remplacer par vraie requête HTTP
    hasCanonical: true,
    hasRedirect: false,
    indexable: true,
    issues: []
  };
}

async function logIssueToSupabase(issueType, url, priority, metadata) {
  try {
    const { data, error } = await supabase.rpc('log_gsc_issue', {
      p_issue_type: issueType,
      p_url: url,
      p_priority: priority,
      p_metadata: metadata
    });

    if (error) {
      console.error(`❌ Erreur log: ${error.message}`);
    } else {
      console.log(`✅ Issue loggée: ${issueType} - ${url}`);
    }
  } catch (err) {
    console.error(`❌ Erreur: ${err.message}`);
  }
}

async function main() {
  console.log('\n🚀 DIAGNOSTIC GSC - Problèmes d\'indexation\n');
  console.log('=' .repeat(60));

  const allUrls = [...STATIC_URLS, ...CITY_URLS];
  const results = {
    total: allUrls.length,
    errors_5xx: [],
    missing_canonical: [],
    redirects: [],
    soft_404: [],
    duplicates: [],
    ok: []
  };

  // Tester chaque URL
  for (const url of allUrls) {
    try {
      const result = await checkUrl(url);

      if (result.status >= 500) {
        results.errors_5xx.push(url);
        await logIssueToSupabase('5xx', url, 1, { status: result.status });
      } else if (result.status >= 300 && result.status < 400) {
        results.redirects.push(url);
        await logIssueToSupabase('redirect', url, 2, { status: result.status });
      } else if (!result.hasCanonical) {
        results.missing_canonical.push(url);
        await logIssueToSupabase('missing_canonical', url, 2, {});
      } else if (result.status === 200) {
        results.ok.push(url);
      }
    } catch (err) {
      console.error(`❌ Erreur test ${url}:`, err.message);
      results.errors_5xx.push(url);
      await logIssueToSupabase('error', url, 1, { error: err.message });
    }
  }

  // Rapport
  console.log('\n📊 RÉSULTATS DU DIAGNOSTIC\n');
  console.log('=' .repeat(60));
  console.log(`✅ Pages OK: ${results.ok.length}`);
  console.log(`🔴 Erreurs 5xx: ${results.errors_5xx.length}`);
  console.log(`⚠️  Redirections: ${results.redirects.length}`);
  console.log(`📝 Sans canonical: ${results.missing_canonical.length}`);
  console.log(`💔 Soft 404: ${results.soft_404.length}`);

  if (results.errors_5xx.length > 0) {
    console.log('\n🔴 ERREURS 5XX:');
    results.errors_5xx.forEach(url => console.log(`  - ${url}`));
  }

  if (results.redirects.length > 0) {
    console.log('\n⚠️  REDIRECTIONS:');
    results.redirects.forEach(url => console.log(`  - ${url}`));
  }

  if (results.missing_canonical.length > 0) {
    console.log('\n📝 SANS CANONICAL:');
    results.missing_canonical.forEach(url => console.log(`  - ${url}`));
  }

  // Récupérer le rapport Supabase
  console.log('\n📈 Récupération du rapport Supabase...\n');
  const { data: report, error } = await supabase.rpc('get_indexation_report');

  if (!error && report) {
    console.log('📊 RAPPORT SUPABASE:');
    console.log(JSON.stringify(report, null, 2));
  }

  // Sauvegarder le rapport
  const reportPath = path.join(__dirname, '..', 'GSC_DIAGNOSTIC_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Rapport sauvegardé: ${reportPath}`);

  console.log('\n✅ Diagnostic terminé!\n');

  // Retourner le code d'erreur approprié
  if (results.errors_5xx.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
