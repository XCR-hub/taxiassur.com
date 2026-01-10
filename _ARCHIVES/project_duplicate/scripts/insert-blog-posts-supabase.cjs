#!/usr/bin/env node
/**
 * Script pour insérer tous les articles blog dans Supabase
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Config Supabase (depuis .env)
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes dans .env');
  console.error('Requises: VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const blogDir = path.join(__dirname, '../public/content/blog');

async function insertBlogPosts() {
  const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.json') && f !== 'index-0.json');

  console.log(`\n📝 ${files.length} articles trouvés\n`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const filePath = path.join(blogDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const article = JSON.parse(content);

      // Normaliser les données
      const post = {
        id: article.id || article.slug || file.replace('.json', ''),
        slug: article.slug || article.id || file.replace('.json', ''),
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        cover_image: article.coverImage || article.image || null,
        author: article.author || 'TaxiAssur',
        tags: article.tags || [],
        faq: article.faq || [],
        published: article.status === 'published' || article.published !== false,
        created_at: article.createdAt || article.date || new Date().toISOString(),
        updated_at: article.updatedAt || article.date || new Date().toISOString()
      };

      // Upsert (insert ou update)
      const { data, error } = await supabase
        .from('blog_posts')
        .upsert(post, {
          onConflict: 'slug',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error(`❌ ${file}: ${error.message}`);
        errors++;
      } else {
        if (data && data.length > 0) {
          console.log(`✅ ${file} → ${post.slug}`);
          inserted++;
        } else {
          console.log(`♻️  ${file} → ${post.slug} (mis à jour)`);
          updated++;
        }
      }

    } catch (err) {
      console.error(`❌ ${file}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Insérés/Mis à jour: ${inserted + updated}`);
  console.log(`❌ Erreurs: ${errors}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Vérification finale
  const { count } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total articles dans Supabase: ${count}\n`);
}

// Exécution
insertBlogPosts()
  .then(() => {
    console.log('✅ Import terminé !');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
