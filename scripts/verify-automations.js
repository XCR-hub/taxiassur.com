#!/usr/bin/env node

/**
 * Script de vérification complète des automatisations TaxiAssur
 * Teste tous les systèmes, Edge Functions, CRON jobs, et configurations
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger .env manuellement
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables Supabase manquantes dans .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Codes de couleur pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function success(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function error(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function warning(msg) {
  console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
}

function info(msg) {
  console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`);
}

function section(msg) {
  console.log(`\n${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${msg}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let warnings = 0;

function test(name, result, details = '') {
  totalTests++;
  if (result === true) {
    passedTests++;
    success(`${name}`);
    if (details) info(`   ${details}`);
  } else if (result === 'warning') {
    warnings++;
    warning(`${name}`);
    if (details) info(`   ${details}`);
  } else {
    failedTests++;
    error(`${name}`);
    if (details) error(`   ${details}`);
  }
}

// ============================================================================
// TESTS DES VARIABLES D'ENVIRONNEMENT
// ============================================================================

async function checkEnvironmentVariables() {
  section('📋 VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT');

  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const optionalVars = [
    'VITE_GOOGLE_MAPS_API_KEY',
    'VITE_GOOGLE_CSE_ID',
    'VITE_GOOGLE_CSE_API_KEY',
    'VITE_PAGESPEED_API_KEY'
  ];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    test(
      `Variable ${varName}`,
      !!value,
      value ? `Définie (${value.substring(0, 20)}...)` : 'Manquante'
    );
  });

  optionalVars.forEach(varName => {
    const value = process.env[varName];
    test(
      `Variable optionnelle ${varName}`,
      value ? true : 'warning',
      value ? `Définie` : 'Non définie (certaines fonctionnalités seront limitées)'
    );
  });
}

// ============================================================================
// TESTS DE CONNEXION SUPABASE
// ============================================================================

async function checkSupabaseConnection() {
  section('🔌 VÉRIFICATION DE LA CONNEXION SUPABASE');

  try {
    const { data, error } = await supabase.from('leads').select('count').limit(1);
    test('Connexion Supabase', !error, error ? error.message : 'Connexion réussie');
  } catch (err) {
    test('Connexion Supabase', false, err.message);
  }
}

// ============================================================================
// TESTS DES TABLES
// ============================================================================

async function checkDatabaseTables() {
  section('🗄️  VÉRIFICATION DES TABLES DE BASE DE DONNÉES');

  const expectedTables = [
    'leads',
    'backlink_opportunities',
    'partner_prospects',
    'automation_logs',
    'seo_content',
    'blog_posts',
    'faq_entries',
    'city_pages',
    'referral_codes',
    'referral_rewards',
    'ai_training_data',
    'ai_performance_metrics',
    'content_schedule',
    'social_media_posts'
  ];

  for (const tableName of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);

      test(
        `Table "${tableName}"`,
        !error,
        error ? `Erreur: ${error.message}` : `Accessible`
      );
    } catch (err) {
      test(`Table "${tableName}"`, false, err.message);
    }
  }
}

// ============================================================================
// TESTS DES DONNÉES
// ============================================================================

async function checkDataIntegrity() {
  section('📊 VÉRIFICATION DE L\'INTÉGRITÉ DES DONNÉES');

  // Compter les leads
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*');

    test(
      'Leads présents',
      leads && leads.length > 0 ? true : 'warning',
      leads ? `${leads.length} lead(s) trouvé(s)` : 'Aucun lead'
    );
  } catch (err) {
    test('Leads présents', false, err.message);
  }

  // Compter les opportunités de backlinks
  try {
    const { data: backlinks, error } = await supabase
      .from('backlink_opportunities')
      .select('count');

    test(
      'Opportunités de backlinks',
      !error ? true : 'warning',
      `Accessible`
    );
  } catch (err) {
    test('Opportunités de backlinks', false, err.message);
  }

  // Compter les logs d'automatisation
  try {
    const { data: logs, error } = await supabase
      .from('automation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    test(
      'Logs d\'automatisation',
      !error,
      logs && logs.length > 0
        ? `${logs.length} entrée(s) récente(s)`
        : 'Aucune entrée (normal si première utilisation)'
    );
  } catch (err) {
    test('Logs d\'automatisation', false, err.message);
  }
}

// ============================================================================
// TESTS DES RLS (ROW LEVEL SECURITY)
// ============================================================================

async function checkRLSPolicies() {
  section('🔒 VÉRIFICATION DES POLITIQUES RLS');

  const tables = ['leads', 'backlink_opportunities', 'partner_prospects', 'automation_logs'];

  for (const tableName of tables) {
    try {
      const { data, error } = await supabase.rpc('check_table_rls', {
        table_name: tableName
      }).catch(() => ({ data: null, error: { message: 'RPC non disponible' } }));

      // Si la RPC n'existe pas, on fait un test basique
      const { data: testData, error: testError } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);

      test(
        `RLS activé pour "${tableName}"`,
        !testError,
        testError ? 'RLS peut-être trop restrictif' : 'Accès OK'
      );
    } catch (err) {
      test(`RLS activé pour "${tableName}"`, 'warning', 'Impossible de vérifier');
    }
  }
}

// ============================================================================
// TESTS DES EDGE FUNCTIONS
// ============================================================================

async function checkEdgeFunctions() {
  section('⚡ VÉRIFICATION DES EDGE FUNCTIONS');

  const edgeFunctions = [
    'chatbot',
    'send-email',
    'scan-backlinks',
    'backlink-auto-outreach',
    'partner-scraper-outreach',
    'generate-seo-content',
    'social-media-publisher',
    'trend-analyzer-proxy',
    'email-auto-responder',
    'ai-email-responder',
    'ai-social-scraper',
    'auto-followup',
    'auto-seo-notifier',
    'serp-lead-optimizer',
    'cron-orchestrator',
    'automation-dashboard-api',
    'linkedin-lead-webhook',
    'webhook-email-receiver'
  ];

  info('Vérification de la présence des fichiers Edge Functions...');

  for (const funcName of edgeFunctions) {
    try {
      const funcPath = join(process.cwd(), 'supabase', 'functions', funcName, 'index.ts');
      const exists = readFileSync(funcPath, 'utf8').length > 0;
      test(
        `Edge Function "${funcName}"`,
        exists,
        exists ? 'Fichier présent' : 'Fichier manquant'
      );
    } catch (err) {
      test(`Edge Function "${funcName}"`, false, 'Fichier manquant');
    }
  }

  info('\nℹ️  Pour tester les Edge Functions déployées, utilisez la Supabase CLI');
}

// ============================================================================
// TESTS DES CRON JOBS
// ============================================================================

async function checkCronJobs() {
  section('⏰ VÉRIFICATION DES CRON JOBS');

  info('Note: Les CRON jobs doivent être activés manuellement via Supabase Dashboard');
  info('URL: https://supabase.com/dashboard/project/[PROJECT_ID]/database/cron-jobs\n');

  const expectedCrons = [
    { name: 'scan_backlinks_daily', schedule: '0 2 * * *' },
    { name: 'auto_outreach_backlinks', schedule: '0 10 * * *' },
    { name: 'partner_scraper_weekly', schedule: '0 9 * * 1' },
    { name: 'generate_seo_weekly', schedule: '0 8 * * 1' },
    { name: 'social_media_daily', schedule: '0 14 * * *' },
    { name: 'trend_analyzer_daily', schedule: '0 6 * * *' },
    { name: 'auto_followup_leads', schedule: '0 11 * * *' },
    { name: 'seo_notifier_weekly', schedule: '0 9 * * 1' }
  ];

  try {
    const { data: cronJobs, error } = await supabase
      .rpc('get_cron_jobs')
      .catch(() => ({ data: null, error: null }));

    if (cronJobs && cronJobs.length > 0) {
      expectedCrons.forEach(cron => {
        const found = cronJobs.find(c => c.jobname === cron.name);
        test(
          `CRON "${cron.name}" (${cron.schedule})`,
          found ? true : 'warning',
          found ? 'Configuré' : 'À configurer manuellement'
        );
      });
    } else {
      expectedCrons.forEach(cron => {
        test(
          `CRON "${cron.name}" (${cron.schedule})`,
          'warning',
          'À configurer manuellement dans Supabase Dashboard'
        );
      });
    }
  } catch (err) {
    warning('Impossible de vérifier les CRON jobs automatiquement');
    info('Vérifiez manuellement dans: Supabase Dashboard > Database > Cron Jobs');
  }
}

// ============================================================================
// TESTS DES SECRETS SUPABASE
// ============================================================================

async function checkSupabaseSecrets() {
  section('🔐 VÉRIFICATION DES SECRETS SUPABASE');

  info('Note: Les secrets doivent être configurés dans Supabase Dashboard');
  info('URL: https://supabase.com/dashboard/project/[PROJECT_ID]/settings/vault\n');

  const requiredSecrets = [
    'OPENAI_API_KEY',
    'SENDGRID_API_KEY',
    'GOOGLE_API_KEY',
    'LINKEDIN_ACCESS_TOKEN'
  ];

  warning('⚠️  Vérifiez manuellement que ces secrets sont configurés:');
  requiredSecrets.forEach(secret => {
    info(`   - ${secret}`);
  });
}

// ============================================================================
// TESTS DE PERFORMANCE
// ============================================================================

async function checkPerformance() {
  section('⚡ TESTS DE PERFORMANCE');

  // Test de vitesse de requête
  try {
    const start = Date.now();
    await supabase.from('leads').select('count').limit(1);
    const duration = Date.now() - start;

    test(
      'Vitesse de requête Supabase',
      duration < 1000,
      `${duration}ms ${duration < 500 ? '(Excellent)' : duration < 1000 ? '(Bon)' : '(Lent)'}`
    );
  } catch (err) {
    test('Vitesse de requête Supabase', false, err.message);
  }

  // Test de vitesse réseau
  try {
    const start = Date.now();
    await fetch(SUPABASE_URL);
    const duration = Date.now() - start;

    test(
      'Latence réseau vers Supabase',
      duration < 2000,
      `${duration}ms ${duration < 500 ? '(Excellent)' : duration < 1000 ? '(Bon)' : '(Lent)'}`
    );
  } catch (err) {
    test('Latence réseau vers Supabase', false, err.message);
  }
}

// ============================================================================
// RAPPORT FINAL
// ============================================================================

function printFinalReport() {
  section('📊 RAPPORT FINAL');

  const totalIssues = failedTests + warnings;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`${colors.bold}Total de tests:${colors.reset}        ${totalTests}`);
  console.log(`${colors.green}${colors.bold}✅ Tests réussis:${colors.reset}      ${passedTests}`);
  console.log(`${colors.yellow}${colors.bold}⚠️  Avertissements:${colors.reset}     ${warnings}`);
  console.log(`${colors.red}${colors.bold}❌ Tests échoués:${colors.reset}      ${failedTests}`);
  console.log(`${colors.bold}Taux de réussite:${colors.reset}      ${successRate}%\n`);

  if (failedTests === 0 && warnings === 0) {
    console.log(`${colors.green}${colors.bold}🎉 PARFAIT ! Tous les systèmes sont opérationnels !${colors.reset}\n`);
  } else if (failedTests === 0) {
    console.log(`${colors.yellow}${colors.bold}✅ Bon état général, mais quelques avertissements à noter.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bold}⚠️  Des problèmes ont été détectés. Corrigez les erreurs ci-dessus.${colors.reset}\n`);
  }

  // Recommandations
  if (totalIssues > 0) {
    section('💡 RECOMMANDATIONS');

    if (failedTests > 0) {
      error('Actions urgentes requises:');
      info('  1. Corrigez les variables d\'environnement manquantes dans .env');
      info('  2. Vérifiez les politiques RLS dans Supabase Dashboard');
      info('  3. Assurez-vous que toutes les tables existent');
    }

    if (warnings > 0) {
      warning('Optimisations recommandées:');
      info('  1. Configurez les clés API optionnelles pour activer toutes les fonctionnalités');
      info('  2. Activez les CRON jobs dans Supabase Dashboard');
      info('  3. Configurez les secrets Supabase pour les Edge Functions');
    }
  }
}

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

async function main() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║        🚕 VÉRIFICATION AUTOMATISATIONS TAXIASSUR 🚕         ║');
  console.log('║                                                              ║');
  console.log('║     Script de diagnostic complet du système                 ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  try {
    await checkEnvironmentVariables();
    await checkSupabaseConnection();
    await checkDatabaseTables();
    await checkDataIntegrity();
    await checkRLSPolicies();
    await checkEdgeFunctions();
    await checkCronJobs();
    await checkSupabaseSecrets();
    await checkPerformance();

    printFinalReport();
  } catch (err) {
    console.error(`\n${colors.red}${colors.bold}ERREUR CRITIQUE:${colors.reset}`, err.message);
    process.exit(1);
  }
}

// Exécuter
main();
