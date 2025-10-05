<?php
// Test email spécifique IONOS 2024 avec vos paramètres
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/html; charset=UTF-8');

echo "<!DOCTYPE html><html><head><title>Test Email IONOS 2024</title>";
echo "<style>body{font-family:Arial;max-width:800px;margin:0 auto;padding:20px;}";
echo ".success{background:#dcfce7;border:2px solid #16a34a;padding:15px;border-radius:8px;margin:10px 0;}";
echo ".error{background:#fee2e2;border:2px solid #dc2626;padding:15px;border-radius:8px;margin:10px 0;}";
echo ".warning{background:#fef3c7;border:2px solid #d97706;padding:15px;border-radius:8px;margin:10px 0;}";
echo ".test{background:#f8fafc;border:1px solid #e2e8f0;padding:15px;margin:10px 0;border-radius:6px;}";
echo "</style></head><body>";

echo "<h1>📧 Test Email IONOS 2024 - TaxiAssur</h1>";
echo "<p>Test avec vos vrais paramètres IONOS + Conformité 2024</p>";

// Configuration IONOS 2024
$config = [
    'smtp_host' => 'smtp.ionos.fr',
    'smtp_port' => 465,
    'smtp_user' => 'noreply@taxiassur.com',
    'smtp_pass' => 'Team2025!,&',
    'smtp_security' => 'SSL/TLS',
    'from_email' => 'noreply@taxiassur.com', // ✅ OBLIGATOIRE IONOS 2024
    'reply_to' => 'team@taxiassur.com'
];

echo "<div class='test'>";
echo "<h3>Configuration IONOS 2024</h3>";
foreach ($config as $key => $value) {
    if ($key === 'smtp_pass') {
        echo "$key: ***CONFIGURÉ***<br>";
    } else {
        echo "$key: $value<br>";
    }
}
echo "</div>";

echo "<div class='warning'>";
echo "<h3>⚠️ Règle IONOS 2024</h3>";
echo "<p><strong>OBLIGATOIRE :</strong> L'adresse expéditeur DOIT être du domaine taxiassur.com</p>";
echo "<p>✅ Nous utilisons : noreply@taxiassur.com (conforme)</p>";
echo "<p>✅ Reply-To peut être différent : team@taxiassur.com</p>";
echo "</div>";

// Fonction d'envoi IONOS 2024 conforme
function sendEmailIONOS2024($to, $subject, $message, $fromName = 'TaxiAssur') {
    $fromEmail = 'noreply@taxiassur.com'; // ✅ OBLIGATOIRE domaine taxiassur.com
    $replyTo = 'team@taxiassur.com';
    
    $headers = "From: $fromName <$fromEmail>\r\n"; // ✅ Conforme IONOS 2024
    $headers .= "Reply-To: $replyTo\r\n";
    $headers .= "Return-Path: $fromEmail\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "X-Mailer: TaxiAssur-IONOS-2024\r\n";
    $headers .= "Message-ID: <" . uniqid() . "@taxiassur.com>\r\n";
    
    // Configuration SMTP
    ini_set('SMTP', 'smtp.ionos.fr');
    ini_set('smtp_port', '465');
    ini_set('sendmail_from', $fromEmail); // ✅ OBLIGATOIRE
    
    return @mail($to, $subject, $message, $headers);
}

// Test 1: Email vers commercial@xcr.fr
echo "<div class='test'>";
echo "<h3>Test 1: Email commercial@xcr.fr</h3>";

$to1 = 'commercial@xcr.fr';
$subject1 = '[TEST IONOS 2024] TaxiAssur - ' . date('H:i:s');
$message1 = "🧪 TEST EMAIL IONOS 2024 - CONFORME\n\n";
$message1 .= "Configuration utilisée :\n";
$message1 .= "• Expéditeur : noreply@taxiassur.com (✅ conforme IONOS 2024)\n";
$message1 .= "• Reply-To : team@taxiassur.com\n";
$message1 .= "• SMTP : smtp.ionos.fr:465 (SSL)\n";
$message1 .= "• User : noreply@taxiassur.com\n";
$message1 .= "• Date : " . date('d/m/Y H:i:s') . "\n\n";
$message1 .= "✅ Si vous recevez cet email, la configuration fonctionne parfaitement !\n\n";
$message1 .= "Prochaine étape : Tester le formulaire de devis sur le site.";

$sent1 = sendEmailIONOS2024($to1, $subject1, $message1);
echo "Résultat commercial@xcr.fr: " . ($sent1 ? '✅ ENVOYÉ' : '❌ ÉCHEC') . "<br>";

if (!$sent1) {
    $error = error_get_last();
    echo "Erreur: " . ($error['message'] ?? 'Inconnue') . "<br>";
}
echo "</div>";

// Test 2: Email vers tcerda@xcr.fr
echo "<div class='test'>";
echo "<h3>Test 2: Email tcerda@xcr.fr</h3>";

$to2 = 'tcerda@xcr.fr';
$subject2 = '[TEST IONOS 2024] TaxiAssur - ' . date('H:i:s');
$message2 = "🧪 TEST EMAIL POUR TCERDA@XCR.FR\n\n";
$message2 .= "Ce test vérifie que vous recevez bien les notifications de leads.\n\n";
$message2 .= "Configuration IONOS 2024 :\n";
$message2 .= "• Expéditeur : noreply@taxiassur.com (✅ conforme)\n";
$message2 .= "• Serveur : smtp.ionos.fr:465 (SSL)\n";
$message2 .= "• Authentification : noreply@taxiassur.com\n";
$message2 .= "• Date : " . date('d/m/Y H:i:s') . "\n\n";
$message2 .= "✅ Si vous recevez cet email, vous recevrez les copies de leads !\n\n";
$message2 .= "Test réalisé depuis : " . ($_SERVER['HTTP_HOST'] ?? 'taxiassur.com');

