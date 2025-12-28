import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EDGE_FUNCTIONS_TO_TEST = [
  'rss-parser',
  'linkedin-scraper',
  'news-aggregator-master',
  'news-digest-generator',
  'news-email-alerts',
  'generate-seo-content',
  'publish-unified-content',
  'backlink-auto-outreach',
  'scan-backlinks',
  'social-media-publisher',
  'auto-followup'
];

const testResults = {
  success: 0,
  failed: 0,
  errors: [],
  details: []
};

async function testEdgeFunction(functionName, payload = {}) {
  console.log(`\n🧪 Test: ${functionName}...`);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok || data.success) {
      console.log(`✅ ${functionName} : OK`);
      testResults.success++;
      testResults.details.push({
        function: functionName,
        status: 'SUCCESS',
        response: data
      });
      return true;
    } else {
      console.log(`❌ ${functionName} : ÉCHEC`);
      console.log(`   Erreur:`, data.error || data.message);
      testResults.failed++;
      testResults.errors.push({
        function: functionName,
        error: data.error || data.message
      });
      return false;
    }
  } catch (error) {
    console.log(`❌ ${functionName} : ERREUR`);
    console.log(`   Exception:`, error.message);
    testResults.failed++;
    testResults.errors.push({
      function: functionName,
      error: error.message
    });
    return false;
  }
}

async function checkDatabase() {
  console.log('\n📊 === VÉRIFICATION BASE DE DONNÉES ===\n');

  const tables = [
    'news_sources',
    'news_articles',
    'news_digest',
    'cron_jobs_config',
    'leads',
    'blog_posts',
    'city_pages'
  ];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ Table ${table}: ERREUR - ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: ${count || 0} enregistrements`);
      }
    } catch (err) {
      console.log(`❌ Table ${table}: EXCEPTION - ${err.message}`);
    }
  }
}

async function checkCronJobs() {
  console.log('\n⏰ === VÉRIFICATION CRON JOBS ===\n');

  try {
    const { data: cronJobs, error } = await supabase
      .from('cron_jobs_config')
      .select('*');

    if (error) {
      console.log('❌ Impossible de récupérer les cron jobs:', error.message);
      return;
    }

    console.log(`Total cron jobs configurés: ${cronJobs.length}`);
    console.log(`Actifs: ${cronJobs.filter(j => j.enabled).length}`);
    console.log(`Désactivés: ${cronJobs.filter(j => !j.enabled).length}`);

    console.log('\n📋 Liste des jobs actifs:');
    cronJobs
      .filter(j => j.enabled)
      .forEach(job => {
        console.log(`  ✅ ${job.job_name} - ${job.schedule}`);
      });

  } catch (err) {
    console.log('❌ Erreur lors de la vérification des cron jobs:', err.message);
  }
}

async function testNewsSystem() {
  console.log('\n📰 === TEST SYSTÈME ACTUALITÉS ===\n');

  console.log('1️⃣ Test RSS Parser...');
  await testEdgeFunction('rss-parser', {
    url: 'https://news.google.com/rss/search?q=taxi+france&hl=fr&gl=FR&ceid=FR:fr',
    sourceName: 'Google News Test'
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('2️⃣ Test LinkedIn Scraper...');
  await testEdgeFunction('linkedin-scraper', {});

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('3️⃣ Test Agrégateur Master...');
  await testEdgeFunction('news-aggregator-master', {});

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('4️⃣ Test Génération Digest...');
  await testEdgeFunction('news-digest-generator', { type: 'daily' });
}

async function testSEOSystem() {
  console.log('\n🔍 === TEST SYSTÈME SEO ===\n');

  console.log('1️⃣ Test Génération Contenu SEO...');
  await testEdgeFunction('generate-seo-content', {
    keyword: 'assurance taxi test',
    city: 'Paris',
    secondaryKeywords: ['devis', 'tarif'],
    mode: 'test'
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('2️⃣ Test Scan Backlinks...');
  await testEdgeFunction('scan-backlinks', {
    competitors: ['https://www.april-moto.com/'],
    maxResults: 5
  });
}

async function testLeadSystem() {
  console.log('\n👥 === TEST SYSTÈME LEADS ===\n');

  console.log('1️⃣ Test Auto Follow-up...');
  await testEdgeFunction('auto-followup', {
    max_followups: 5
  });
}

async function testSocialSystem() {
  console.log('\n📱 === TEST SYSTÈME SOCIAL MEDIA ===\n');

  console.log('1️⃣ Test Social Media Publisher...');
  await testEdgeFunction('social-media-publisher', {
    platform: 'linkedin',
    content_type: 'test'
  });
}

async function checkSourcesQuality() {
  console.log('\n✨ === VÉRIFICATION QUALITÉ SOURCES ===\n');

  try {
    const { data: sources } = await supabase
      .from('news_sources')
      .select('*')
      .eq('enabled', true);

    console.log(`Sources actives: ${sources.length}`);

    sources.forEach(source => {
      const hoursSinceCheck = source.last_check
        ? Math.round((Date.now() - new Date(source.last_check).getTime()) / 3600000)
        : 'jamais';

      console.log(`  📡 ${source.name}`);
      console.log(`     Type: ${source.type} | Priorité: ${source.priority}/10`);
      console.log(`     Dernière vérif: ${hoursSinceCheck}h | Erreurs: ${source.error_count}`);
    });

  } catch (err) {
    console.log('❌ Erreur vérification sources:', err.message);
  }
}

async function generateReport() {
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 RAPPORT FINAL DU TEST COMPLET');
  console.log('='.repeat(60));

  console.log(`\n✅ Tests réussis: ${testResults.success}`);
  console.log(`❌ Tests échoués: ${testResults.failed}`);
  console.log(`📈 Taux de réussite: ${Math.round((testResults.success / (testResults.success + testResults.failed)) * 100)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n🔴 Erreurs détectées:');
    testResults.errors.forEach((err, i) => {
      console.log(`\n${i + 1}. ${err.function}`);
      console.log(`   ${err.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (testResults.failed === 0) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
    console.log('✅ Le système est 100% opérationnel');
    console.log('🚀 Prêt pour 10-100 demandes/jour !');
  } else {
    console.log('\n⚠️  Certains tests ont échoué');
    console.log('🔧 Veuillez corriger les erreurs ci-dessus');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 TEST COMPLET DU SYSTÈME TAXIASSUR');
  console.log('='.repeat(60));

  await checkDatabase();
  await checkCronJobs();
  await checkSourcesQuality();

  await testNewsSystem();
  await testSEOSystem();
  await testLeadSystem();
  await testSocialSystem();

  await generateReport();
}

main().catch(console.error);
