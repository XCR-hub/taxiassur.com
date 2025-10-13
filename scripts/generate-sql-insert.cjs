#!/usr/bin/env node
/**
 * Génère un fichier SQL avec TOUS les articles blog
 */

const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, '../public/content/blog');

function escapeSql(str) {
  if (!str) return 'NULL';
  return "'" + str.replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

function generateSql() {
  const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.json') && f !== 'index-0.json');

  console.log(`-- ============================================`);
  console.log(`-- INSERTION DE ${files.length} ARTICLES BLOG`);
  console.log(`-- Généré: ${new Date().toISOString()}`);
  console.log(`-- ============================================\n`);

  console.log(`-- Désactiver RLS temporairement`);
  console.log(`ALTER TABLE blog_posts DISABLE ROW LEVEL SECURITY;\n`);

  console.log(`-- Insérer les articles`);
  console.log(`INSERT INTO blog_posts (id, slug, title, excerpt, content, cover_image, author, tags, faq, published, created_at, updated_at)`);
  console.log(`VALUES`);

  const values = [];

  files.forEach((file, index) => {
    try {
      const filePath = path.join(blogDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const article = JSON.parse(content);

      const id = article.id || article.slug || file.replace('.json', '');
      const slug = article.slug || article.id || file.replace('.json', '');
      const title = escapeSql(article.title);
      const excerpt = escapeSql(article.excerpt);
      const contentText = escapeSql(article.content);
      const coverImage = escapeSql(article.coverImage || article.image || null);
      const author = escapeSql(article.author || 'TaxiAssur');

      // Tags en array PostgreSQL
      const tags = article.tags && article.tags.length > 0
        ? `ARRAY[${article.tags.map(t => escapeSql(t)).join(', ')}]`
        : 'ARRAY[]::text[]';

      // FAQ en JSONB
      const faq = article.faq && article.faq.length > 0
        ? escapeSql(JSON.stringify(article.faq)) + '::jsonb'
        : "'[]'::jsonb";

      const published = article.status === 'published' || article.published !== false ? 'true' : 'false';
      const createdAt = article.createdAt || article.date || new Date().toISOString();
      const updatedAt = article.updatedAt || article.date || new Date().toISOString();

      const value = `(${escapeSql(id)}, ${escapeSql(slug)}, ${title}, ${excerpt}, ${contentText}, ${coverImage}, ${author}, ${tags}, ${faq}, ${published}, '${createdAt}', '${updatedAt}')`;

      values.push(value);

    } catch (err) {
      console.error(`-- ❌ Erreur ${file}: ${err.message}`);
    }
  });

  console.log(values.join(',\n\n'));

  console.log(`\nON CONFLICT (slug)`);
  console.log(`DO UPDATE SET`);
  console.log(`  title = EXCLUDED.title,`);
  console.log(`  excerpt = EXCLUDED.excerpt,`);
  console.log(`  content = EXCLUDED.content,`);
  console.log(`  cover_image = EXCLUDED.cover_image,`);
  console.log(`  tags = EXCLUDED.tags,`);
  console.log(`  faq = EXCLUDED.faq,`);
  console.log(`  updated_at = NOW();\n`);

  console.log(`-- Réactiver RLS`);
  console.log(`ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;\n`);

  console.log(`-- Vérification`);
  console.log(`SELECT COUNT(*) as total_articles FROM blog_posts;`);
  console.log(`SELECT COUNT(*) as publies FROM blog_posts WHERE published = true;`);
  console.log(`\nSELECT id, title, jsonb_array_length(faq) as nb_faq`);
  console.log(`FROM blog_posts`);
  console.log(`WHERE published = true`);
  console.log(`ORDER BY created_at DESC`);
  console.log(`LIMIT 10;`);
}

generateSql();
