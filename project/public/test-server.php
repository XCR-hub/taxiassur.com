<?php
// Test ultra-simple pour diagnostiquer le problème
echo "<!DOCTYPE html><html><head><title>Test TaxiAssur</title></head><body>";
echo "<h1>🔧 Diagnostic TaxiAssur</h1>";

// Test PHP de base
echo "<h2>✅ PHP fonctionne !</h2>";
echo "Version PHP: " . PHP_VERSION . "<br>";
echo "Date: " . date('Y-m-d H:i:s') . "<br>";

// Test permissions
echo "<h2>📁 Test Permissions</h2>";
$testFile = __DIR__ . '/test-write.txt';
if (@file_put_contents($testFile, 'Test OK')) {
    echo "✅ Écriture: OK<br>";
    @unlink($testFile);
} else {
    echo "❌ Écriture: ERREUR<br>";
}

// Test dossiers
$dirs = ['api', 'content', 'assets'];
foreach ($dirs as $dir) {
    if (is_dir(__DIR__ . '/' . $dir)) {
        echo "✅ Dossier $dir: Présent<br>";
    } else {
        echo "❌ Dossier $dir: Manquant<br>";
    }
}

// Test fichiers critiques
$files = ['index.html', 'api/lead.php'];
foreach ($files as $file) {
    if (file_exists(__DIR__ . '/' . $file)) {
        echo "✅ Fichier $file: Présent<br>";
    } else {
        echo "❌ Fichier $file: Manquant<br>";
    }
}

echo "<h2>🚀 Solution</h2>";
echo "<p>Si vous voyez cette page, PHP fonctionne !</p>";
echo "<p><a href='/'>Retour au site</a></p>";
echo "</body></html>";
?>