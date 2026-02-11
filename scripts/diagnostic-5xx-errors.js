import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Diagnostic des Erreurs 5XX Potentielles\n');
console.log('══════════════════════════════════════════════════\n');

const issues = [];
const warnings = [];

// 1. Vérifier le fichier de routing
console.log('📋 1. Analyse du fichier de routing...');
const routerPath = path.join(__dirname, '../src/router.tsx');
if (!fs.existsSync(routerPath)) {
  issues.push('❌ Fichier router.tsx manquant');
} else {
  const routerContent = fs.readFileSync(routerPath, 'utf-8');
  console.log('   ✅ Fichier router.tsx trouvé');

  // Vérifier les imports dynamiques
  const lazyImports = routerContent.match(/lazy\(\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/g);
  if (lazyImports) {
    console.log(`   📦 ${lazyImports.length} imports lazy détectés`);

    for (const lazyImport of lazyImports) {
      const pathMatch = lazyImport.match(/import\(['"]([^'"]+)['"]\)/);
      if (pathMatch) {
        const importPath = pathMatch[1];
        const fullPath = path.join(__dirname, '../src', importPath.replace(/^\.\.\//, ''));

        // Vérifier si le fichier existe
        const possibleExtensions = ['', '.tsx', '.ts', '.jsx', '.js'];
        let found = false;

        for (const ext of possibleExtensions) {
          if (fs.existsSync(fullPath + ext)) {
            found = true;
            break;
          }
        }

        if (!found) {
          issues.push(`❌ Composant manquant: ${importPath}`);
        }
      }
    }
  }
}

// 2. Vérifier les pages
console.log('\n📄 2. Analyse des fichiers de pages...');
const pagesDir = path.join(__dirname, '../src/pages');
if (!fs.existsSync(pagesDir)) {
  issues.push('❌ Dossier pages/ manquant');
} else {
  const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
  console.log(`   ✅ ${pageFiles.length} fichiers de pages trouvés`);

  // Vérifier chaque page pour les imports manquants
  for (const pageFile of pageFiles) {
    const pagePath = path.join(pagesDir, pageFile);
    const content = fs.readFileSync(pagePath, 'utf-8');

    // Vérifier les imports relatifs
    const imports = content.match(/from ['"]\.\.\/[^'"]+['"]/g);
    if (imports) {
      for (const imp of imports) {
        const importPath = imp.match(/from ['"]([^'"]+)['"]/)[1];
        const fullPath = path.join(pagesDir, importPath);

        const possibleExtensions = ['', '.tsx', '.ts', '.jsx', '.js'];
        let found = false;

        for (const ext of possibleExtensions) {
          if (fs.existsSync(fullPath + ext)) {
            found = true;
            break;
          }
        }

        if (!found) {
          warnings.push(`⚠️  Import potentiellement manquant dans ${pageFile}: ${importPath}`);
        }
      }
    }
  }
}

// 3. Vérifier les composants
console.log('\n🧩 3. Analyse des composants...');
const componentsDir = path.join(__dirname, '../src/components');
if (!fs.existsSync(componentsDir)) {
  issues.push('❌ Dossier components/ manquant');
} else {
  const componentFiles = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));
  console.log(`   ✅ ${componentFiles.length} fichiers de composants trouvés`);
}

// 4. Vérifier les routes dynamiques
console.log('\n🔀 4. Analyse des routes dynamiques...');
const routerContent = fs.readFileSync(routerPath, 'utf-8');

// Chercher les routes avec paramètres
const paramRoutes = routerContent.match(/path:\s*['"]([^'"]*:[^'"]*)['"]/g);
if (paramRoutes) {
  console.log(`   📍 ${paramRoutes.length} routes avec paramètres détectées`);
  paramRoutes.forEach(route => {
    const path = route.match(/path:\s*['"](.[^'"]*)['"]/)[1];
    console.log(`      - ${path}`);
  });
}

// 5. Vérifier la configuration Vite
console.log('\n⚙️  5. Vérification de la configuration Vite...');
const viteConfigPath = path.join(__dirname, '../vite.config.ts');
if (!fs.existsSync(viteConfigPath)) {
  issues.push('❌ Fichier vite.config.ts manquant');
} else {
  console.log('   ✅ Fichier vite.config.ts trouvé');
}

// 6. Analyser les erreurs potentielles dans le code
console.log('\n🐛 6. Recherche d\'erreurs potentielles...');
const srcDir = path.join(__dirname, '../src');

function scanForErrors(dir, depth = 0) {
  if (depth > 3) return; // Limiter la profondeur

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      scanForErrors(fullPath, depth + 1);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Vérifier les erreurs communes
      if (content.includes('undefined') && content.includes('.map')) {
        warnings.push(`⚠️  Potentiel undefined.map() dans ${fullPath.replace(srcDir, 'src')}`);
      }

      if (content.match(/useEffect\([^,]+\)/)) {
        // useEffect sans tableau de dépendances
        warnings.push(`⚠️  useEffect sans dépendances dans ${fullPath.replace(srcDir, 'src')}`);
      }
    }
  }
}

scanForErrors(srcDir);

// Résumé
console.log('\n\n📊 RÉSUMÉ DU DIAGNOSTIC');
console.log('══════════════════════════════════════════════════\n');

if (issues.length === 0) {
  console.log('✅ Aucun problème critique détecté\n');
} else {
  console.log(`❌ ${issues.length} problème(s) critique(s) détecté(s):\n`);
  issues.forEach(issue => console.log(`   ${issue}`));
  console.log('');
}

if (warnings.length === 0) {
  console.log('✅ Aucun avertissement\n');
} else {
  console.log(`⚠️  ${warnings.length} avertissement(s):\n`);
  warnings.slice(0, 10).forEach(warning => console.log(`   ${warning}`));
  if (warnings.length > 10) {
    console.log(`   ... et ${warnings.length - 10} autres avertissements\n`);
  }
  console.log('');
}

// Recommandations
console.log('\n💡 RECOMMANDATIONS\n');
console.log('1. Vérifier que toutes les routes dans router.tsx pointent vers des composants existants');
console.log('2. S\'assurer que tous les imports sont corrects');
console.log('3. Tester localement avec `npm run dev`');
console.log('4. Vérifier les logs du serveur pour les erreurs 5XX réelles');
console.log('5. Utiliser le mode production `npm run build && npm run preview`\n');

console.log('🎯 ACTIONS PRIORITAIRES\n');
if (issues.length > 0) {
  console.log('1. Corriger les problèmes critiques listés ci-dessus');
  console.log('2. Re-tester après chaque correction');
} else {
  console.log('1. Les erreurs 5XX peuvent provenir du serveur de production');
  console.log('2. Vérifier les logs du serveur IONOS');
  console.log('3. Vérifier la configuration .htaccess');
  console.log('4. Vérifier les requêtes API Supabase');
}

console.log('\n✅ Diagnostic terminé!\n');
