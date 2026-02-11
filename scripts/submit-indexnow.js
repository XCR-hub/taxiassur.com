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
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'e2f4b8a1c9d3e5f7g8h9i0j1k2l3m4n5';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function submitToIndexNow(urls) {
  console.log(`\n🚀 Soumission de ${urls.length} URLs à IndexNow...\n`);

  // IndexNow accepte maximum 10 000 URLs par requête
  const BATCH_SIZE = 100;
  const batches = [];

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    batches.push(urls.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 ${batches.length} lots de ${BATCH_SIZE} URLs max\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📤 Lot ${i + 1}/${batches.length}: ${batch.length} URLs...`);

    try {
      // Soumettre à Bing via IndexNow
      const response = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          host: 'taxiassur.com',
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/indexnow-key.txt`,
          urlList: batch,
        }),
      });

      if (response.ok || response.status === 202) {
        console.log(`   ✅ Soumis avec succès (${response.status})`);
        successCount += batch.length;
      } else {
        const errorText = await response.text();
        console.log(`   ⚠️  Erreur ${response.status}: ${errorText}`);
        errorCount += batch.length;
      }

      // Attendre un peu entre les lots pour ne pas surcharger
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.log(`   ❌ Erreur réseau: ${error.message}`);
      errorCount += batch.length;
    }
  }

  console.log('\n📊 Résumé:');
  console.log(`   ✅ Succès: ${successCount} URLs`);
  console.log(`   ❌ Erreurs: ${errorCount} URLs`);

  // Enregistrer dans la base de données
  try {
    await supabase.from('seo_indexation_tracking').insert({
      submitted_count: successCount,
      failed_count: errorCount,
      submitted_at: new Date().toISOString(),
      provider: 'indexnow',
    });
  } catch (error) {
    console.log('⚠️  Impossible d\'enregistrer dans la base:', error.message);
  }

  return { successCount, errorCount };
}

async function getUrlsToSubmit() {
  console.log('📋 Récupération des URLs à soumettre...\n');

  const urls = [];

  // Pages statiques importantes
  const priorityPages = [
    '/',
    '/assurance-taxi',
    '/assurance-moto-taxi',
    '/prix-assurance-taxi',
    '/contact',
    '/blog',
    '/faq',
  ];

  for (const page of priorityPages) {
    urls.push(`${SITE_URL}${page}`);
  }

  // Pages de blog récentes
  try {
    const blogFiles = fs.readdirSync(path.join(__dirname, '../public/content/blog'));
    const blogSlugs = blogFiles
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .slice(0, 50); // Limiter aux 50 plus récents

    for (const slug of blogSlugs) {
      urls.push(`${SITE_URL}/blog/${slug}`);
    }
  } catch (error) {
    console.log('⚠️  Erreur lecture blog:', error.message);
  }

  // Actualités récentes
  try {
    const { data: news } = await supabase
      .from('news')
      .select('slug')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);

    if (news) {
      for (const article of news) {
        urls.push(`${SITE_URL}/actualites/${article.slug}`);
      }
    }
  } catch (error) {
    console.log('⚠️  Erreur récupération actualités:', error.message);
  }

  console.log(`✅ ${urls.length} URLs à soumettre\n`);

  return urls;
}

// Créer le fichier de clé IndexNow si il n'existe pas
function ensureIndexNowKey() {
  const keyPath = path.join(__dirname, '../public/indexnow-key.txt');

  if (!fs.existsSync(keyPath)) {
    console.log('🔑 Création du fichier indexnow-key.txt...');
    fs.writeFileSync(keyPath, INDEXNOW_KEY);
    console.log('✅ Clé IndexNow créée\n');
  } else {
    console.log('✅ Clé IndexNow déjà présente\n');
  }
}

// Exécuter
async function main() {
  console.log('🔍 IndexNow Submission Tool\n');
  console.log('═'.repeat(50));

  ensureIndexNowKey();

  const urls = await getUrlsToSubmit();

  if (urls.length === 0) {
    console.log('⚠️  Aucune URL à soumettre');
    return;
  }

  await submitToIndexNow(urls);

  console.log('\n✅ Processus terminé!');
  console.log('\n💡 Astuce: Les URLs seront indexées par Bing et d\'autres moteurs');
  console.log('    supportant IndexNow dans les prochaines heures.\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
