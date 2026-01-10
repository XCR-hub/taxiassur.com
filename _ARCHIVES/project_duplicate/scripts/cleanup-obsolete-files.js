import fs from 'fs';
import path from 'path';

console.log('🧹 Nettoyage fichiers obsolètes...\n');

const filesToDelete = [
  // Images en double (copies inutiles)
  'public/image copy.png',
  'public/image copy copy.png',
  'public/image copy copy copy.png',
  'public/image copy copy copy copy.png',
  'public/image copy copy copy copy copy.png',
  'public/image copy copy copy copy copy copy.png',
  'public/image copy copy copy copy copy copy copy.png',
  'public/image copy copy copy copy copy copy copy copy.png',
  'public/image copy copy copy copy copy copy copy copy copy.png',

  // Fichiers MD obsolètes dans public/
  'public/API-SETUP-GUIDE.md',
  'public/BACKOFFICE-README.md',
  'public/CONFIGURATION-OPENAI-KEY.md',
  'public/CORRECTIONS-ERREURS-CONSOLE.md',
  'public/DEPLOIEMENT-FINAL-PRET.md',
  'public/DIAGNOSTIC-OPENAI.md',
  'public/MENU-COMPLET-BACKOFFICE.md',

  // Fichiers PHP de debug (ne servent plus)
  'public/debug.php',
  'public/debug-email.php',
  'public/test-client-email.php',
  'public/test-config-email.php',
  'public/test-debug-complet.php',
  'public/test-email-ionos.php',
  'public/test-email.php',
  'public/test-final-ionos.php',
  'public/test-final.php',
  'public/test-ionos-simple.php',
  'public/test-server.php',
  'public/test-simple.php',
  'public/test-webhook-debug.php',
  'public/server-check.php',

  // Fichiers HTML de backup
  'public/index-backup.html',
  'public/index-ionos.html',
  'public/deploy-guide.html',
  'public/test-webhook.html',

  // Fichiers .htaccess backup
  'public/.htaccess-backup',
  'public/.htaccess-email-config',
  'public/.htaccess-ionos-safe',
  'public/.htaccess-minimal',

  // Config PHP obsolètes
  'public/config-api-keys.php',
  'public/config-email.php',
  'public/test-cse.html'
];

let deletedCount = 0;
let totalSize = 0;

for (const file of filesToDelete) {
  try {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      totalSize += stats.size;
      fs.unlinkSync(file);
      console.log(`✅ Supprimé: ${file}`);
      deletedCount++;
    }
  } catch (error) {
    console.log(`⚠️  Impossible de supprimer ${file}: ${error.message}`);
  }
}

console.log('\n' + '═'.repeat(70));
console.log(`✅ Nettoyage terminé !`);
console.log(`📁 ${deletedCount} fichiers supprimés`);
console.log(`💾 ${Math.round(totalSize / 1024)} KB libérés`);
console.log('═'.repeat(70) + '\n');

// Garder seulement les fichiers essentiels
console.log('📋 Fichiers conservés dans public/:');
console.log('   ✅ index.html (page d\'accueil)');
console.log('   ✅ index.php (webhook handler)');
console.log('   ✅ merci.html (page confirmation)');
console.log('   ✅ .htaccess (config serveur)');
console.log('   ✅ logo-600x300.png (logo principal)');
console.log('   ✅ image.png (image principale)');
console.log('   ✅ env-config.js (config variables)');
console.log('   ✅ sitemap.xml (SEO)');
console.log('   ✅ robots.txt (SEO)');
console.log('   ✅ manifest.json (PWA)');
console.log('   ✅ favicon.ico');
console.log('\n🎯 Project maintenant optimisé et allégé !\n');
