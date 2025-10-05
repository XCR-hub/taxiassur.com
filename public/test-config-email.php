<?php
// Test de configuration email TaxiAssur
require_once __DIR__ . '/config-email.php';

header('Content-Type: text/html; charset=UTF-8');

echo "<!DOCTYPE html><html><head><title>Test Config Email</title>";
echo "<style>body{font-family:Arial;max-width:800px;margin:0 auto;padding:20px;}";
echo ".ok{color:#16a34a;font-weight:bold;} .error{color:#dc2626;font-weight:bold;} .warning{color:#d97706;font-weight:bold;}";
echo ".box{background:#f8fafc;border:1px solid #e2e8f0;padding:15px;margin:10px 0;border-radius:6px;}";
echo "</style></head><body>";

echo "<h1>🔧 Test Configuration Email TaxiAssur</h1>";

// Test 1: Variables d'environnement
echo "<div class='box'>";
echo "<h3>1. Variables d'Environnement</h3>";
echo "SMTP_HOST: <span class='" . (SMTP_HOST ? 'ok' : 'error') . "'>" . (SMTP_HOST ?: 'NON DÉFINI') . "</span><br>";
echo "SMTP_PORT: <span class='ok'>" . SMTP_PORT . "</span><br>";
echo "SMTP_USER: <span class='" . (SMTP_USER ? 'ok' : 'error') . "'>" . (SMTP_USER ?: 'NON DÉFINI') . "</span><br>";
echo "SMTP_PASS: <span class='" . (SMTP_PASS ? 'ok' : 'error') . "'>" . (SMTP_PASS ? '***CONFIGURÉ***' : 'NON DÉFINI') . "</span><br>";
echo "</div>";

// Test 2: Emails destinataires
echo "<div class='box'>";
echo "<h3>2. Emails Destinataires</h3>";
foreach (ADMIN_EMAILS as $i => $email) {
    echo "Admin " . ($i + 1) . ": <span class='ok'>$email</span><br>";
}
echo "Contact: <span class='ok'>" . CONTACT_EMAIL . "</span><br>";
echo "From: <span class='ok'>" . FROM_EMAIL . "</span><br>";
echo "</div>";

// Test 3: Fonction mail PHP
echo "<div class='box'>";
echo "<h3>3. Fonction PHP Mail</h3>";
echo "mail() disponible: <span class='" . (function_exists('mail') ? 'ok' : 'error') . "'>" . (function_exists('mail') ? 'OUI' : 'NON') . "</span><br>";
echo "Configuration: <span class='" . (isEmailConfigured() ? 'ok' : 'error') . "'>" . (isEmailConfigured() ? 'PRÊTE' : 'INCOMPLÈTE') . "</span><br>";
echo "</div>";

// Test 4: Envoi test
echo "<div class='box'>";
echo "<h3>4. Test Envoi</h3>";

if (isEmailConfigured()) {
    $testEmail = ADMIN_EMAILS[0]; // Premier email admin
    $testSubject = 'Test Config TaxiAssur - ' . date('H:i:s');
    $testMessage = "Test de configuration email\n\nDate: " . date('d/m/Y H:i:s') . "\nConfiguration: OK";
    
    $headers = "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . CONTACT_EMAIL . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    $sent = @mail($testEmail, $testSubject, $testMessage, $headers);
    
    echo "Test envoi vers $testEmail: <span class='" . ($sent ? 'ok' : 'error') . "'>" . ($sent ? 'SUCCÈS' : 'ÉCHEC') . "</span><br>";
    
    if (!$sent) {
        $lastError = error_get_last();
        echo "Erreur: <span class='error'>" . ($lastError['message'] ?? 'Inconnue') . "</span><br>";
    }
} else {
    echo "<span class='warning'>Configuration incomplète - Test non effectué</span><br>";
}
echo "</div>";

// Instructions
echo "<div class='box'>";
echo "<h3>🎯 Instructions</h3>";
if (!isEmailConfigured()) {
    echo "<p><strong>Configuration requise :</strong></p>";
    echo "<ol>";
    echo "<li>Configurez SMTP_PASS dans votre panneau IONOS ou .htaccess</li>";
    echo "<li>Activez 'Envoi d'emails via PHP' dans IONOS</li>";
    echo "<li>Créez l'adresse noreply@taxiassur.com dans IONOS</li>";
    echo "<li>Relancez ce test</li>";
    echo "</ol>";
} else {
    echo "<p><span class='ok'>✅ Configuration complète !</span></p>";
    echo "<p>Vous pouvez maintenant tester le formulaire de devis.</p>";
}
echo "</div>";

echo "<p><a href='/'>Retour au site</a> | <a href='?'>Relancer test</a> | <a href='/test-email.php'>Test complet</a></p>";
echo "</body></html>";
?>