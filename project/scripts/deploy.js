#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// Fonction pour copier récursivement (compatible Windows + IONOS)
function copyRecursive(src, dest) {
  try {
    if (!fs.existsSync(src)) return false;
    
    fs.mkdirSync(dest, { recursive: true });
    
    const items = fs.readdirSync(src);
    items.forEach(item => {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.statSync(srcPath).isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
    
    return true;
  } catch (error) {
    console.error(`Erreur copie ${src} → ${dest}:`, error.message);
    return false;
  }
}

console.log('🚀 Déploiement TaxiAssur.com pour IONOS');
console.log('==========================================');

// 1. Build du projet
console.log('📦 Build du projet...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Erreur lors du build');
  process.exit(1);
}

// 2. Vérification du build
if (!fs.existsSync('dist')) {
  console.error('❌ Erreur: Le dossier dist n\'existe pas');
  process.exit(1);
}

console.log('✅ Build réussi !');

// 3. Création de la structure IONOS optimisée
console.log('📁 Création de la structure IONOS...');

// Créer tous les dossiers nécessaires
const directories = [
  'dist/api',
  'dist/content/blog',
  'dist/content/faq', 
  'dist/content/reviews',
  'dist/content/offers',
  'dist/content/leads',
  'dist/feeds',
  'dist/assets',
  'dist/logs',
  'dist/webhooks'
];

directories.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`✓ ${dir} créé`);
});

// 4. Copie des fichiers PHP critiques
console.log('🔗 Copie des fichiers PHP...');

// Copier TOUS les fichiers PHP de l'API
if (fs.existsSync('public/api')) {
  const apiFiles = fs.readdirSync('public/api');
  let copiedCount = 0;
  apiFiles.forEach(file => {
    if (file.endsWith('.php')) {
      fs.copyFileSync(`public/api/${file}`, `dist/api/${file}`);
      copiedCount++;
    }
  });
  console.log(`✓ ${copiedCount} fichiers API copiés`);
} else {
  console.log('⚠️  Dossier public/api/ manquant');
}

// Copier les webhooks
if (fs.existsSync('webhooks')) {
  const webhookFiles = fs.readdirSync('webhooks');
  webhookFiles.forEach(file => {
    if (file.endsWith('.php')) {
      fs.copyFileSync(`webhooks/${file}`, `dist/webhooks/${file}`);
      console.log(`✓ webhooks/${file} → dist/webhooks/${file}`);
    }
  });
}

// Copier depuis public/webhooks si existe
if (fs.existsSync('public/webhooks')) {
  const webhookFiles = fs.readdirSync('public/webhooks');
  webhookFiles.forEach(file => {
    if (file.endsWith('.php')) {
      fs.copyFileSync(`public/webhooks/${file}`, `dist/webhooks/${file}`);
      console.log(`✓ public/webhooks/${file} → dist/webhooks/${file}`);
    }
  });
}

// 5. Copie des fichiers de configuration IONOS
console.log('⚙️ Configuration IONOS...');
const configFiles = [
  { src: 'public/.htaccess', dest: 'dist/.htaccess' },
  { src: 'public/config.php', dest: 'dist/config.php' },
  { src: 'public/env-config.js', dest: 'dist/env-config.js' },
  { src: 'public/server-check.php', dest: 'dist/server-check.php' },
  { src: 'public/test-simple.php', dest: 'dist/test-simple.php' },
  { src: 'public/test-final.php', dest: 'dist/test-final.php' },
  { src: 'public/debug.php', dest: 'dist/debug.php' },
  { src: 'public/test-server.php', dest: 'dist/test-server.php' },
  { src: 'public/test-webhook.html', dest: 'dist/test-webhook.html' },
  { src: 'public/deploy-guide.html', dest: 'dist/deploy-guide.html' },
  { src: 'public/robots.txt', dest: 'dist/robots.txt' },
  { src: 'public/sitemap.xml', dest: 'dist/sitemap.xml' },
  { src: 'public/manifest.json', dest: 'dist/manifest.json' }
];

