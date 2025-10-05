<?php
// Test d'envoi email TaxiAssur - Diagnostic complet
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/html; charset=UTF-8');

echo "<!DOCTYPE html><html><head><title>Test Email TaxiAssur</title>";
echo "<style>body{font-family:Arial;max-width:800px;margin:0 auto;padding:20px;}";
echo ".success{background:#dcfce7;border:2px solid #16a34a;padding:15px;border-radius:8px;margin:10px 0;}";
echo ".error{background:#fee2e2;border:2px solid #dc2626;padding:15px;border-radius:8px;margin:10px 0;}";
echo ".test{background:#f8fafc;border:1px solid #e2e8f0;padding:15px;margin:10px 0;border-radius:6px;}";
echo "</style></head><body>";

echo "<h1>🧪 Test Email TaxiAssur</h1>";

// Test 1: Configuration PHP mail
echo "<div class='test'>";
echo "<h3>1. Configuration PHP Mail</h3>";
echo "Fonction mail() : " . (function_exists('mail') ? '✅ Disponible' : '❌ Indisponible') . "<br>";
echo "SMTP configuré : " . (ini_get('SMTP') ? '✅ ' . ini_get('SMTP') : '❌ Non configuré') . "<br>";
echo "Port SMTP : " . (ini_get('smtp_port') ? ini_get('smtp_port') : 'Défaut (25)') . "<br>";
echo "</div>";

// Test 2: Envoi email simple
echo "<div class='test'>";
echo "<h3>2. Test Envoi Simple</h3>";

$testEmail = 'test@taxiassur.com'; // Email de test
$testSubject = 'Test TaxiAssur - ' . date('H:i:s');
$testMessage = "Test d'envoi depuis TaxiAssur.com\n\nDate: " . date('d/m/Y H:i:s') . "\nServeur: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Inconnu');

$headers = "From: TaxiAssur Test <noreply@taxiassur.com>\r\n";
$headers .= "Reply-To: team@taxiassur.com\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = @mail($testEmail, $testSubject, $testMessage, $headers);

if ($sent) {
    echo "<div class='success'>✅ Email de test envoyé avec succès !</div>";
} else {
    echo "<div class='error'>❌ Échec envoi email de test</div>";
    echo "Erreur possible : " . error_get_last()['message'] ?? 'Inconnue';
}
echo "</div>";

// Test 3: Simulation lead complet
echo "<div class='test'>";
echo "<h3>3. Test Lead Complet</h3>";

$leadData = [
    'name' => 'Test Client',
    'email' => 'test.client@example.com',
    'phone' => '0123456789',
    'city' => 'Paris',
    'status' => 'taxi'
];

// Emails admin
$adminEmails = ['commercial@xcr.fr', 'tcerda@xcr.fr'];
$adminSubject = "[TAXIASSUR TEST] Nouveau lead - Test Client - Paris";
$adminMessage = "TEST LEAD TAXIASSUR\n\nNom: Test Client\nEmail: test.client@example.com\nTéléphone: 0123456789\nVille: Paris\nStatut: taxi\n\nCeci est un test du système.";

$adminResults = [];
foreach ($adminEmails as $adminEmail) {
    $sent = @mail($adminEmail, $adminSubject, $adminMessage, $headers);
    $adminResults[$adminEmail] = $sent;
    echo "Admin $adminEmail : " . ($sent ? '✅ Envoyé' : '❌ Échec') . "<br>";
}

// Email client
$clientSubject = "✅ Test - Demande confirmée TaxiAssur";
$clientMessage = "Bonjour Test Client,\n\nVotre demande de test a été confirmée.\n\nCeci est un email de test du système TaxiAssur.\n\nCordialement,\nL'équipe TaxiAssur";

$clientSent = @mail($leadData['email'], $clientSubject, $clientMessage, $headers);
echo "Client {$leadData['email']} : " . ($clientSent ? '✅ Envoyé' : '❌ Échec') . "<br>";

echo "</div>";

// Test 4: Diagnostic serveur
echo "<div class='test'>";
echo "<h3>4. Diagnostic Serveur Email</h3>";
echo "Serveur : " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Inconnu') . "<br>";
echo "PHP Version : " . PHP_VERSION . "<br>";
echo "Sendmail : " . (ini_get('sendmail_path') ? ini_get('sendmail_path') : 'Non configuré') . "<br>";
echo "Mail log : " . (ini_get('mail.log') ? ini_get('mail.log') : 'Non configuré') . "<br>";
echo "</div>";

// Test 5: Logs récents
echo "<div class='test'>";
echo "<h3>5. Logs Email Récents</h3>";
$logFile = dirname(__DIR__) . '/logs/email-' . date('Y-m-d') . '.log';
if (file_exists($logFile)) {
    echo "<pre style='background:#f1f5f9;padding:10px;border-radius:4px;font-size:12px;max-height:200px;overflow-y:auto;'>";
    echo htmlspecialchars(file_get_contents($logFile));
    echo "</pre>";
} else {
    echo "Aucun log email aujourd'hui<br>";
}
echo "</div>";

echo "<div class='test'>";
echo "<h2>🎯 Résumé</h2>";
$totalSuccess = array_sum($adminResults) + ($clientSent ? 1 : 0);
$totalAttempts = count($adminResults) + 1;

if ($totalSuccess === $totalAttempts) {
    echo "<div class='success'>🎉 TOUS LES EMAILS FONCTIONNENT ! ($totalSuccess/$totalAttempts)</div>";
} else {
    echo "<div class='error'>⚠️ Problème détecté ($totalSuccess/$totalAttempts emails envoyés)</div>";
    echo "<p><strong>Solutions :</strong></p>";
    echo "<ul>";
    echo "<li>Vérifiez la configuration SMTP dans votre panneau IONOS</li>";
    echo "<li>Activez l'envoi d'emails dans les paramètres PHP</li>";
    echo "<li>Contactez le support IONOS si le problème persiste</li>";
    echo "</ul>";
}
echo "</div>";

echo "<p><a href='/'>Retour au site</a> | <a href='?'>Relancer test</a></p>";
echo "</body></html>";
?>