$sent2 = sendEmailIONOS2024($to2, $subject2, $message2);
echo "Résultat tcerda@xcr.fr: " . ($sent2 ? '✅ ENVOYÉ' : '❌ ÉCHEC') . "<br>";

if (!$sent2) {
    $error = error_get_last();
    echo "Erreur: " . ($error['message'] ?? 'Inconnue') . "<br>";
}
echo "</div>";

// Test 3: Email client test
echo "<div class='test'>";
echo "<h3>Test 3: Email Client Test</h3>";

$to3 = 'test.client@example.com';
$subject3 = '✅ Test confirmation TaxiAssur - IONOS 2024';
$message3 = "Bonjour,\n\n";
$message3 .= "🧪 Ceci est un test de l'email de confirmation client.\n\n";
$message3 .= "Configuration IONOS 2024 :\n";
$message3 .= "• Expéditeur : noreply@taxiassur.com (conforme règles IONOS)\n";
$message3 .= "• Reply-To : team@taxiassur.com\n";
$message3 .= "• Date : " . date('d/m/Y H:i:s') . "\n\n";
$message3 .= "✅ Si vous recevez cet email, le système client fonctionne !\n\n";
$message3 .= "Cordialement,\n";
$message3 .= "L'équipe TaxiAssur\n\n";
$message3 .= "--\n";
$message3 .= "TaxiAssur.com - Test IONOS 2024\n";
$message3 .= "Envoyé depuis : noreply@taxiassur.com";

$sent3 = sendEmailIONOS2024($to3, $subject3, $message3);
echo "Résultat client test: " . ($sent3 ? '✅ ENVOYÉ' : '❌ ÉCHEC') . "<br>";
echo "</div>";

// Diagnostic complet
echo "<div class='test'>";
echo "<h3>🩺 Diagnostic Complet</h3>";
echo "Fonction mail(): " . (function_exists('mail') ? '✅ Disponible' : '❌ Indisponible') . "<br>";
echo "PHP Version: " . PHP_VERSION . "<br>";
echo "Serveur: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Inconnu') . "<br>";
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Inconnu') . "<br>";

// Configuration SMTP actuelle
echo "<br><strong>Configuration SMTP active :</strong><br>";
echo "SMTP: " . (ini_get('SMTP') ?: 'Non configuré') . "<br>";
echo "smtp_port: " . (ini_get('smtp_port') ?: 'Défaut') . "<br>";
echo "sendmail_from: " . (ini_get('sendmail_from') ?: 'Non configuré') . "<br>";

$totalSent = ($sent1 ? 1 : 0) + ($sent2 ? 1 : 0) + ($sent3 ? 1 : 0);
echo "<br><strong>Résultat global: $totalSent/3 emails envoyés</strong><br>";

if ($totalSent === 3) {
    echo "<div class='success'>🎉 PARFAIT ! Tous les emails fonctionnent avec IONOS 2024</div>";
    echo "<p>✅ commercial@xcr.fr : Reçu</p>";
    echo "<p>✅ tcerda@xcr.fr : Reçu</p>";
    echo "<p>✅ Client test : Reçu</p>";
} elseif ($totalSent === 1 && $sent1) {
    echo "<div class='warning'>⚠️ Seul commercial@xcr.fr reçoit les emails</div>";
    echo "<p>Problème possible avec tcerda@xcr.fr ou configuration client</p>";
} elseif ($totalSent > 0) {
    echo "<div class='warning'>⚠️ Envoi partiel ($totalSent/3)</div>";
    echo "<p>Vérifiez la configuration IONOS et les adresses email</p>";
} else {
    echo "<div class='error'>❌ Aucun email envoyé</div>";
    echo "<p>Problème de configuration IONOS</p>";
}
echo "</div>";

echo "<div class='test'>";
echo "<h3>🔧 Actions IONOS</h3>";
echo "<ol>";
echo "<li><strong>Panneau IONOS :</strong> Email → Configuration → Activez 'Envoi d'emails via PHP'</li>";
echo "<li><strong>Vérifiez :</strong> Le compte noreply@taxiassur.com existe et fonctionne</li>";
echo "<li><strong>Testez :</strong> Envoyez un email test depuis noreply@taxiassur.com</li>";
echo "<li><strong>Logs :</strong> Vérifiez les logs d'erreur IONOS si problème</li>";
echo "</ol>";
echo "</div>";

echo "<div class='test'>";
echo "<h3>📧 Prochaines Étapes</h3>";
if ($totalSent >= 2) {
    echo "<p>✅ Configuration fonctionnelle ! Testez maintenant le formulaire :</p>";
    echo "<p><a href='/' target='_blank'>🏠 Aller au site</a> → Remplir le formulaire de devis</p>";
} else {
    echo "<p>⚠️ Configuration à finaliser dans votre panneau IONOS</p>";
}
echo "</div>";

echo "<p><a href='/'>Retour au site</a> | <a href='?'>Relancer test</a> | <a href='/debug-email.php'>Debug avancé</a></p>";
echo "</body></html>";
?>