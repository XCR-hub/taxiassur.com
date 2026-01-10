<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Test 1: Vérifier que PHP fonctionne
$tests = [
    'php_version' => PHP_VERSION,
    'curl_available' => function_exists('curl_init'),
    'json_available' => function_exists('json_encode'),
];

// Test 2: Vérifier les variables d'environnement
$openaiKey = getenv('VITE_OPENAI_API_KEY') ?: getenv('OPENAI_API_KEY') ?: '';

$tests['env_check'] = [
    'VITE_OPENAI_API_KEY' => !empty(getenv('VITE_OPENAI_API_KEY')) ? 'Found (hidden)' : 'NOT FOUND',
    'OPENAI_API_KEY' => !empty(getenv('OPENAI_API_KEY')) ? 'Found (hidden)' : 'NOT FOUND',
    'key_length' => strlen($openaiKey) > 0 ? strlen($openaiKey) . ' chars' : '0 (EMPTY!)',
    'key_prefix' => strlen($openaiKey) > 10 ? substr($openaiKey, 0, 7) . '...' : 'TOO SHORT'
];

// Test 3: Tester l'API OpenAI avec une requête simple
if (!empty($openaiKey)) {
    $ch = curl_init('https://api.openai.com/v1/models');

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $openaiKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $tests['api_test'] = [
        'http_code' => $httpCode,
        'curl_error' => $curlError ?: 'None',
        'api_reachable' => $httpCode === 200,
        'response_sample' => $httpCode === 200 ? 'API OK' : substr($response, 0, 200)
    ];
} else {
    $tests['api_test'] = 'SKIPPED - No API key found';
}

// Test 4: Variables $_ENV et $_SERVER
$tests['all_env_vars'] = [
    'SERVER_env_count' => count($_SERVER),
    'ENV_count' => count($_ENV),
    'getenv_works' => getenv('PATH') ? 'Yes' : 'No',
    'sample_vars' => array_keys(array_slice($_SERVER, 0, 5))
];

echo json_encode([
    'success' => true,
    'tests' => $tests,
    'message' => 'Diagnostic complet - Vérifiez les résultats'
], JSON_PRETTY_PRINT);
