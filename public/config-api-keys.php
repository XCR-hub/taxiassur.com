<?php
// Configuration des clés API TaxiAssur - À personnaliser selon vos services
declare(strict_types=1);

// ========================================
// CLÉS API PUBLIQUES (Frontend)
// ========================================

// Google Custom Search Engine (Partner Finder)
define('GOOGLE_CSE_API_KEY', $_ENV['GOOGLE_CSE_API_KEY'] ?? getenv('GOOGLE_CSE_API_KEY') ?: '');
define('GOOGLE_CSE_CX', $_ENV['GOOGLE_CSE_CX'] ?? getenv('GOOGLE_CSE_CX') ?: '');

// Google Maps (géolocalisation)
define('GOOGLE_MAPS_API_KEY', $_ENV['GOOGLE_MAPS_API_KEY'] ?? getenv('GOOGLE_MAPS_API_KEY') ?: '');

// Stripe (paiements)
define('STRIPE_PUBLISHABLE_KEY', $_ENV['STRIPE_PUBLISHABLE_KEY'] ?? getenv('STRIPE_PUBLISHABLE_KEY') ?: '');

// ========================================
// CLÉS API SECRÈTES (Backend uniquement)
// ========================================

// OpenAI (IA pour synthèse actualités)
define('OPENAI_SECRET_KEY', $_ENV['OPENAI_SECRET_KEY'] ?? getenv('OPENAI_SECRET_KEY') ?: '');

// Anthropic Claude (IA alternative)
define('ANTHROPIC_SECRET_KEY', $_ENV['ANTHROPIC_SECRET_KEY'] ?? getenv('ANTHROPIC_SECRET_KEY') ?: '');

// SendGrid (emails transactionnels)
define('SENDGRID_SECRET_KEY', $_ENV['SENDGRID_SECRET_KEY'] ?? getenv('SENDGRID_SECRET_KEY') ?: '');

// Mailchimp (newsletter)
define('MAILCHIMP_SECRET_KEY', $_ENV['MAILCHIMP_SECRET_KEY'] ?? getenv('MAILCHIMP_SECRET_KEY') ?: '');

// Stripe Secret (paiements)
define('STRIPE_SECRET_KEY', $_ENV['STRIPE_SECRET_KEY'] ?? getenv('STRIPE_SECRET_KEY') ?: '');

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function getApiKey(string $service): string {
    $keys = [
        'google_cse' => GOOGLE_CSE_API_KEY,
        'google_maps' => GOOGLE_MAPS_API_KEY,
        'openai' => OPENAI_SECRET_KEY,
        'anthropic' => ANTHROPIC_SECRET_KEY,
        'sendgrid' => SENDGRID_SECRET_KEY,
        'mailchimp' => MAILCHIMP_SECRET_KEY,
        'stripe_public' => STRIPE_PUBLISHABLE_KEY,
        'stripe_secret' => STRIPE_SECRET_KEY
    ];
    
    return $keys[$service] ?? '';
}

function isApiConfigured(string $service): bool {
    return !empty(getApiKey($service));
}

function getConfiguredApis(): array {
    $services = [
        'google_cse' => 'Google Custom Search',
        'google_maps' => 'Google Maps',
        'openai' => 'OpenAI',
        'anthropic' => 'Anthropic Claude',
        'sendgrid' => 'SendGrid',
        'mailchimp' => 'Mailchimp',
        'stripe_public' => 'Stripe Public',
        'stripe_secret' => 'Stripe Secret'
    ];
    
    $configured = [];
    foreach ($services as $key => $name) {
        if (isApiConfigured($key)) {
            $configured[$key] = $name;
        }
    }
    
    return $configured;
}

// ========================================
// EXEMPLES D'UTILISATION
// ========================================

/*
// Utilisation dans vos scripts PHP :

// Vérifier si une API est configurée
if (isApiConfigured('openai')) {
    // Utiliser OpenAI
    $apiKey = getApiKey('openai');
}

// Lister toutes les APIs configurées
$configuredApis = getConfiguredApis();
foreach ($configuredApis as $service => $name) {
    echo "$name est configuré\n";
}
*/

