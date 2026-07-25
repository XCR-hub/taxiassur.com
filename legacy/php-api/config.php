<?php
// Legacy PHP API configuration.
// Keep this file outside public/. Secrets must come from the server environment only.

require_once __DIR__ . '/load-env.php';

if (!function_exists('env')) {
    function env($key, $default = null) {
        $value = getenv($key);
        return $value !== false ? $value : $default;
    }
}

function legacyConfigStatus(): array {
    return [
        'supabase_url_set' => !empty(env('VITE_SUPABASE_URL')),
        'supabase_key_set' => !empty(env('VITE_SUPABASE_ANON_KEY')),
        'openai_key_set' => !empty(env('VITE_OPENAI_API_KEY')) || !empty(env('OPENAI_API_KEY')),
        'serp_key_set' => !empty(env('VITE_SERP_API_KEY')) || !empty(env('SERP_API_KEY')),
        'make_secret_set' => !empty(env('VITE_MAKE_SECRET')) || !empty(env('MAKE_SECRET')),
    ];
}
?>