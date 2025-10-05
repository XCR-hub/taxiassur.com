<?php
// Test ultra-simple pour IONOS - ne jamais planter
try {
    echo "<!DOCTYPE html><html><head><title>Test Simple IONOS</title></head><body>";
    echo "<h1>✅ PHP fonctionne sur IONOS !</h1>";
    echo "<p>Version PHP: " . PHP_VERSION . "</p>";
    echo "<p>Date: " . date('Y-m-d H:i:s') . "</p>";
    echo "<p>Serveur: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Inconnu') . "</p>";
    
    // Test d'écriture simple
    $testFile = __DIR__ . '/test-write.txt';
    if (@file_put_contents($testFile, 'Test IONOS OK')) {
        echo "<p>✅ Écriture fichier: OK</p>";
        @unlink($testFile);
    } else {
        echo "<p>❌ Écriture fichier: ERREUR</p>";
    }
    
    // Test JSON
    if (function_exists('json_encode')) {
        echo "<p>✅ JSON: OK</p>";
    } else {
        echo "<p>❌ JSON: ERREUR</p>";
    }
    
    // Test mail
    if (function_exists('mail')) {
        echo "<p>✅ Fonction mail: Disponible</p>";
    } else {
        echo "<p>❌ Fonction mail: INDISPONIBLE</p>";
    }
    
    echo "<h2>🎯 Résultat</h2>";
    echo "<p>Si vous voyez cette page, votre serveur IONOS est compatible TaxiAssur !</p>";
    echo "<p><a href='/server-check.php'>Test complet</a> | <a href='/'>Retour au site</a></p>";
    echo "</body></html>";
} catch (Throwable $e) {
    echo "Erreur PHP: " . $e->getMessage();
}
?>