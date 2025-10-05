<?php
// Script de debug pour TaxiAssur.com
header('Content-Type: text/html; charset=UTF-8');

echo "<h1>🔧 Debug TaxiAssur.com</h1>";

// Test PHP
echo "<h2>PHP</h2>";
echo "Version: " . PHP_VERSION . "<br>";
echo "Extensions: " . implode(', ', get_loaded_extensions()) . "<br>";

// Test permissions
echo "<h2>Permissions</h2>";
$dirs = ['content', 'feeds', 'api', 'assets'];
foreach ($dirs as $dir) {
    $path = __DIR__ . '/' . $dir;
    if (is_dir($path)) {
        echo "$dir: " . (is_writable($path) ? '✅ Écriture OK' : '❌ Pas d\'écriture') . "<br>";
    } else {
        echo "$dir: ❌ Dossier manquant<br>";
    }
}

// Test fichiers critiques
echo "<h2>Fichiers</h2>";
$files = [
    'index.html' => 'Site principal',
    'api/lead.php' => 'API leads',
    'content/blog/assurance-taxi-2024.json' => 'Contenu blog',
    'content/faq/tarifs-assurance.json' => 'FAQ',
    'feeds/sitemap.xml' => 'Sitemap'
];

foreach ($files as $file => $desc) {
    $path = __DIR__ . '/' . $file;
    echo "$desc: " . (file_exists($path) ? '✅ Présent' : '❌ Manquant') . "<br>";
}

// Test API
echo "<h2>Test API</h2>";
echo '<form method="post" action="/api/lead.php" style="border:1px solid #ccc; padding:20px; margin:20px 0;">
    <h3>Test Formulaire</h3>
    <input type="text" name="name" placeholder="Nom" required><br><br>
    <input type="email" name="email" placeholder="Email" required><br><br>
    <input type="tel" name="phone" placeholder="Téléphone" required><br><br>
    <input type="text" name="city" placeholder="Ville" required><br><br>
    <select name="status" required>
        <option value="taxi">Taxi</option>
        <option value="vtc">VTC</option>
    </select><br><br>
    <button type="submit">Tester</button>
</form>';

echo "<h2>Logs Récents</h2>";
$logFile = __DIR__ . '/logs/leads-' . date('Y-m-d') . '.log';
if (file_exists($logFile)) {
    echo "<pre>" . htmlspecialchars(file_get_contents($logFile)) . "</pre>";
} else {
    echo "Aucun log aujourd'hui<br>";
}
?>