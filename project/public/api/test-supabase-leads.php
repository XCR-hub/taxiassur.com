<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Configuration Supabase
$supabaseUrl = 'https://drohhxrkoequjphvabvq.supabase.co';
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';

echo "=== TEST CONNEXION SUPABASE ===\n\n";

// Test 1: Vérifier cURL
if (!function_exists('curl_init')) {
    echo "❌ ERREUR: cURL n'est pas installé\n";
    exit;
}
echo "✅ cURL est disponible\n\n";

// Test 2: Requête Supabase
$url = $supabaseUrl . '/rest/v1/leads?select=*&order=created_at.desc&limit=3';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'apikey: ' . $supabaseKey,
    'Authorization: Bearer ' . $supabaseKey,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Code HTTP: $httpCode\n\n";

if ($httpCode === 200) {
    echo "✅ CONNEXION SUPABASE RÉUSSIE\n\n";

    $data = json_decode($response, true);

    echo "Nombre de leads: " . count($data) . "\n\n";

    if (!empty($data)) {
        echo "=== PREMIER LEAD (données brutes) ===\n";
        print_r($data[0]);

        echo "\n\n=== DONNÉES FORMATÉES ===\n";
        foreach ($data as $lead) {
            echo "ID: " . ($lead['id'] ?? 'N/A') . "\n";
            echo "Nom: " . ($lead['name'] ?? 'N/A') . "\n";
            echo "Email: " . ($lead['email'] ?? 'N/A') . "\n";
            echo "Téléphone: " . ($lead['phone'] ?? 'N/A') . "\n";
            echo "Ville: " . ($lead['city'] ?? 'N/A') . "\n";
            echo "---\n";
        }
    }
} else {
    echo "❌ ERREUR CONNEXION SUPABASE\n";
    echo "Réponse: $response\n";
}
?>
