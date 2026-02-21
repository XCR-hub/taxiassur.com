#!/usr/bin/env node

/**
 * Script de vérification du build avant déploiement
 * Vérifie que tous les fichiers critiques sont présents
 *
 * Usage: node scripts/verify-build.js
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const distPath = join(projectRoot, 'dist');

console.log('🔍 Vérification du build...\n');

let hasErrors = false;

// Liste des fichiers critiques à vérifier
const criticalFiles = [
  {
    path: '.htaccess',
    required: true,
    description: 'Configuration Apache (routage React)',
    mustContain: ['RewriteRule', 'index.html']
  },
  {
    path: 'index.html',
    required: true,
    description: 'Point d\'entrée React',
    mustContain: ['<div id="root"']
  },
  {
    path: 'assets',
    required: true,
    isDirectory: true,
    description: 'Assets JS/CSS compilés'
  },
  {
    path: 'favicon.ico',
    required: false,
    description: 'Favicon'
  },
  {
    path: 'robots.txt',
    required: true,
    description: 'Robots SEO'
  },
  {
    path: 'sitemap.xml',
    required: true,
    description: 'Sitemap SEO'
  },
  {
    path: '_redirects',
    required: false,
    description: 'Redirections Netlify (optionnel)'
  }
];

// Vérification de chaque fichier
for (const file of criticalFiles) {
  const fullPath = join(distPath, file.path);
  const exists = existsSync(fullPath);

  if (!exists) {
    if (file.required) {
      console.error(`❌ ERREUR : ${file.path} est MANQUANT`);
      console.error(`   → ${file.description}`);
      hasErrors = true;
    } else {
      console.warn(`⚠️  ATTENTION : ${file.path} est manquant (optionnel)`);
      console.warn(`   → ${file.description}`);
    }
    continue;
  }

  // Vérifier si c'est un répertoire
  if (file.isDirectory) {
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      console.log(`✓ ${file.path}/ présent (dossier)`);
    } else {
      console.error(`❌ ERREUR : ${file.path} devrait être un dossier`);
      hasErrors = true;
    }
    continue;
  }

  // Vérifier le contenu si nécessaire
  if (file.mustContain && file.mustContain.length > 0) {
    const content = readFileSync(fullPath, 'utf-8');
    let contentOk = true;

    for (const needle of file.mustContain) {
      if (!content.includes(needle)) {
        console.error(`❌ ERREUR : ${file.path} ne contient pas "${needle}"`);
        hasErrors = true;
        contentOk = false;
      }
    }

    if (contentOk) {
      console.log(`✓ ${file.path} présent et valide`);
    }
  } else {
    console.log(`✓ ${file.path} présent`);
  }
}

// Vérifications supplémentaires
console.log('\n🔍 Vérifications supplémentaires...\n');

// Vérifier la taille du dossier assets
const assetsPath = join(distPath, 'assets');
if (existsSync(assetsPath)) {
  const { readdirSync } = await import('fs');
  const files = readdirSync(assetsPath);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));

  console.log(`✓ Assets: ${jsFiles.length} fichiers JS, ${cssFiles.length} fichiers CSS`);

  if (jsFiles.length === 0) {
    console.error('❌ ERREUR : Aucun fichier JS dans assets/');
    hasErrors = true;
  }

  if (cssFiles.length === 0) {
    console.error('❌ ERREUR : Aucun fichier CSS dans assets/');
    hasErrors = true;
  }
}

// Vérifier les permissions du .htaccess (si sur Unix)
if (process.platform !== 'win32') {
  const htaccessPath = join(distPath, '.htaccess');
  if (existsSync(htaccessPath)) {
    const stats = statSync(htaccessPath);
    const mode = (stats.mode & parseInt('777', 8)).toString(8);

    if (mode === '644' || mode === '664') {
      console.log(`✓ Permissions .htaccess: ${mode} (OK)`);
    } else {
      console.warn(`⚠️  ATTENTION : Permissions .htaccess: ${mode} (recommandé: 644)`);
    }
  }
}

// Résumé final
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.error('\n❌ BUILD INVALIDE : Des erreurs ont été détectées');
  console.error('   → Corrigez les erreurs ci-dessus avant de déployer\n');
  process.exit(1);
} else {
  console.log('\n✅ BUILD VALIDE : Tous les fichiers critiques sont présents');
  console.log('   → Le build est prêt pour le déploiement\n');

  // Afficher des instructions de déploiement
  console.log('📦 Prochaines étapes:');
  console.log('   1. Upload le contenu de dist/ vers votre serveur');
  console.log('   2. Vérifiez que .htaccess est bien uploadé (fichier caché)');
  console.log('   3. Testez les URLs principales après déploiement\n');

  process.exit(0);
}
