<?php
// Script de vérification serveur TaxiAssur.com - ULTRA-ROBUSTE
// Vérification complète SANS JAMAIS planter

// Configuration d'erreurs ULTRA-SÉCURISÉE
error_reporting(0);
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);

header('Content-Type: text/html; charset=UTF-8');

echo "<!DOCTYPE html><html lang='fr'><head>";
echo "<meta charset='UTF-8'>";
echo "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
echo "<title>Vérification Serveur TaxiAssur</title>";
echo "<style>";
echo "body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f8fafc; line-height: 1.6; }";
echo ".header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }";
echo ".test-section { background: white; margin: 20px 0; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }";
echo ".success { background: #dcfce7; border-left: 4px solid #16a34a; }";
echo ".warning { background: #fef3c7; border-left: 4px solid #d97706; }";
echo ".error { background: #fee2e2; border-left: 4px solid #dc2626; }";
echo ".code { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; font-family: monospace; overflow-x: auto; margin: 10px 0; }";
echo "h1, h2, h3 { color: #1e293b; }";
echo ".status-ok { color: #16a34a; font-weight: bold; }";
echo ".status-error { color: #dc2626; font-weight: bold; }";
echo ".status-warning { color: #d97706; font-weight: bold; }";
echo "</style></head><body>";

echo "<div class='header'>";
echo "<h1>🚖 Vérification Serveur TaxiAssur</h1>";
echo "<p>Diagnostic complet du système</p>";
echo "<p><small>Généré le " . date('d/m/Y H:i:s') . "</small></p>";
echo "</div>";

$allGood = true;
$tests = [];

// Test 1: PHP Version - ULTRA-SÉCURISÉ
try {
    $phpVersion = PHP_VERSION;
    $phpOk = version_compare($phpVersion, '7.4.0', '>=');
    $phpOptimal = version_compare($phpVersion, '8.1.0', '>=');
    
    $tests['php_version'] = [
        'name' => 'Version PHP',
        'status' => $phpOk,
        'value' => $phpVersion,
        'required' => '7.4+ (8.1+ optimal)',
        'critical' => true
    ];
    
    if (!$phpOk) $allGood = false;
} catch (Throwable $e) {
    $tests['php_version'] = [
        'name' => 'Version PHP',
        'status' => false,
        'value' => 'Erreur: ' . $e->getMessage(),
        'required' => '7.4+',
        'critical' => true
    ];
    $allGood = false;
}

// Test 2: Extensions PHP - ULTRA-SÉCURISÉ
$requiredExtensions = ['json', 'mbstring'];
foreach ($requiredExtensions as $ext) {
    try {
        $loaded = extension_loaded($ext);
        $tests["ext_$ext"] = [
            'name' => "Extension $ext",
            'status' => $loaded,
            'value' => $loaded ? 'Chargée' : 'Manquante',
            'required' => 'Requise',
            'critical' => true
        ];
        if (!$loaded) $allGood = false;
    } catch (Throwable $e) {
        $tests["ext_$ext"] = [
            'name' => "Extension $ext",
            'status' => false,
            'value' => 'Erreur test',
            'required' => 'Requise',
            'critical' => true
        ];
        $allGood = false;
    }
}

// Test 3: Fonction mail - ULTRA-SÉCURISÉ
try {
    $mailAvailable = function_exists('mail');
    $tests['mail_function'] = [
        'name' => 'Fonction mail()',
        'status' => $mailAvailable,
        'value' => $mailAvailable ? 'Disponible' : 'Indisponible',
        'required' => 'Recommandée',
        'critical' => false
    ];
} catch (Throwable $e) {
    $tests['mail_function'] = [
        'name' => 'Fonction mail()',
        'status' => false,
        'value' => 'Erreur test',
        'required' => 'Recommandée',
        'critical' => false
    ];
}