configFiles.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ ${src} → ${dest}`);
  } else {
    console.log(`⚠️  ${src} non trouvé`);
  }
});

// 6. Copie du contenu JSON
console.log('📄 Copie du contenu JSON...');

// Copier les fichiers de contenu individuels
const contentTypes = ['blog', 'faq', 'reviews', 'offers'];
contentTypes.forEach(type => {
  const srcDir = `public/content/${type}`;
  const destDir = `dist/content/${type}`;
  
  if (fs.existsSync(srcDir)) {
    const success = copyRecursive(srcDir, destDir);
    console.log(`${success ? '✓' : '❌'} Contenu ${type} ${success ? 'copié' : 'erreur'}`);
  } else {
    console.log(`⚠️  Dossier ${srcDir} non trouvé`);
  }
});

// Copier les fichiers JSON racine
const rootJsonFiles = [
  'public/content/backlinks.json',
  'public/content/partners.json',
  'public/content/popups.json',
  'public/content/suppressions.json'
];

rootJsonFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const destFile = file.replace('public/', 'dist/');
    fs.copyFileSync(file, destFile);
    console.log(`✓ ${file} → ${destFile}`);
  } else {
    // Créer un fichier vide si manquant
    const destFile = file.replace('public/', 'dist/');
    const emptyContent = file.includes('suppressions') ? '{}' : '[]';
    fs.writeFileSync(destFile, emptyContent);
    console.log(`✓ ${destFile} créé (vide)`);
  }
});

// 7. Copie des feeds
console.log('📡 Copie des feeds...');
if (fs.existsSync('public/feeds')) {
  copyRecursive('public/feeds', 'dist/feeds');
  console.log('✓ Feeds copiés');
} else {
  // Créer des feeds par défaut
  const defaultSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://taxiassur.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  const defaultRSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>TaxiAssur - Blog</title>
    <description>Actualités assurance taxi</description>
    <link>https://taxiassur.com/blog</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  </channel>
</rss>`;

  fs.writeFileSync('dist/feeds/sitemap.xml', defaultSitemap);
  fs.writeFileSync('dist/feeds/rss.xml', defaultRSS);
  console.log('✓ Feeds par défaut créés');
}

// 8. Création du guide de déploiement IONOS
console.log('📖 Création du guide IONOS...');
const ionosGuide = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guide Déploiement IONOS - TaxiAssur</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
        .step { background: #f1f5f9; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; border-radius: 0 8px 8px 0; }
        .success { background: #dcfce7; border-left-color: #16a34a; }
        .warning { background: #fef3c7; border-left-color: #d97706; }
        .code { background: #1e293b; color: #e2e8f0; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Guide Déploiement IONOS</h1>
        <p>TaxiAssur.com - Prêt pour la production</p>
    </div>

    <div class="step success">
        <h3>✅ Build Terminé avec Succès</h3>
        <p>Votre site TaxiAssur est prêt pour IONOS !</p>
        <p><strong>Fichiers générés :</strong> ${countFilesRecursive('dist')} fichiers</p>
        <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
    </div>

    <div class="step">
        <h3>📤 Upload sur IONOS</h3>
        <p><strong>IMPORTANT :</strong> Uploadez TOUT le contenu du dossier <code>/dist</code> vers la racine de votre espace web IONOS.</p>
        <p>Via FTP, SFTP ou le gestionnaire de fichiers IONOS.</p>
    </div>

    <div class="step">
        <h3>🔧 Configuration IONOS</h3>
        <p>Dans votre panneau IONOS :</p>
        <ol>
            <li>Activez PHP 7.4+ (recommandé: PHP 8.1)</li>
            <li>Vérifiez que les extensions JSON et mbstring sont activées</li>
            <li>Configurez vos variables d'environnement si nécessaire</li>
        </ol>
    </div>

    <div class="step">
        <h3>🧪 Tests Post-Déploiement</h3>
        <ol>
            <li><a href="/server-check.php">Test serveur complet</a></li>
            <li><a href="/test-simple.php">Test PHP basique</a></li>
            <li><a href="/">Site principal</a></li>
            <li><a href="/#devis">Test formulaire</a></li>
        </ol>
    </div>

    <div class="step warning">
        <h3>⚠️ Points d'Attention IONOS</h3>
        <ul>
            <li>Changez le MAKE_SECRET par défaut</li>
            <li>Configurez votre email IONOS pour les notifications</li>
            <li>Activez HTTPS dans votre panneau IONOS</li>
            <li>Vérifiez les permissions des dossiers</li>
        </ul>
    </div>

    <div class="step success">
        <h3>🎉 Félicitations !</h3>
        <p>Votre site TaxiAssur est maintenant prêt sur IONOS !</p>
        <p><strong>Support :</strong> team@taxiassur.com | 01 80 85 57 86</p>
    </div>
</body>
</html>`;

fs.writeFileSync('dist/ionos-guide.html', ionosGuide);

// 9. Vérification finale
console.log('✅ Vérification finale...');
const requiredFiles = [
    'dist/index.html',
    'dist/api/lead.php',
    'dist/config.php',
    'dist/server-check.php',
    'dist/.htaccess',
    'dist/content/backlinks.json',
    'dist/content/partners.json',
    'dist/feeds/sitemap.xml',
    'dist/feeds/rss.xml'
];

let allFilesPresent = true;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✓ ${file} présent`);
    } else {
        console.log(`⚠️  ${file} manquant`);
        allFilesPresent = false;
    }
});

