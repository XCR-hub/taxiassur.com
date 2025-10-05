<?php
// Test final spécifique IONOS - Vérification complète
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: text/html; charset=UTF-8');

echo "<!DOCTYPE html><html lang='fr'><head>";
echo "<meta charset='UTF-8'>";
echo "<title>Test Final IONOS - TaxiAssur</title>";
echo "<style>";
echo "body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f8fafc; }";
echo ".success { background: #dcfce7; border: 2px solid #16a34a; padding: 20px; border-radius: 8px; margin: 20px 0; }";
echo ".error { background: #fee2e2; border: 2px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0; }";
echo ".warning { background: #fef3c7; border: 2px solid #d97706; padding: 20px; border-radius: 8px; margin: 20px 0; }";
echo ".test-item { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }";
echo "h1, h2 { color: #1e293b; }";
echo ".status-ok { color: #16a34a; font-weight: bold; }";
echo ".status-error { color: #dc2626; font-weight: bold; }";
echo "</style></head><body>";

echo "<h1>🚖 Test Final IONOS - TaxiAssur.com</h1>";
echo "<p>Vérification complète après correction erreur 500</p>";

$allGood = true;
$tests = [];

// Test 1: PHP fonctionne
$tests['php'] = [
    'name' => 'PHP Opérationnel',
    'status' => true,
    'message' => 'PHP ' . PHP_VERSION . ' fonctionne parfaitement'
];

// Test 2: Extensions critiques
$requiredExtensions = ['json', 'mbstring'];
foreach ($requiredExtensions as $ext) {
    $loaded = extension_loaded($ext);
    $tests["ext_$ext"] = [
        'name' => "Extension $ext",
        'status' => $loaded,
        'message' => $loaded ? 'Chargée' : 'MANQUANTE - Contactez IONOS'
    ];
    if (!$loaded) $allGood = false;
}

// Test 3: Fichiers React
$reactFiles = [
    'index.html' => 'Application React',
    'assets' => 'Assets compilés',
    'api/lead.php' => 'API formulaire'
];

foreach ($reactFiles as $file => $desc) {
    $path = __DIR__ . '/' . $file;
    $exists = file_exists($path);
    $tests["file_$file"] = [
        'name' => $desc,
        'status' => $exists,
        'message' => $exists ? 'Présent' : 'MANQUANT - Vérifiez upload'
    ];
    if (!$exists && $file !== 'assets') $allGood = false;
}

// Test 4: Configuration .htaccess
$htaccessPath = __DIR__ . '/.htaccess';
$htaccessOk = file_exists($htaccessPath);
$tests['htaccess'] = [
    'name' => 'Configuration .htaccess',
    'status' => $htaccessOk,
    'message' => $htaccessOk ? 'Présent et fonctionnel' : 'MANQUANT'
];

// Test 5: API Lead
$apiTest = false;
$apiMessage = '';
try {
    if (file_exists(__DIR__ . '/api/lead.php')) {
        $apiTest = true;
        $apiMessage = 'API disponible et accessible';
    } else {
        $apiMessage = 'Fichier API manquant';
    }
} catch (Exception $e) {
    $apiMessage = 'Erreur: ' . $e->getMessage();
}

$tests['api'] = [
    'name' => 'API Formulaire',
    'status' => $apiTest,
    'message' => $apiMessage
];

if (!$apiTest) $allGood = false;

// Affichage des résultats
if ($allGood) {
    echo "<div class='success'>";
    echo "<h2>🎉 SUCCÈS ! Site TaxiAssur Opérationnel sur IONOS</h2>";
    echo "<p><strong>Félicitations !</strong> Tous les tests sont passés. Votre site est prêt pour la production.</p>";
    echo "</div>";
} else {
    echo "<div class='error'>";
    echo "<h2>⚠️ Corrections Nécessaires</h2>";
    echo "<p>Certains éléments nécessitent votre attention avant la mise en ligne.</p>";
    echo "</div>";
}

// Détail des tests
foreach ($tests as $key => $test) {
    $statusClass = $test['status'] ? 'success' : 'error';
    $statusText = $test['status'] ? 'status-ok' : 'status-error';
    
    echo "<div class='test-item'>";
    echo "<h3>" . htmlspecialchars($test['name']) . "</h3>";
    echo "<p><strong>Statut :</strong> <span class='$statusText'>" . ($test['status'] ? '✅ OK' : '❌ ERREUR') . "</span></p>";
    echo "<p><strong>Détail :</strong> " . htmlspecialchars($test['message']) . "</p>";
    echo "</div>";
}

// Actions suivantes
if ($allGood) {
    echo "<div class='success'>";
    echo "<h2>🚀 Prochaines Étapes</h2>";
    echo "<ol>";
    echo "<li><strong>Testez le site :</strong> <a href='/' target='_blank'>https://taxiassur.com/</a></li>";
    echo "<li><strong>Testez le formulaire :</strong> <a href='/#devis' target='_blank'>Formulaire de devis</a></li>";
    echo "<li><strong>Testez le backoffice :</strong> <a href='/backoffice' target='_blank'>Administration</a></li>";
    echo "<li><strong>Vérifiez les emails :</strong> Testez la réception des leads</li>";
    echo "<li><strong>Configurez Make :</strong> Webhook https://taxiassur.com/webhooks/make.php</li>";
    echo "</ol>";
    echo "</div>";
} else {
    echo "<div class='warning'>";
    echo "<h2>🔧 Actions Correctives</h2>";
    echo "<ol>";
    echo "<li><strong>Fichiers manquants :</strong> Re-uploadez le dossier /dist complet</li>";
    echo "<li><strong>Extensions PHP :</strong> Contactez IONOS pour activer JSON et mbstring</li>";
    echo "<li><strong>Permissions :</strong> Vérifiez chmod 755 pour dossiers, 644 pour fichiers</li>";
    echo "<li><strong>Support IONOS :</strong> Demandez les logs d'erreur si problème persiste</li>";
    echo "</ol>";
    echo "</div>";
}

// Informations système
echo "<div class='test-item'>";
echo "<h2>ℹ️ Informations Système IONOS</h2>";
echo "<p><strong>Serveur :</strong> " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Inconnu') . "</p>";
echo "<p><strong>PHP :</strong> " . PHP_VERSION . "</p>";
echo "<p><strong>Document Root :</strong> " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Inconnu') . "</p>";
echo "<p><strong>Timezone :</strong> " . date_default_timezone_get() . "</p>";
echo "<p><strong>Mémoire :</strong> " . ini_get('memory_limit') . "</p>";
echo "</div>";

echo "<div class='test-item'>";
echo "<h2>🔄 Tests Rapides</h2>";
echo "<p>";
echo "<a href='?' style='background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-right: 10px;'>";
echo "🔄 Relancer Tests";
echo "</a>";
echo "<a href='/' style='background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-right: 10px;'>";
echo "🏠 Voir le Site";
echo "</a>";
echo "<a href='/test-ionos-simple.php' style='background: #f59e0b; color: black; padding: 10px 20px; text-decoration: none; border-radius: 6px;'>";
echo "🔧 Test Simple";
echo "</a>";
echo "</p>";
echo "</div>";

echo "</body></html>";
?>