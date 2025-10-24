<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$diagnostic = [
    'config_file' => [
        'exists' => file_exists(__DIR__ . '/config.php'),
        'readable' => is_readable(__DIR__ . '/config.php'),
        'path' => __DIR__ . '/config.php',
    ],
    'env_check' => [
        'function_exists' => function_exists('env'),
        'getenv_vite_openai' => getenv('VITE_OPENAI_API_KEY') ?: 'NOT_SET',
        'getenv_openai' => getenv('OPENAI_API_KEY') ?: 'NOT_SET',
        '_ENV_vite_openai' => $_ENV['VITE_OPENAI_API_KEY'] ?? 'NOT_SET',
        '_ENV_openai' => $_ENV['OPENAI_API_KEY'] ?? 'NOT_SET',
        '_SERVER_vite_openai' => $_SERVER['VITE_OPENAI_API_KEY'] ?? 'NOT_SET',
        '_SERVER_openai' => $_SERVER['OPENAI_API_KEY'] ?? 'NOT_SET',
    ],
];

// Essayer de charger config.php
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';

    $diagnostic['after_config_load'] = [
        'getenv_vite_openai' => getenv('VITE_OPENAI_API_KEY') ?: 'NOT_SET',
        'getenv_openai' => getenv('OPENAI_API_KEY') ?: 'NOT_SET',
        'function_env_exists' => function_exists('env'),
        'env_vite_openai' => function_exists('env') ? (env('VITE_OPENAI_API_KEY') ?: 'NOT_SET') : 'env() not available',
        'env_openai' => function_exists('env') ? (env('OPENAI_API_KEY') ?: 'NOT_SET') : 'env() not available',
    ];
} else {
    $diagnostic['error'] = 'config.php not found at: ' . __DIR__ . '/config.php';
}

echo json_encode($diagnostic, JSON_PRETTY_PRINT);
