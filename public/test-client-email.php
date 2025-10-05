<?php
// Test spécifique email client - Diagnostic approfondi
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/html; charset=UTF-8');

echo "<!DOCTYPE html><html><head><title>Test Email Client - TaxiAssur</title>";
echo "<style>body{font-family:Arial;max-width:800px;margin:0 auto;padding:20px;}";
echo ".success{background:#dcfce7;border:2px solid #16a34a;padding:15px;border-radius:8px;margin:10px 0;}";
echo ".error{background:#fee2e2;border:2px solid #dc2626;padding:15px;border-radius:8px;margin:10px 0;}";
echo ".warning{background:#fef3c7;border:2px solid #d97706;padding:15px;border-radius:8px;margin:10px 0;}";
echo ".test{background:#f8fafc;border:1px solid #e2e8f0;padding:15px;margin:10px 0;border-radius:6px;}";
echo "</style></head><body>";

echo "<h1>📧 Test Email Client - Diagnostic</h1>";

// Configuration IONOS
$config = [
    'smtp_host' => 'smtp.ionos.fr',
    'smtp_port' => 465,
    'smtp_user' => 'noreply@taxiassur.com',
    'smtp_pass' => 'Team2025!,&',
    'from_email' => 'noreply@taxiassur.com'
];

// Fonction d'envoi simplifiée pour test
function sendTestEmail($to, $subject, $message) {
    $fromEmail = 'noreply@taxiassur.com';
    $fromName = 'TaxiAssur';
    
    // Headers ultra-simples
    $headers = "From: $fromName <$fromEmail>\r\n";
    $headers .= "Reply-To: team@taxiassur.com\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    
    // Configuration SMTP
    ini_set('SMTP', 'smtp.ionos.fr');
    ini_set('smtp_port', '465');
    ini_set('sendmail_from', $fromEmail);
    
    return @mail($to, $subject, $message, $headers);
}

// Test avec différents types d'emails
$testEmails = [
    'gmail' => 'test.taxiassur@gmail.com',
    'outlook' => 'test.taxiassur@outlook.com',
    'yahoo' => 'test.taxiassur@yahoo.fr',
    'free' => 'test.taxiassur@free.fr'
];

echo "<div class='test'>";
echo "<h3>Test Emails Clients Différents</h3>";

foreach ($testEmails as $provider => $testEmail) {
    $subject = "Test TaxiAssur - $provider - " . date('H:i:s');
    $message = "Test email client pour $provider\n\nDate: " . date('d/m/Y H:i:s') . "\nExpéditeur: noreply@taxiassur.com";
    
    $sent = sendTestEmail($testEmail, $subject, $message);
    echo "$provider ($testEmail): " . ($sent ? '✅ ENVOYÉ' : '❌ ÉCHEC') . "<br>";
    
    if (!$sent) {
        $error = error_get_last();
        echo "  → Erreur: " . ($error['message'] ?? 'Inconnue') . "<br>";
    }
}
echo "</div>";

// Test avec votre vraie adresse
echo "<div class='test'>";
echo "<h3>Test avec Votre Adresse</h3>";
echo "<form method='post'>";
echo "<label>Testez avec votre email :</label><br>";
echo "<input type='email' name='test_email' placeholder='votre@email.com' required style='padding:8px;margin:10px 0;width:300px;'><br>";
echo "<button type='submit' style='padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:4px;'>Tester Mon Email</button>";
echo "</form>";

if ($_POST['test_email'] ?? false) {
    $userEmail = filter_var($_POST['test_email'], FILTER_SANITIZE_EMAIL);
    if (filter_var($userEmail, FILTER_VALIDATE_EMAIL)) {
        $subject = "✅ Test TaxiAssur - Confirmation";
        $message = "Bonjour,\n\nCeci est un test de l'email de confirmation TaxiAssur.\n\nSi vous recevez cet email, le système fonctionne parfaitement !\n\nCordialement,\nL'équipe TaxiAssur";
        
        $sent = sendTestEmail($userEmail, $subject, $message);
        
        if ($sent) {
            echo "<div class='success'>✅ Email envoyé vers $userEmail ! Vérifiez votre boîte mail.</div>";
        } else {
            echo "<div class='error'>❌ Échec envoi vers $userEmail</div>";
            $error = error_get_last();
            echo "Erreur: " . ($error['message'] ?? 'Inconnue') . "<br>";
        }
    } else {
        echo "<div class='error'>❌ Email invalide</div>";
    }
}
echo "</div>";

// Diagnostic approfondi
echo "<div class='test'>";
echo "<h3>🔍 Diagnostic Email Client</h3>";
echo "Fonction mail(): " . (function_exists('mail') ? '✅ OK' : '❌ KO') . "<br>";
echo "Filter email: " . (function_exists('filter_var') ? '✅ OK' : '❌ KO') . "<br>";
echo "JSON encode: " . (function_exists('json_encode') ? '✅ OK' : '❌ KO') . "<br>";
echo "File get contents: " . (function_exists('file_get_contents') ? '✅ OK' : '❌ KO') . "<br>";

// Test validation email
$testValidation = filter_var('test@example.com', FILTER_VALIDATE_EMAIL);
echo "Validation email: " . ($testValidation ? '✅ OK' : '❌ KO') . "<br>";

echo "</div>";

echo "<div class='warning'>";
echo "<h3>💡 Solutions Email Client</h3>";
echo "<p>Si l'email client ne part toujours pas :</p>";
echo "<ol>";
echo "<li><strong>Vérifiez</strong> que l'email client est valide (pas de typo)</li>";
echo "<li><strong>Testez</strong> avec votre propre email ci-dessus</li>";
echo "<li><strong>Vérifiez</strong> les logs IONOS pour voir l'erreur exacte</li>";
echo "<li><strong>Contactez IONOS</strong> si le problème persiste</li>";
echo "</ol>";
echo "</div>";

echo "<p><a href='/'>Retour au site</a> | <a href='?'>Relancer test</a> | <a href='/test-email.php'>Test complet</a></p>";
echo "</body></html>";
?>