// ========================================
// SÉCURITÉ
// ========================================

// Ne jamais exposer les clés secrètes côté client
// Utilisez toujours des endpoints PHP pour les appels API sensibles

// Interface de configuration et test
if (isset($_GET['debug']) || isset($_GET['config'])) {
    header('Content-Type: text/html; charset=UTF-8');
    
    echo "<h1>Configuration APIs TaxiAssur</h1>";
    echo "<style>body{font-family:Arial;max-width:800px;margin:0 auto;padding:20px;}";
    echo ".ok{color:#16a34a;font-weight:bold;} .error{color:#dc2626;font-weight:bold;} .warning{color:#d97706;font-weight:bold;}";
    echo ".box{background:#f8fafc;border:1px solid #e2e8f0;padding:15px;margin:10px 0;border-radius:6px;}";
    echo ".code{background:#1e293b;color:#e2e8f0;padding:10px;border-radius:4px;font-family:monospace;margin:10px 0;}";
    echo "</style>";
    
    echo "<h2>APIs Configurées</h2>";
    
    $configured = getConfiguredApis();
    if (empty($configured)) {
        echo "<div class='box'>";
        echo "<p class='warning'>⚠️ Aucune API configurée</p>";
        echo "<p>Le site fonctionne en mode simulation.</p>";
        echo "</div>";
    } else {
        echo "<div class='box'>";
        foreach ($configured as $service => $name) {
            echo "<p class='ok'>✅ $name</p>";
        }
        echo "</div>";
    }
    
    echo "<h2>APIs Manquantes</h2>";
    echo "<div class='box'>";
    $allServices = [
        'google_cse' => 'Google Custom Search',
        'google_maps' => 'Google Maps',
        'openai' => 'OpenAI',
        'sendgrid' => 'SendGrid',
        'stripe_public' => 'Stripe Public',
        'stripe_secret' => 'Stripe Secret'
    ];
    
    foreach ($allServices as $service => $name) {
        if (!isApiConfigured($service)) {
            echo "<p class='error'>❌ $name non configuré</p>";
        }
    }
    echo "</div>";
    
    echo "<h2>🔧 Configuration</h2>";
    echo "<div class='box'>";
    echo "<h3>Méthode 1 : Fichier .env</h3>";
    echo "<div class='code'>";
    echo "# Créez un fichier .env à la racine<br>";
    echo "VITE_CSE_API_KEY=AIzaSyC...<br>";
    echo "VITE_CSE_CX=017576662...<br>";
    echo "OPENAI_SECRET_KEY=sk-...<br>";
    echo "SENDGRID_SECRET_KEY=SG....<br>";
    echo "</div>";
    
    echo "<h3>Méthode 2 : Panneau IONOS</h3>";
    echo "<p>Variables d'environnement → Ajouter les clés ci-dessus</p>";
    
    echo "<h3>Méthode 3 : .htaccess</h3>";
    echo "<div class='code'>";
    echo "SetEnv VITE_CSE_API_KEY \"AIzaSyC...\"<br>";
    echo "SetEnv VITE_CSE_CX \"017576662...\"<br>";
    echo "SetEnv OPENAI_SECRET_KEY \"sk-...\"<br>";
    echo "</div>";
    echo "</div>";
    
    echo "<h2>🧪 Tests</h2>";
    echo "<div class='box'>";
    echo "<p><a href='/backoffice/partner-finder'>Test Partner Finder</a></p>";
    echo "<p><a href='/backoffice/news'>Test IA Actualités</a></p>";
    echo "<p><a href='/'>Retour au site</a></p>";
    echo "</div>";
    
    echo "<h2>📞 Support</h2>";
    echo "<div class='box'>";
    echo "<p>Questions ? team@taxiassur.com | 01 80 85 57 86</p>";
    echo "</div>";
    
    exit;
}
?>