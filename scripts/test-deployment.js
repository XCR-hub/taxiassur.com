#!/usr/bin/env node

/**
 * Script de test post-déploiement
 * Teste que les URLs principales retournent 200 OK
 *
 * Usage: node scripts/test-deployment.js [url-base]
 * Example: node scripts/test-deployment.js https://taxiassur.com
 */

const BASE_URL = process.argv[2] || 'https://taxiassur.com';

console.log(`🧪 Test du déploiement sur ${BASE_URL}\n`);

// URLs critiques à tester
const urlsToTest = [
  '/',
  '/assurance-taxi',
  '/blog',
  '/faq',
  '/contact',
  '/ville/paris',
  '/ville/lyon',
  '/ville/marseille',
  '/blog/comparatif-assurances-taxi-2024',
  '/assurance-taxi-paris',
  '/gestion-sinistres',
  '/flotte-vehicules',
  '/plan-du-site',
  '/politique-confidentialite'
];

let passed = 0;
let failed = 0;
const errors = [];

async function testUrl(path) {
  const url = `${BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual' // Ne pas suivre les redirections automatiquement
    });

    // Accepter 200 ou 301/302 (redirections SEO légitimes)
    if (response.status === 200) {
      console.log(`✓ ${path} → 200 OK`);
      passed++;
      return true;
    } else if (response.status === 301 || response.status === 302) {
      const location = response.headers.get('location');
      console.log(`→ ${path} → ${response.status} (redirect vers ${location})`);
      passed++;
      return true;
    } else if (response.status >= 500 && response.status < 600) {
      console.error(`❌ ${path} → ${response.status} ERREUR SERVEUR`);
      errors.push({ path, status: response.status, type: 'server_error' });
      failed++;
      return false;
    } else {
      console.warn(`⚠️  ${path} → ${response.status}`);
      errors.push({ path, status: response.status, type: 'unexpected' });
      failed++;
      return false;
    }
  } catch (error) {
    console.error(`❌ ${path} → ERREUR: ${error.message}`);
    errors.push({ path, error: error.message, type: 'network_error' });
    failed++;
    return false;
  }
}

async function runTests() {
  console.log(`Testing ${urlsToTest.length} URLs...\n`);

  // Tester toutes les URLs
  for (const path of urlsToTest) {
    await testUrl(path);
  }

  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Résultats: ${passed} OK, ${failed} erreurs\n`);

  if (errors.length > 0) {
    console.log('❌ Erreurs détectées:\n');

    const serverErrors = errors.filter(e => e.type === 'server_error');
    if (serverErrors.length > 0) {
      console.log('🔥 ERREURS SERVEUR 5XX (CRITIQUE):');
      serverErrors.forEach(e => {
        console.log(`   - ${e.path} → ${e.status}`);
      });
      console.log('');
    }

    const networkErrors = errors.filter(e => e.type === 'network_error');
    if (networkErrors.length > 0) {
      console.log('🌐 ERREURS RÉSEAU:');
      networkErrors.forEach(e => {
        console.log(`   - ${e.path} → ${e.error}`);
      });
      console.log('');
    }

    const unexpectedErrors = errors.filter(e => e.type === 'unexpected');
    if (unexpectedErrors.length > 0) {
      console.log('⚠️  AUTRES ERREURS:');
      unexpectedErrors.forEach(e => {
        console.log(`   - ${e.path} → ${e.status}`);
      });
      console.log('');
    }

    console.log('📋 Actions recommandées:');
    if (serverErrors.length > 0) {
      console.log('   1. Vérifier que .htaccess est bien présent sur le serveur');
      console.log('   2. Vérifier les logs Apache pour plus de détails');
      console.log('   3. Vérifier que mod_rewrite est activé');
    }
    console.log('');

    process.exit(1);
  } else {
    console.log('✅ Tous les tests sont passés !');
    console.log('   → Le déploiement est réussi\n');
    process.exit(0);
  }
}

// Exécuter les tests
runTests().catch(error => {
  console.error('❌ Erreur lors de l\'exécution des tests:', error);
  process.exit(1);
});
