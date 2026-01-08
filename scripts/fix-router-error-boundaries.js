#!/usr/bin/env node

/**
 * Script pour remplacer tous les ErrorBoundary incorrects par RouteErrorFallback
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const routerPath = path.join(projectRoot, 'src', 'router.tsx');

console.log('\n🔧 FIX ROUTER ERROR BOUNDARIES\n');
console.log('='.repeat(60));

let content = fs.readFileSync(routerPath, 'utf-8');

const originalContent = content;

// Pattern à remplacer: errorElement: <ErrorBoundary><Navigate to="..." replace /></ErrorBoundary>
const pattern = /errorElement:\s*<ErrorBoundary><Navigate\s+to="[^"]*"\s+replace\s*\/><\/ErrorBoundary>/g;

const matches = content.match(pattern);
const count = matches ? matches.length : 0;

console.log(`\n📊 Trouvé ${count} occurrences à remplacer\n`);

if (count > 0) {
  // Remplacement global
  content = content.replace(pattern, 'errorElement: <RouteErrorFallback />');

  // Écrire le fichier
  fs.writeFileSync(routerPath, content, 'utf-8');

  console.log('✅ Remplacement effectué avec succès!\n');
  console.log(`   ${count} occurrences remplacées`);
  console.log(`   De: errorElement: <ErrorBoundary><Navigate to="..." /></ErrorBoundary>`);
  console.log(`   À:  errorElement: <RouteErrorFallback />\n`);
} else {
  console.log('✅ Aucun remplacement nécessaire!\n');
}

console.log('='.repeat(60) + '\n');
