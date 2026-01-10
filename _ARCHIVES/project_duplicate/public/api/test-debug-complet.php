<?php
/**
 * TEST DEBUG COMPLET - À uploader en premier
 * Ce fichier va vous montrer EXACTEMENT ce qui manque
 */

header('Content-Type: application/json');

$debug = [
    'step_1_fichier_config' => [
        'config_exists' => file_exists(__DIR__ . '/config.php'),
        'config_readable' => is_readable(__DIR__ . '/config.php'),
        'load_env_exists' => file_exists(__DIR__ . '/load-env.php'),
    ],
    'step_2_chargement' => [],
    'step_3_variables' => [],
    'step_4_conclusion' => []
];

// Étape 2 : Charger config.php
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
    $debug['step_2_chargement']['config_loaded'] = true;
    $debug['step_2_chargement']['env_function_exists'] = function_exists('env');
} else {
    $debug['step_2_chargement']['error'] = 'config.php NOT FOUND - You need to upload it!';
    echo json_encode($debug, JSON_PRETTY_PRINT);
    exit;
}

// Étape 3 : Tester les variables
$debug['step_3_variables'] = [
    'VITE_OPENAI_API_KEY' => [
        'getenv' => getenv('VITE_OPENAI_API_KEY') ?: 'NOT_SET',
        'env_function' => function_exists('env') ? (env('VITE_OPENAI_API_KEY') ?: 'NOT_SET') : 'FUNCTION_NOT_EXISTS',
        '_ENV' => $_ENV['VITE_OPENAI_API_KEY'] ?? 'NOT_SET',
        'isset' => !empty(env('VITE_OPENAI_API_KEY')) ? 'YES' : 'NO'
    ],
    'VITE_SUPABASE_URL' => [
        'getenv' => getenv('VITE_SUPABASE_URL') ?: 'NOT_SET',
        'env_function' => function_exists('env') ? (env('VITE_SUPABASE_URL') ?: 'NOT_SET') : 'FUNCTION_NOT_EXISTS',
        'isset' => !empty(env('VITE_SUPABASE_URL')) ? 'YES' : 'NO'
    ]
];

// Étape 4 : Conclusion
$openaiOk = !empty(env('VITE_OPENAI_API_KEY'));
$supabaseOk = !empty(env('VITE_SUPABASE_URL'));

if ($openaiOk && $supabaseOk) {
    $debug['step_4_conclusion'] = [
        'status' => '✅ ALL OK',
        'message' => 'config.php loaded successfully, all keys are set',
        'next_step' => 'Your generate-content.php should work now'
    ];
} else {
    $debug['step_4_conclusion'] = [
        'status' => '❌ MISSING KEYS',
        'openai_key' => $openaiOk ? 'OK' : 'MISSING',
        'supabase_url' => $supabaseOk ? 'OK' : 'MISSING',
        'action_required' => 'Check that config.php contains the API keys'
    ];
}

echo json_encode($debug, JSON_PRETTY_PRINT);
