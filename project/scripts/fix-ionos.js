#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔧 Correction Erreur 500 IONOS - TaxiAssur');
console.log('=============================================');

// 1. Vérifier la structure dist
if (!fs.existsSync('dist')) {
    console.error('❌ Dossier dist manquant. Exécutez d\'abord: npm run build');
    process.exit(1);
}

console.log('📁 Vérification structure dist...');

// 2. Créer un .htaccess minimal et sûr
console.log('🛡️ Création .htaccess sécurisé...');
const safeHtaccess = `# Configuration IONOS ultra-sécurisée - ZÉRO erreur 500

# Redirection vers React App SEULEMENT si mod_rewrite disponible
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} !^/api/
    RewriteCond %{REQUEST_URI} !\.php$
    RewriteRule ^(.*)$ /index.html [L]
    ErrorDocument 404 /index.html
</IfModule>

# Headers SEULEMENT si mod_headers disponible
<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, X-MAKE-SECRET"
</IfModule>

# Protection fichiers sensibles
<Files "*.log">
    Require all denied
</Files>`;

fs.writeFileSync('dist/.htaccess', safeHtaccess);
console.log('✅ .htaccess sécurisé créé');

// 3. Vérifier index.html
console.log('📄 Vérification index.html...');
const indexPath = 'dist/index.html';
if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    if (indexContent.includes('<div id="root">') && indexContent.includes('</html>')) {
        console.log('✅ index.html valide');
    } else {
        console.log('⚠️ index.html semble corrompu, création d\'une version de secours...');
        
        // Copier la version IONOS safe
        if (fs.existsSync('public/index-ionos.html')) {
            fs.copyFileSync('public/index-ionos.html', 'dist/index.html');
            console.log('✅ index.html restauré');
        }
    }
} else {
    console.log('❌ index.html manquant dans dist/');
}

// 4. Vérifier les fichiers PHP critiques
console.log('🔍 Vérification fichiers PHP...');
const phpFiles = [
    'dist/api/lead.php',
    'dist/config.php',
    'dist/server-check.php'
];

phpFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} présent`);
    } else {
        console.log(`❌ ${file} manquant`);
    }
});

// 5. Créer un fichier de diagnostic IONOS
console.log('🩺 Création fichier diagnostic...');
const diagnosticContent = `<?php
// Diagnostic IONOS TaxiAssur - ULTRA-SIMPLE
error_reporting(0);
ini_set('display_errors', 0);

echo "<!DOCTYPE html><html><head><title>Diagnostic IONOS</title></head><body>";
echo "<h1>🩺 Diagnostic TaxiAssur IONOS</h1>";

// Test PHP de base
echo "<h2>PHP</h2>";
echo "<p>Version: " . PHP_VERSION . "</p>";
echo "<p>Serveur: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Inconnu') . "</p>";

// Test fichiers
echo "<h2>Fichiers Critiques</h2>";
$files = ['index.html', 'api/lead.php', '.htaccess'];
foreach ($files as $file) {
    if (file_exists(__DIR__ . '/' . $file)) {
        echo "<p>✅ $file : Présent</p>";
    } else {
        echo "<p>❌ $file : MANQUANT</p>";
    }
}

// Test permissions
echo "<h2>Permissions</h2>";
if (is_writable(__DIR__)) {
    echo "<p>✅ Dossier racine : Écriture OK</p>";
} else {
    echo "<p>❌ Dossier racine : Pas d'écriture</p>";
}

echo "<h2>🔧 Actions Recommandées</h2>";
echo "<ol>";
echo "<li>Si cette page s'affiche, PHP fonctionne</li>";
echo "<li>Vérifiez que tous les fichiers sont uploadés</li>";
echo "<li>Renommez .htaccess en .htaccess-backup temporairement</li>";
echo "<li>Testez l'accès à index.html directement</li>";
echo "</ol>";

echo "<p><a href='/index.html'>Test index.html</a> | <a href='/test-ionos-simple.php'>Recharger</a></p>";
echo "</body></html>";
?>`;

fs.writeFileSync('dist/diagnostic-ionos.php', diagnosticContent);
console.log('✅ diagnostic-ionos.php créé');

// 6. Créer un index.php de redirection simple
console.log('🔄 Création index.php de redirection...');
const indexPhpContent = `<?php
// Redirection simple vers React App
header('Location: /index.html');
exit;
?>`;

fs.writeFileSync('dist/index.php', indexPhpContent);
console.log('✅ index.php créé');

// 7. Vérifier les permissions (simulation)
console.log('🔐 Vérification permissions...');
try {
    const testFile = 'dist/test-permissions.txt';
    fs.writeFileSync(testFile, 'Test permissions IONOS');
    fs.unlinkSync(testFile);
    console.log('✅ Permissions écriture OK');
} catch (error) {
    console.log('⚠️ Problème permissions détecté');
}

// 8. Rapport final
console.log('');
console.log('🎯 CORRECTION ERREUR 500 TERMINÉE');
console.log('==================================');
console.log('');
console.log('📋 ÉTAPES DE RÉSOLUTION :');
console.log('');
console.log('1. 🔄 RE-UPLOADEZ le dossier /dist complet sur IONOS');
console.log('2. 🧪 Testez: https://taxiassur.com/test-ionos-simple.php');
console.log('3. 🩺 Diagnostic: https://taxiassur.com/diagnostic-ionos.php');
console.log('4. 🏠 Site: https://taxiassur.com/index.html (direct)');
console.log('5. 🌐 Site: https://taxiassur.com/ (avec redirection)');
console.log('');
console.log('🚨 SI ERREUR 500 PERSISTE :');
console.log('');
console.log('A. Renommez .htaccess en .htaccess-backup');
console.log('B. Testez https://taxiassur.com/index.html');
console.log('C. Si ça marche, le problème vient du .htaccess');
console.log('D. Contactez le support IONOS avec les logs d\'erreur');
console.log('');
console.log('📞 Support IONOS : Demandez les logs d\'erreur PHP');
console.log('📧 Support TaxiAssur : team@taxiassur.com');
console.log('');
console.log('🎉 Une fois corrigé, votre site sera opérationnel !');