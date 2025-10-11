<?php
/**
 * Configuration API - Fallback si .env ne fonctionne pas
 * Ce fichier est chargé en priorité pour définir les clés API
 */

// Ne charger ce fichier qu'une seule fois
if (defined('API_CONFIG_LOADED')) {
    return;
}
define('API_CONFIG_LOADED', true);

// Charger d'abord load-env.php
if (file_exists(__DIR__ . '/load-env.php')) {
    require_once __DIR__ . '/load-env.php';
}

// Fonction pour définir une variable (FORCE l'écrasement)
function setEnvIfNotExists($key, $value) {
    if (!empty($value)) {
        putenv("$key=$value");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

// Configuration Supabase
setEnvIfNotExists('VITE_SUPABASE_URL', 'https://drohhxrkoequjphvabvq.supabase.co');
setEnvIfNotExists('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg');
setEnvIfNotExists('VITE_SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik');

// Configuration OpenAI
setEnvIfNotExists('VITE_OPENAI_API_KEY', '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');
setEnvIfNotExists('OPENAI_API_KEY', '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');

// Configuration SERP API
setEnvIfNotExists('VITE_SERP_API_KEY', '420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202');
setEnvIfNotExists('SERP_API_KEY', '420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202');

// Configuration Google
setEnvIfNotExists('VITE_GOOGLE_CSE_API_KEY', 'AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o');
setEnvIfNotExists('VITE_GOOGLE_CSE_CX', '73ba86b5aae9b4add');

// Fonction helper (redéfinir si load-env.php n'a pas été chargé)
if (!function_exists('env')) {
    function env($key, $default = null) {
        $value = getenv($key);
        if ($value === false) {
            return $default;
        }
        return $value;
    }
}

// Log pour debug (optionnel)
if (isset($_GET['debug']) && $_GET['debug'] === 'config') {
    header('Content-Type: application/json');
    echo json_encode([
        'config_loaded' => true,
        'supabase_url_set' => !empty(env('VITE_SUPABASE_URL')),
        'supabase_key_set' => !empty(env('VITE_SUPABASE_ANON_KEY')),
        'openai_key_set' => !empty(env('VITE_OPENAI_API_KEY')),
        'serp_key_set' => !empty(env('VITE_SERP_API_KEY')),
    ]);
    exit;
}
