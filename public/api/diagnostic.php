<?php
// Charger les variables d'environnement
require_once __DIR__ . '/load-env.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Diagnostic complet du système
$diagnostic = [
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
];

// Test 1 : Fonctions PHP
$diagnostic['php_functions'] = [
    'curl' => function_exists('curl_init'),
    'json' => function_exists('json_encode'),
    'file_get_contents' => function_exists('file_get_contents'),
    'getenv' => function_exists('getenv'),
    'putenv' => function_exists('putenv'),
];

// Test 2 : Fichier .env
$envPaths = [
    __DIR__ . '/../.env',
    __DIR__ . '/../../.env',
    $_SERVER['DOCUMENT_ROOT'] . '/.env',
];

$diagnostic['env_file'] = [];
foreach ($envPaths as $path) {
    $exists = file_exists($path);
    $readable = $exists ? is_readable($path) : false;
    $diagnostic['env_file'][$path] = [
        'exists' => $exists,
        'readable' => $readable,
        'size' => $exists ? filesize($path) : 0
    ];
}

// Test 3 : Variables d'environnement chargées
$requiredVars = [
    'VITE_OPENAI_API_KEY',
    'VITE_SERP_API_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_GOOGLE_CSE_API_KEY',
];

$diagnostic['env_vars'] = [];
foreach ($requiredVars as $var) {
    $value = env($var);
    $diagnostic['env_vars'][$var] = [
        'loaded' => !empty($value),
        'length' => $value ? strlen($value) : 0,
        'prefix' => $value && strlen($value) > 10 ? substr($value, 0, 10) . '...' : 'EMPTY'
    ];
}

// Test 4 : Connexion Supabase
$supabaseUrl = env('VITE_SUPABASE_URL');
$supabaseKey = env('VITE_SUPABASE_ANON_KEY');

if ($supabaseUrl && $supabaseKey) {
    $ch = curl_init($supabaseUrl . '/rest/v1/leads?select=count');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $diagnostic['supabase_connection'] = [
        'url' => substr($supabaseUrl, 0, 30) . '...',
        'http_code' => $httpCode,
        'success' => $httpCode === 200,
        'error' => $curlError ?: null,
        'response_preview' => $httpCode === 200 ? 'Connected OK' : substr($response, 0, 100)
    ];
} else {
    $diagnostic['supabase_connection'] = [
        'error' => 'Missing Supabase credentials',
        'url_exists' => !empty($supabaseUrl),
        'key_exists' => !empty($supabaseKey)
    ];
}

// Test 5 : Connexion OpenAI
$openaiKey = env('VITE_OPENAI_API_KEY') ?: env('OPENAI_API_KEY');

if ($openaiKey) {
    $ch = curl_init('https://api.openai.com/v1/models');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $openaiKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $diagnostic['openai_connection'] = [
        'http_code' => $httpCode,
        'success' => $httpCode === 200,
        'key_prefix' => substr($openaiKey, 0, 7) . '...'
    ];
} else {
    $diagnostic['openai_connection'] = [
        'error' => 'OpenAI key not found'
    ];
}

// Test 6 : Test de récupération des leads
if ($supabaseUrl && $supabaseKey) {
    $ch = curl_init($supabaseUrl . '/rest/v1/leads?select=id,email,created_at&order=created_at.desc&limit=5');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        $leads = json_decode($response, true);
        $diagnostic['leads_test'] = [
            'http_code' => $httpCode,
            'success' => true,
            'count' => count($leads),
            'sample' => array_map(function($lead) {
                return [
                    'id' => $lead['id'],
                    'email' => substr($lead['email'], 0, 3) . '***',
                    'created_at' => $lead['created_at']
                ];
            }, $leads)
        ];
    } else {
        $diagnostic['leads_test'] = [
            'http_code' => $httpCode,
            'success' => false,
            'error' => $response
        ];
    }
}

// Résumé
$diagnostic['summary'] = [
    'overall_status' =>
        ($diagnostic['supabase_connection']['success'] ?? false) &&
        ($diagnostic['openai_connection']['success'] ?? false)
        ? 'OK' : 'ERRORS',
    'supabase' => $diagnostic['supabase_connection']['success'] ?? false ? 'OK' : 'ERROR',
    'openai' => $diagnostic['openai_connection']['success'] ?? false ? 'OK' : 'ERROR',
    'leads_accessible' => ($diagnostic['leads_test']['success'] ?? false) ? 'OK' : 'ERROR',
];

echo json_encode($diagnostic, JSON_PRETTY_PRINT);
