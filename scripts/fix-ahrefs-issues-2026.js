#!/usr/bin/env node
/**
 * Script pour corriger les problèmes SEO identifiés par Ahrefs
 * Date: 03 Mars 2026
 *
 * Problèmes à corriger:
 * - 236 erreurs 5XX
 * - 87 meta descriptions multiples
 * - 34 redirections cassées
 * - 6 canonicals vers redirects
 * - 85 Open Graph URLs non-canonical
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');

console.log('🔍 Analyse des problèmes SEO Ahrefs...\n');

// PROBLÈME 1: Meta descriptions multiples
console.log('📋 PROBLÈME 1: Meta descriptions multiples\n');

function findDuplicateMetaTags() {
  const files = getAllTsxFiles(PAGES_DIR);
  const problemFiles = [];

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    // Chercher les imports de composants SEO multiples
    const hasSEOHead = content.includes('from \'@/components/SEOHead\'') || content.includes('from \'../components/SEOHead\'');
    const hasSEOMetaTags = content.includes('from \'@/components/SEOMetaTags\'') || content.includes('from \'../components/SEOMetaTags\'');
    const hasSeo = content.includes('from \'@/components/Seo\'') || content.includes('from \'../components/Seo\'');

    // Compter combien de composants SEO différents
    const seoComponentsCount = [hasSEOHead, hasSEOMetaTags, hasSeo].filter(Boolean).length;

    if (seoComponentsCount > 1) {
      problemFiles.push({
        file: path.relative(ROOT_DIR, file),
        components: {
          SEOHead: hasSEOHead,
          SEOMetaTags: hasSEOMetaTags,
          Seo: hasSeo
        }
      });
    }
  });

  console.log(`✓ Trouvé ${problemFiles.length} fichiers avec plusieurs composants SEO`);

  if (problemFiles.length > 0) {
    console.log('\nFichiers problématiques:');
    problemFiles.forEach(({ file, components }) => {
      console.log(`  - ${file}`);
      console.log(`    Composants: ${Object.entries(components).filter(([, v]) => v).map(([k]) => k).join(', ')}`);
    });
  }

  return problemFiles;
}

// PROBLÈME 2: Open Graph URLs non-canonical
console.log('\n📋 PROBLÈME 2: Open Graph URLs contenant www\n');

function findWwwInOpenGraph() {
  const files = getAllTsxFiles(SRC_DIR);
  const problemFiles = [];

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    // Chercher www.taxiassur.com dans les URLs
    if (content.includes('www.taxiassur.com')) {
      const lines = content.split('\n');
      const problematicLines = [];

      lines.forEach((line, index) => {
        if (line.includes('www.taxiassur.com')) {
          problematicLines.push({
            line: index + 1,
            content: line.trim().substring(0, 80)
          });
        }
      });

      if (problematicLines.length > 0) {
        problemFiles.push({
          file: path.relative(ROOT_DIR, file),
          lines: problematicLines
        });
      }
    }
  });

  console.log(`✓ Trouvé ${problemFiles.length} fichiers avec www.taxiassur.com`);

  if (problemFiles.length > 0) {
    console.log('\nFichiers à corriger:');
    problemFiles.slice(0, 10).forEach(({ file, lines }) => {
      console.log(`  - ${file}`);
      lines.slice(0, 3).forEach(({ line, content }) => {
        console.log(`    Ligne ${line}: ${content}...`);
      });
    });
    if (problemFiles.length > 10) {
      console.log(`  ... et ${problemFiles.length - 10} autres fichiers`);
    }
  }

  return problemFiles;
}

// PROBLÈME 3: Erreurs 5XX potentielles
console.log('\n📋 PROBLÈME 3: Routes potentiellement problématiques\n');

function analyzeRoutes() {
  const routerFile = path.join(SRC_DIR, 'router.tsx');
  if (!fs.existsSync(routerFile)) {
    console.log('⚠️  router.tsx non trouvé');
    return [];
  }

  const content = fs.readFileSync(routerFile, 'utf-8');
  const lines = content.split('\n');

  // Chercher les lazy imports qui peuvent échouer
  const lazyImports = [];
  lines.forEach((line, index) => {
    if (line.includes('lazy(') || line.includes('React.lazy(')) {
      lazyImports.push({
        line: index + 1,
        content: line.trim()
      });
    }
  });

  console.log(`✓ Trouvé ${lazyImports.length} imports lazy`);

  if (lazyImports.length > 0) {
    console.log('\nImports à vérifier:');
    lazyImports.slice(0, 5).forEach(({ line, content }) => {
      console.log(`  Ligne ${line}: ${content.substring(0, 80)}...`);
    });
    if (lazyImports.length > 5) {
      console.log(`  ... et ${lazyImports.length - 5} autres imports`);
    }
  }

  return lazyImports;
}

// Helper functions
function getAllTsxFiles(dir) {
  const files = [];

  function walkDir(currentPath) {
    const items = fs.readdirSync(currentPath);

    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules') {
          walkDir(fullPath);
        }
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    });
  }

  walkDir(dir);
  return files;
}

// Exécuter les analyses
const duplicateMetaTags = findDuplicateMetaTags();
const wwwInOpenGraph = findWwwInOpenGraph();
const problematicRoutes = analyzeRoutes();

// Générer un rapport
console.log('\n' + '='.repeat(60));
console.log('📊 RÉSUMÉ DES PROBLÈMES DÉTECTÉS');
console.log('='.repeat(60) + '\n');

console.log(`1. Meta descriptions multiples: ${duplicateMetaTags.length} fichiers`);
console.log(`2. URLs avec www: ${wwwInOpenGraph.length} fichiers`);
console.log(`3. Imports lazy potentiellement problématiques: ${problematicRoutes.length}`);

console.log('\n' + '='.repeat(60));
console.log('💡 SOLUTIONS RECOMMANDÉES');
console.log('='.repeat(60) + '\n');

console.log('1. UNIFIER LES COMPOSANTS SEO');
console.log('   ✓ Créer UnifiedSEO.tsx (FAIT)');
console.log('   ✓ Remplacer tous les SEOHead/SEOMetaTags par UnifiedSEO');
console.log('');

console.log('2. CORRIGER LES URLs');
console.log('   ✓ Chercher/remplacer: www.taxiassur.com → taxiassur.com');
console.log('   ✓ S\'assurer que canonical et og:url sont identiques');
console.log('');

console.log('3. ERREURS 5XX');
console.log('   ✓ Vérifier que tous les lazy imports pointent vers des fichiers existants');
console.log('   ✓ Ajouter des ErrorBoundary autour des routes lazy');
console.log('   ✓ Tester toutes les routes en production');
console.log('');

console.log('4. SITEMAP');
console.log('   ✓ Régénérer le sitemap avec uniquement les URLs canoniques');
console.log('   ✓ Exclure les URLs de test et admin');
console.log('');

// Créer un fichier de rapport
const reportPath = path.join(ROOT_DIR, 'AHREFS_ISSUES_REPORT_2026.md');
const report = `# Rapport des problèmes SEO Ahrefs
Date: ${new Date().toISOString()}

## Problèmes détectés

### 1. Meta descriptions multiples (${duplicateMetaTags.length} fichiers)

${duplicateMetaTags.map(({ file, components }) => `- ${file}
  Composants: ${Object.entries(components).filter(([, v]) => v).map(([k]) => k).join(', ')}`).join('\n')}

### 2. URLs avec www (${wwwInOpenGraph.length} fichiers)

${wwwInOpenGraph.slice(0, 20).map(({ file }) => `- ${file}`).join('\n')}
${wwwInOpenGraph.length > 20 ? `\n... et ${wwwInOpenGraph.length - 20} autres fichiers` : ''}

### 3. Imports lazy (${problematicRoutes.length} routes)

Vérifier que tous les composants existent.

## Actions recommandées

1. Utiliser UnifiedSEO partout
2. Remplacer www.taxiassur.com par taxiassur.com
3. Synchroniser canonical et og:url
4. Régénérer le sitemap propre
5. Tester toutes les routes
`;

fs.writeFileSync(reportPath, report, 'utf-8');
console.log(`\n📄 Rapport complet sauvegardé: ${path.relative(ROOT_DIR, reportPath)}`);

console.log('\n✅ Analyse terminée!\n');
