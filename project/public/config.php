<?php
// Configuration TaxiAssur.com - ULTRA-ROBUSTE - ZÉRO erreur 500
declare(strict_types=1);

// Configuration d'erreurs ULTRA-SÉCURISÉE
error_reporting(0);
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
ini_set('ignore_repeated_errors', 1);

// Configuration de base ULTRA-SIMPLE
define('SITE_URL', $_ENV['SITE_URL'] ?? getenv('SITE_URL') ?: 'https://taxiassur.com');
define('SITE_NAME', 'TaxiAssur.com');
define('BRAND_NAME', 'TaxiAssur');
define('ADMIN_EMAIL', $_ENV['ADMIN_EMAIL'] ?? getenv('ADMIN_EMAIL') ?: 'commercial@xcr.fr');
define('MAKE_SECRET', $_ENV['MAKE_SECRET'] ?? getenv('MAKE_SECRET') ?: 'change_me_secure_token_2024');

// Configuration des chemins ULTRA-SÉCURISÉE
$baseDir = __DIR__;
define('CONTENT_DIR', $baseDir . '/content');
define('FEEDS_DIR', $baseDir . '/feeds');
define('ASSETS_DIR', $baseDir . '/assets');
define('LOG_DIR', $baseDir . '/logs');

// Configuration email ULTRA-SIMPLE
define('FROM_EMAIL', 'noreply@taxiassur.com');
define('SMTP_HOST', $_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST') ?: 'smtp.ionos.fr');
define('SMTP_PORT', $_ENV['SMTP_PORT'] ?? getenv('SMTP_PORT') ?: '465');
define('SMTP_USER', $_ENV['SMTP_USER'] ?? getenv('SMTP_USER') ?: 'noreply@taxiassur.com');
define('SMTP_PASS', $_ENV['SMTP_PASS'] ?? getenv('SMTP_PASS') ?: 'Team2025!,&');
define('SMTP_SECURITY', $_ENV['SMTP_SECURITY'] ?? getenv('SMTP_SECURITY') ?: 'ssl');

// Fonction ULTRA-SIMPLE pour obtenir variable d'environnement
function getEnvVar(string $name, string $default = ''): string {
    try {
        return $_ENV[$name] ?? getenv($name) ?: $_SERVER[$name] ?? $default;
    } catch (Throwable $e) {
        return $default;
    }
}

// Fonction ULTRA-SIMPLE pour vérifier le secret Make
function verifyMakeSecret(string $providedSecret): bool {
    try {
        $secret = MAKE_SECRET;
        return hash_equals($secret, $providedSecret);
    } catch (Throwable $e) {
        return false;
    }
}

// Fonction ULTRA-SIMPLE de logging
function logMessage(string $level, string $message, array $context = []): void {
    try {
        if (!is_dir(LOG_DIR)) {
            @mkdir(LOG_DIR, 0755, true);
        }
        
        $logFile = LOG_DIR . '/' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $contextStr = !empty($context) ? ' | ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
        
        $logEntry = "[$timestamp] [$level] [$ip] $message$contextStr\n";
        @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    } catch (Throwable $e) {
        // IGNORER toute erreur de log
    }
}

// Fonction ULTRA-SIMPLE pour créer les dossiers
function ensureDirectories(): bool {
    try {
        $dirs = [
            CONTENT_DIR,
            CONTENT_DIR . '/blog',
            CONTENT_DIR . '/faq',
            CONTENT_DIR . '/reviews', 
            CONTENT_DIR . '/offers',
            CONTENT_DIR . '/leads',
            FEEDS_DIR,
            ASSETS_DIR,
            LOG_DIR
        ];
        
        foreach ($dirs as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
        }
        return true;
    } catch (Throwable $e) {
        logMessage('ERROR', 'Erreur création dossiers', ['error' => $e->getMessage()]);
        return false;
    }
}

// Fonction ULTRA-SIMPLE pour vérifier la santé du système
function getSystemHealth(): array {
    try {
        return [
            'php_version' => PHP_VERSION,
            'php_ok' => version_compare(PHP_VERSION, '7.4.0', '>='),
            'extensions' => [
                'json' => extension_loaded('json'),
                'mbstring' => extension_loaded('mbstring'),
                'curl' => extension_loaded('curl')
            ],
            'functions' => [
                'mail' => function_exists('mail'),
                'file_get_contents' => function_exists('file_get_contents'),
                'json_encode' => function_exists('json_encode')
            ],
            'permissions' => [
                'content_writable' => is_dir(CONTENT_DIR) && is_writable(CONTENT_DIR),
                'feeds_writable' => is_dir(FEEDS_DIR) && is_writable(FEEDS_DIR)
            ],
            'timestamp' => date('c'),
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'
        ];
    } catch (Throwable $e) {
        return [
            'error' => 'Impossible de vérifier la santé du système',
            'exception' => $e->getMessage()
        ];
    }
}

// Initialisation ULTRA-SÉCURISÉE
try {
    ensureDirectories();
    logMessage('INFO', 'Configuration chargée avec succès', [
        'site_url' => SITE_URL,
        'php_version' => PHP_VERSION
    ]);
} catch (Throwable $e) {
    logMessage('ERROR', 'Erreur initialisation', ['error' => $e->getMessage()]);
}
?>