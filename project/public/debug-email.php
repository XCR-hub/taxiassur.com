<?php
// Debug email IONOS - Configuration et test
header('Content-Type: text/html; charset=UTF-8');

echo "<h1>🔧 Debug Email IONOS</h1>";

// Configuration email IONOS
echo "<h2>Configuration Email</h2>";
echo "mail() disponible : " . (function_exists('mail') ? 'OUI' : 'NON') . "<br>";
echo "SMTP : " . (ini_get('SMTP') ?: 'Non configuré') . "<br>";
echo "smtp_port : " . (ini_get('smtp_port') ?: '25') . "<br>";
echo "sendmail_path : " . (ini_get('sendmail_path') ?: 'Défaut') . "<br>";

// Test envoi simple
echo "<h2>Test Envoi</h2>";
$to = 'test@taxiassur.com';
$subject = 'Test IONOS ' . date('H:i:s');
$message = 'Test depuis IONOS - ' . date('d/m/Y H:i:s');
$headers = "From: TaxiAssur <noreply@taxiassur.com>";

$result = mail($to, $subject, $message, $headers);
echo "Résultat : " . ($result ? 'SUCCÈS' : 'ÉCHEC') . "<br>";

if (!$result) {
    echo "Erreur : " . (error_get_last()['message'] ?? 'Inconnue') . "<br>";
}

echo "<h2>Solution IONOS</h2>";
echo "<p>Si les emails ne partent pas :</p>";
echo "<ol>";
echo "<li>Connectez-vous à votre panneau IONOS</li>";
echo "<li>Allez dans 'Email' > 'Configuration'</li>";
echo "<li>Activez 'Envoi d'emails via PHP'</li>";
echo "<li>Configurez l'adresse expéditeur autorisée</li>";
echo "</ol>";
?>