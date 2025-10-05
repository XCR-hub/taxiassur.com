<?php
// Test de diagnostic webhook - ULTRA-SIMPLE
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/html; charset=UTF-8');

echo "<h1>🔧 Diagnostic Webhook TaxiAssur</h1>";

// Test 1: PHP de base
echo "<h2>1. Test PHP</h2>";
echo "Version PHP: " . PHP_VERSION . "<br>";
echo "Extensions: " . implode(', ', get_loaded_extensions()) . "<br>";

// Test 2: Fonctions critiques
echo "<h2>2. Fonctions Critiques</h2>";
echo "json_encode: " . (function_exists('json_encode') ? 'OK' : 'MANQUANT') . "<br>";
echo "file_put_contents: " . (function_exists('file_put_contents') ? 'OK' : 'MANQUANT') . "<br>";
echo "mkdir: " . (function_exists('mkdir') ? 'OK' : 'MANQUANT') . "<br>";

// Test 3: Permissions
echo "<h2>3. Test Permissions</h2>";
$testDir = __DIR__ . '/test-write';
if (@mkdir($testDir, 0755, true)) {
    echo "Création dossier: OK<br>";
    if (@file_put_contents($testDir . '/test.txt', 'test')) {
        echo "Écriture fichier: OK<br>";
        @unlink($testDir . '/test.txt');
        @rmdir($testDir);
    } else {
        echo "Écriture fichier: ERREUR<br>";
    }
} else {
    echo "Création dossier: ERREUR<br>";
}

// Test 4: Webhook simple
echo "<h2>4. Test Webhook Simple</h2>";
try {
    $testData = ['test' => 'ok'];
    $json = json_encode($testData);
    echo "JSON encode: OK<br>";
    echo "JSON: $json<br>";
} catch (Exception $e) {
    echo "JSON encode: ERREUR - " . $e->getMessage() . "<br>";
}

// Test 5: Simulation POST
echo "<h2>5. Test POST Simulation</h2>";
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo "Méthode POST détectée<br>";
    $input = file_get_contents('php://input');
    echo "Input reçu: " . strlen($input) . " caractères<br>";
    
    if ($input) {
        $decoded = json_decode($input, true);
        if ($decoded) {
            echo "JSON décodé avec succès<br>";
            echo "Type: " . ($decoded['type'] ?? 'non défini') . "<br>";
        } else {
            echo "Erreur JSON: " . json_last_error_msg() . "<br>";
        }
    }
} else {
    echo "Méthode: " . $_SERVER['REQUEST_METHOD'] . "<br>";
    echo "<form method='post'>";
    echo "<input type='hidden' name='test' value='1'>";
    echo "<button type='submit'>Tester POST</button>";
    echo "</form>";
}

echo "<h2>6. Logs Récents</h2>";
$logFile = dirname(__DIR__) . '/logs/webhook-' . date('Y-m-d') . '.log';
if (file_exists($logFile)) {
    echo "<pre>" . htmlspecialchars(file_get_contents($logFile)) . "</pre>";
} else {
    echo "Aucun log aujourd'hui<br>";
}

echo "<p><a href='/webhooks/make.php?action=ping'>Test webhook ping</a></p>";
?>