// Test 4: Permissions dossiers - ULTRA-SÉCURISÉ
$dirsToCheck = [
    'api' => 'API endpoints',
    'content' => 'Contenu JSON',
    'feeds' => 'Flux SEO',
    'logs' => 'Logs système'
];

foreach ($dirsToCheck as $dir => $desc) {
    try {
        $dirPath = __DIR__ . '/' . $dir;
        $exists = is_dir($dirPath);
        $writable = $exists && is_writable($dirPath);
        
        $tests["dir_$dir"] = [
            'name' => "Dossier $desc",
            'status' => $exists,
            'value' => $exists ? ($writable ? 'Accessible + Écriture' : 'Accessible seulement') : 'Manquant',
            'required' => 'Requis',
            'critical' => $dir === 'api'
        ];
        
        if (!$exists && $dir === 'api') $allGood = false;
    } catch (Throwable $e) {
        $tests["dir_$dir"] = [
            'name' => "Dossier $desc",
            'status' => false,
            'value' => 'Erreur test',
            'required' => 'Requis',
            'critical' => $dir === 'api'
        ];
        if ($dir === 'api') $allGood = false;
    }
}

// Test 5: Fichiers critiques - ULTRA-SÉCURISÉ
$criticalFiles = [
    'index.html' => 'Site principal',
    'api/lead.php' => 'API formulaire',
    '.htaccess' => 'Configuration Apache'
];

foreach ($criticalFiles as $file => $desc) {
    try {
        $filePath = __DIR__ . '/' . $file;
        $exists = file_exists($filePath);
        $readable = $exists && is_readable($filePath);
        
        $tests["file_$file"] = [
            'name' => "Fichier $desc",
            'status' => $exists && $readable,
            'value' => $exists ? ($readable ? 'Accessible' : 'Permissions') : 'Manquant',
            'required' => 'Critique',
            'critical' => true
        ];
        
        if (!$exists || !$readable) $allGood = false;
    } catch (Throwable $e) {
        $tests["file_$file"] = [
            'name' => "Fichier $desc",
            'status' => false,
            'value' => 'Erreur test',
            'required' => 'Critique',
            'critical' => true
        ];
        $allGood = false;
    }
}

// Test 6: API Lead - ULTRA-SÉCURISÉ
$apiTest = false;
$apiError = '';
try {
    // Test très simple pour éviter les erreurs
    if (file_exists(__DIR__ . '/api/lead.php')) {
        $apiTest = true;
    } else {
        $apiError = 'Fichier API manquant';
    }
} catch (Throwable $e) {
    $apiError = 'Erreur: ' . $e->getMessage();
}

$tests['api_test'] = [
    'name' => 'API Lead disponible',
    'status' => $apiTest,
    'value' => $apiTest ? 'Fichier présent' : $apiError,
    'required' => 'Critique',
    'critical' => true
];

if (!$apiTest) $allGood = false;

// Affichage des résultats - ULTRA-SÉCURISÉ
echo "<div class='test-section " . ($allGood ? 'success' : 'error') . "'>";
echo "<h2>" . ($allGood ? '✅ SYSTÈME OPÉRATIONNEL' : '❌ CORRECTIONS NÉCESSAIRES') . "</h2>";
echo "<p>" . ($allGood ? 
    'Tous les tests sont passés avec succès ! Votre site TaxiAssur est prêt pour la production.' : 
    'Certains tests ont échoué. Corrigez les erreurs ci-dessous avant la mise en ligne.'
) . "</p>";
echo "</div>";

// Détail des tests - ULTRA-SÉCURISÉ
foreach ($tests as $key => $test) {
    $statusClass = $test['status'] ? 'success' : ($test['critical'] ? 'error' : 'warning');
    $statusText = $test['status'] ? 'status-ok' : 'status-error';
    
    echo "<div class='test-section $statusClass'>";
    echo "<h3>" . htmlspecialchars($test['name']) . "</h3>";
    echo "<p><strong>Statut:</strong> <span class='$statusText'>" . ($test['status'] ? 'OK' : 'ERREUR') . "</span></p>";
    echo "<p><strong>Valeur:</strong> " . htmlspecialchars($test['value']) . "</p>";
    echo "<p><strong>Importance:</strong> " . htmlspecialchars($test['required']) . "</p>";
    echo "</div>";
}