// 10. Fonction pour compter les fichiers
function countFilesRecursive(dir) {
    try {
        let count = 0;
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
                count += countFilesRecursive(fullPath);
            } else {
                count++;
            }
        });
        
        return count;
    } catch {
        return 0;
    }
}

// 11. Génération du rapport final
const deployReport = {
    timestamp: new Date().toISOString(),
    buildSuccess: true,
    filesCount: countFilesRecursive('dist'),
    apiPresent: fs.existsSync('dist/api/lead.php'),
    configPresent: fs.existsSync('dist/config.php'),
    htaccessPresent: fs.existsSync('dist/.htaccess'),
    contentDirs: ['blog', 'faq', 'reviews', 'offers'].map(dir => ({
        name: dir,
        files: fs.existsSync(`dist/content/${dir}`) ? fs.readdirSync(`dist/content/${dir}`).length : 0
    })),
    ionosOptimized: true,
    allFilesPresent
};

fs.writeFileSync('dist/deploy-report.json', JSON.stringify(deployReport, null, 2));

console.log('');
console.log('🎉 DÉPLOIEMENT IONOS TERMINÉ !');
console.log('==============================');
console.log(`📊 ${deployReport.filesCount} fichiers générés`);
console.log(`🔗 API: ${deployReport.apiPresent ? 'OK' : 'MANQUANT'}`);
console.log(`⚙️  Config: ${deployReport.configPresent ? 'OK' : 'MANQUANT'}`);
console.log(`🛡️  .htaccess: ${deployReport.htaccessPresent ? 'OK' : 'MANQUANT'}`);
console.log('');
console.log('📋 ÉTAPES IONOS:');
console.log('1. Uploadez TOUT le dossier /dist vers votre espace web IONOS');
console.log('2. Activez PHP 7.4+ dans votre panneau IONOS');
console.log('3. Testez: https://votre-domaine.com/server-check.php');
console.log('4. Testez: https://votre-domaine.com/test-simple.php');
console.log('5. Visitez: https://votre-domaine.com/');
console.log('');
console.log('🌐 URLs importantes:');
console.log('   - Site: https://votre-domaine.com/');
console.log('   - Test serveur: https://votre-domaine.com/server-check.php');
console.log('   - Test simple: https://votre-domaine.com/test-simple.php');
console.log('   - Test final: https://votre-domaine.com/test-final.php');
console.log('   - Debug: https://votre-domaine.com/debug.php');
console.log('   - Guide IONOS: https://votre-domaine.com/ionos-guide.html');
console.log('   - Backoffice: https://votre-domaine.com/backoffice');
console.log('');

if (allFilesPresent) {
    console.log('🎯 SUCCÈS: Tous les fichiers critiques sont présents !');
    console.log('🚀 Votre site est prêt pour IONOS !');
} else {
    console.log('⚠️  ATTENTION: Certains fichiers manquent');
    console.log('Vérifiez les fichiers manquants ci-dessus');
}

console.log('');
console.log('📞 Support: team@taxiassur.com | 01 80 85 57 86');