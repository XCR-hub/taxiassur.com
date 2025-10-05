<?php
// Test final ultra-complet pour TaxiAssur.com
header('Content-Type: text/html; charset=UTF-8');

echo "<!DOCTYPE html>
<html lang='fr'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Test Final TaxiAssur</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 1000px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #f8fafc;
            line-height: 1.6;
        }
        .header {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        .test-section { 
            background: white;
            margin: 20px 0; 
            padding: 25px; 
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success { background: #dcfce7; border-left: 4px solid #16a34a; }
        .warning { background: #fef3c7; border-left: 4px solid #d97706; }
        .error { background: #fee2e2; border-left: 4px solid #dc2626; }
        .code {
            background: #1e293b;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            overflow-x: auto;
            margin: 10px 0;
        }
        h1, h2, h3 { color: #1e293b; }
        .status-ok { color: #16a34a; font-weight: bold; }
        .status-error { color: #dc2626; font-weight: bold; }
        .status-warning { color: #d97706; font-weight: bold; }
    </style>
</head>
<body>";

echo "<div class='header'>
    <h1>🚖 Test Final TaxiAssur.com</h1>
    <p>Diagnostic complet du système</p>
    <p><small>Généré le " . date('d/m/Y H:i:s') . "</small></p>
</div>";

$allGood = true;
$tests = [];

// Test 1: PHP Version
$phpVersion = PHP_VERSION;
$phpOk = version_compare($phpVersion, '7.4.0', '>=');
$tests['php_version'] = [
    'name' => 'Version PHP',
    'status' => $phpOk,
    'value' => $phpVersion,
    'required' => '7.4+'
];
if (!$phpOk) $allGood = false;

// Test 2: Extensions PHP
$requiredExtensions = ['json', 'mbstring'];
foreach ($requiredExtensions as $ext) {
    $loaded = extension_loaded($ext);
    $tests["ext_$ext"] = [
        'name' => "Extension $ext",
        'status' => $loaded,
        'value' => $loaded ? 'Chargée' : 'Manquante',
        'required' => 'Requise'
    ];
    if (!$loaded) $allGood = false;
}

// Test 3: Fonction mail
$mailAvailable = function_exists('mail');
$tests['mail_function'] = [
    'name' => 'Fonction mail()',
    'status' => $mailAvailable,
    'value' => $mailAvailable ? 'Disponible' : 'Indisponible',
    'required' => 'Recommandée'
];

// Test 4: Permissions dossiers
$dirsToCheck = [
    'api' => 'API endpoints',
    'content' => 'Contenu JSON',
    'logs' => 'Logs système'
];

foreach ($dirsToCheck as $dir => $desc) {
    $dirPath = __DIR__ . '/' . $dir;
    $exists = is_dir($dirPath);
    $writable = $exists && is_writable($dirPath);
    
    $tests["dir_$dir"] = [
        'name' => "Dossier $desc",
        'status' => $exists,
        'value' => $exists ? ($writable ? 'Accessible + Écriture' : 'Accessible seulement') : 'Manquant',
        'required' => 'Requis'
    ];
    
    if (!$exists) $allGood = false;
}

// Test 5: Fichiers critiques
$criticalFiles = [
    'index.html' => 'Site principal',
    'api/lead.php' => 'API formulaire',
    '.htaccess' => 'Configuration Apache'
];

foreach ($criticalFiles as $file => $desc) {
    $filePath = __DIR__ . '/' . $file;
    $exists = file_exists($filePath);
    $readable = $exists && is_readable($filePath);
    
    $tests["file_$file"] = [
        'name' => "Fichier $desc",
        'status' => $exists && $readable,
        'value' => $exists ? ($readable ? 'Accessible' : 'Permissions') : 'Manquant',
        'required' => 'Critique'
    ];
    
    if (!$exists || !$readable) $allGood = false;
}

// Test 6: API Lead
$apiTest = false;
$apiError = '';
try {
    $testData = [
        'name' => 'Test Système',
        'email' => 'test@example.com',
        'phone' => '0123456789',
        'city' => 'Paris',
        'status' => 'taxi'
    ];
    
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nX-Requested-With: XMLHttpRequest\r\n",
            'content' => json_encode($testData)
        ]
    ]);
    
    $result = @file_get_contents(__DIR__ . '/api/lead.php', false, $context);
    $apiTest = $result !== false && strpos($result, 'success') !== false;
    
    if (!$apiTest) {
        $apiError = 'Réponse API invalide';
    }
} catch (Exception $e) {
    $apiError = $e->getMessage();
}

$tests['api_test'] = [
    'name' => 'Test API Lead',
    'status' => $apiTest,
    'value' => $apiTest ? 'Fonctionnelle' : "Erreur: $apiError",
    'required' => 'Critique'
];

if (!$apiTest) $allGood = false;

// Affichage des résultats
echo "<div class='test-section " . ($allGood ? 'success' : 'error') . "'>
    <h2>" . ($allGood ? '✅ SYSTÈME OPÉRATIONNEL' : '❌ CORRECTIONS NÉCESSAIRES') . "</h2>
    <p>" . ($allGood ? 
        'Tous les tests sont passés avec succès ! Votre site TaxiAssur est prêt pour la production.' : 
        'Certains tests ont échoué. Corrigez les erreurs ci-dessous avant la mise en ligne.'
    ) . "</p>
</div>";

// Détail des tests
foreach ($tests as $key => $test) {
    $statusClass = $test['status'] ? 'success' : ($test['required'] === 'Critique' ? 'error' : 'warning');
    $statusText = $test['status'] ? 'status-ok' : 'status-error';
    
    echo "<div class='test-section $statusClass'>
        <h3>{$test['name']}</h3>
        <p><strong>Statut:</strong> <span class='$statusText'>" . ($test['status'] ? 'OK' : 'ERREUR') . "</span></p>
        <p><strong>Valeur:</strong> {$test['value']}</p>
        <p><strong>Importance:</strong> {$test['required']}</p>
    </div>";
}

// Actions recommandées
if ($allGood) {
    echo "<div class='test-section success'>
        <h2>🎉 Prochaines Étapes</h2>
        <ol>
            <li><strong>Testez le site :</strong> <a href='/' target='_blank'>https://taxiassur.com/</a></li>
            <li><strong>Testez le formulaire :</strong> <a href='/#devis' target='_blank'>Formulaire de devis</a></li>
            <li><strong>Vérifiez les emails :</strong> Testez la réception des leads</li>
            <li><strong>Configurez le monitoring :</strong> Surveillez les logs</li>
        </ol>
    </div>";
} else {
    echo "<div class='test-section error'>
        <h2>🔧 Actions Correctives</h2>
        <ol>
            <li><strong>Vérifiez les permissions :</strong> chmod 755 pour les dossiers</li>
            <li><strong>Contactez votre hébergeur :</strong> Si extensions PHP manquantes</li>
            <li><strong>Vérifiez la configuration :</strong> .htaccess et config.php</li>
            <li><strong>Testez manuellement :</strong> Chaque composant séparément</li>
        </ol>
    </div>";
}

// Informations système
echo "<div class='test-section'>
    <h2>ℹ️ Informations Système</h2>
    <p><strong>Serveur :</strong> " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Inconnu') . "</p>
    <p><strong>PHP :</strong> " . PHP_VERSION . "</p>
    <p><strong>Système :</strong> " . PHP_OS . "</p>
    <p><strong>Mémoire :</strong> " . ini_get('memory_limit') . "</p>
    <p><strong>Upload max :</strong> " . ini_get('upload_max_filesize') . "</p>
    <p><strong>Timezone :</strong> " . date_default_timezone_get() . "</p>
    <p><strong>Document Root :</strong> " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Inconnu') . "</p>
</div>";

// Test de connectivité
echo "<div class='test-section'>
    <h2>🌐 Test de Connectivité</h2>
    <p><strong>IP Serveur :</strong> " . ($_SERVER['SERVER_ADDR'] ?? 'Inconnue') . "</p>
    <p><strong>IP Client :</strong> " . ($_SERVER['REMOTE_ADDR'] ?? 'Inconnue') . "</p>
    <p><strong>User Agent :</strong> " . substr($_SERVER['HTTP_USER_AGENT'] ?? 'Inconnu', 0, 100) . "</p>
    <p><strong>Protocole :</strong> " . ($_SERVER['SERVER_PROTOCOL'] ?? 'Inconnu') . "</p>
</div>";

echo "<div class='test-section'>
    <h2>🔄 Actions Rapides</h2>
    <p>
        <a href='?' style='background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-right: 10px;'>
            🔄 Relancer les Tests
        </a>
        <a href='/' style='background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-right: 10px;'>
            🏠 Voir le Site
        </a>
        <a href='/debug.php' style='background: #f59e0b; color: black; padding: 10px 20px; text-decoration: none; border-radius: 6px;'>
            🔧 Debug Avancé
        </a>
    </p>
</div>";

echo "</body></html>";
?>