// Actions recommandées - ULTRA-SÉCURISÉES
if ($allGood) {
    echo "<div class='test-section success'>";
    echo "<h2>🎉 Prochaines Étapes</h2>";
    echo "<ol>";
    echo "<li><strong>Testez le site :</strong> <a href='/' target='_blank'>https://taxiassur.com/</a></li>";
    echo "<li><strong>Testez le formulaire :</strong> <a href='/#devis' target='_blank'>Formulaire de devis</a></li>";
    echo "<li><strong>Vérifiez les emails :</strong> Testez la réception des leads</li>";
    echo "<li><strong>Configurez le monitoring :</strong> Surveillez les logs</li>";
    echo "</ol>";
    echo "</div>";
} else {
    echo "<div class='test-section error'>";
    echo "<h2>🔧 Actions Correctives</h2>";
    echo "<ol>";
    echo "<li><strong>Vérifiez les permissions :</strong> chmod 755 pour les dossiers</li>";
    echo "<li><strong>Contactez votre hébergeur :</strong> Si extensions PHP manquantes</li>";
    echo "<li><strong>Vérifiez la configuration :</strong> .htaccess et config.php</li>";
    echo "<li><strong>Testez manuellement :</strong> Chaque composant séparément</li>";
    echo "</ol>";
    echo "</div>";
}

// Informations système - ULTRA-SÉCURISÉES
echo "<div class='test-section'>";
echo "<h2>ℹ️ Informations Système</h2>";
echo "<p><strong>Serveur :</strong> " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Inconnu') . "</p>";
echo "<p><strong>PHP :</strong> " . PHP_VERSION . "</p>";
echo "<p><strong>Système :</strong> " . PHP_OS . "</p>";
echo "<p><strong>Mémoire :</strong> " . ini_get('memory_limit') . "</p>";
echo "<p><strong>Upload max :</strong> " . ini_get('upload_max_filesize') . "</p>";
echo "<p><strong>Timezone :</strong> " . date_default_timezone_get() . "</p>";
echo "<p><strong>Document Root :</strong> " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Inconnu') . "</p>";
echo "</div>";

// Test de connectivité - ULTRA-SÉCURISÉ
echo "<div class='test-section'>";
echo "<h2>🌐 Test de Connectivité</h2>";
echo "<p><strong>IP Serveur :</strong> " . ($_SERVER['SERVER_ADDR'] ?? 'Inconnue') . "</p>";
echo "<p><strong>IP Client :</strong> " . ($_SERVER['REMOTE_ADDR'] ?? 'Inconnue') . "</p>";
echo "<p><strong>User Agent :</strong> " . substr($_SERVER['HTTP_USER_AGENT'] ?? 'Inconnu', 0, 100) . "</p>";
echo "<p><strong>Protocole :</strong> " . ($_SERVER['SERVER_PROTOCOL'] ?? 'Inconnu') . "</p>";
echo "</div>";

echo "<div class='test-section'>";
echo "<h2>🔄 Actions Rapides</h2>";
echo "<p>";
echo "<a href='?' style='background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-right: 10px;'>";
echo "🔄 Relancer les Tests";
echo "</a>";
echo "<a href='/' style='background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-right: 10px;'>";
echo "🏠 Voir le Site";
echo "</a>";
echo "<a href='/test-simple.php' style='background: #f59e0b; color: black; padding: 10px 20px; text-decoration: none; border-radius: 6px;'>";
echo "🔧 Test Simple";
echo "</a>";
echo "</p>";
echo "</div>";

echo "</body></html>";
?>