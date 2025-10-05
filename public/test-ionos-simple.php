<?php
// Test ultra-basique pour IONOS - Diagnostic erreur 500
// Ce fichier ne doit JAMAIS générer d'erreur

// Désactiver TOUTES les erreurs pour éviter les 500
error_reporting(0);
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);

// Headers de base
header('Content-Type: text/html; charset=UTF-8');

echo "<!DOCTYPE html><html><head><title>Test IONOS TaxiAssur</title></head><body>";
echo "<h1>✅ PHP fonctionne sur IONOS !</h1>";
echo "<p>Si vous voyez cette page, PHP est opérationnel.</p>";

// Test version PHP
echo "<h2>Informations Serveur</h2>";
echo "<p><strong>Version PHP :</strong> " . PHP_VERSION . "</p>";
echo "<p><strong>Serveur :</strong> " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Inconnu') . "</p>";
echo "<p><strong>Date :</strong> " . date('Y-m-d H:i:s') . "</p>";

// Test extensions critiques
echo "<h2>Extensions PHP</h2>";
$extensions = ['json', 'mbstring', 'curl'];
foreach ($extensions as $ext) {
    $loaded = extension_loaded($ext);
    echo "<p><strong>$ext :</strong> " . ($loaded ? '✅ Chargée' : '❌ Manquante') . "</p>";
}

// Test écriture
echo "<h2>Test Permissions</h2>";
$testFile = __DIR__ . '/test-write.txt';
if (@file_put_contents($testFile, 'Test IONOS')) {
    echo "<p>✅ Écriture fichier : OK</p>";
    @unlink($testFile);
} else {
    echo "<p>❌ Écriture fichier : ERREUR</p>";
}

// Test dossiers
echo "<h2>Structure Dossiers</h2>";
$dirs = ['api', 'content', 'assets', 'feeds'];
foreach ($dirs as $dir) {
    $path = __DIR__ . '/' . $dir;
    if (is_dir($path)) {
        echo "<p>✅ Dossier $dir : Présent</p>";
    } else {
        echo "<p>❌ Dossier $dir : Manquant</p>";
    }
}

echo "<h2>🎯 Diagnostic</h2>";
echo "<p>Si cette page s'affiche, le problème vient probablement de :</p>";
echo "<ul>";
echo "<li>Fichier .htaccess avec règles incompatibles</li>";
echo "<li>Fichier index.html ou index.php corrompu</li>";
echo "<li>Permissions incorrectes</li>";
echo "<li>Configuration PHP trop restrictive</li>";
echo "</ul>";

echo "<h2>🔧 Solutions</h2>";
echo "<ol>";
echo "<li><strong>Renommez .htaccess</strong> en .htaccess-backup temporairement</li>";
echo "<li><strong>Vérifiez index.html</strong> : doit être un fichier React valide</li>";
echo "<li><strong>Permissions :</strong> 755 pour dossiers, 644 pour fichiers</li>";
echo "<li><strong>Contactez IONOS</strong> si le problème persiste</li>";
echo "</ol>";

echo "<p><a href='/'>Retour au site</a> | <a href='/server-check.php'>Test complet</a></p>";
echo "</body></html>";
?>