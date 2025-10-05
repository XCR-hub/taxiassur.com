<?php
// Configuration Email TaxiAssur - À personnaliser selon votre hébergement IONOS
declare(strict_types=1);

// ========================================
// CONFIGURATION EMAIL IONOS
// ========================================

// Méthode 1: Variables d'environnement (Recommandé)
// À configurer dans votre panneau IONOS ou .htaccess

define('SMTP_HOST', $_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST') ?: 'smtp.ionos.fr');
define('SMTP_PORT', (int)($_ENV['SMTP_PORT'] ?? getenv('SMTP_PORT') ?: '587'));
define('SMTP_USER', $_ENV['SMTP_USER'] ?? getenv('SMTP_USER') ?: 'noreply@taxiassur.com');
define('SMTP_PASS', $_ENV['SMTP_PASS'] ?? getenv('SMTP_PASS') ?: '');

// Méthode 2: Configuration directe (Alternative)
// Décommentez et modifiez selon vos paramètres IONOS

/*
define('SMTP_HOST', 'smtp.ionos.fr');
define('SMTP_PORT', 587);
define('SMTP_USER', 'noreply@taxiassur.com');
define('SMTP_PASS', 'VotreMotDePasseEmail');
*/

// ========================================
// DESTINATAIRES
// ========================================

// Emails de notification pour les leads
define('ADMIN_EMAILS', [
    'commercial@xcr.fr',
    'tcerda@xcr.fr'
]);

// Email principal de contact
define('CONTACT_EMAIL', 'team@taxiassur.com');

// Email expéditeur par défaut
define('FROM_EMAIL', 'noreply@taxiassur.com');
define('FROM_NAME', 'TaxiAssur.com');

// ========================================
// CONFIGURATION AVANCÉE
// ========================================

// Activation du mode debug email
define('EMAIL_DEBUG', false); // Mettre à true pour debug

// Méthode d'envoi préférée
define('EMAIL_METHOD', 'php_mail'); // 'php_mail', 'smtp', 'webhook'

// Timeout pour les envois
define('EMAIL_TIMEOUT', 30);

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function getEmailConfig(): array {
    return [
        'smtp_host' => SMTP_HOST,
        'smtp_port' => SMTP_PORT,
        'smtp_user' => SMTP_USER,
        'smtp_pass' => !empty(SMTP_PASS) ? '***configuré***' : 'NON CONFIGURÉ',
        'admin_emails' => ADMIN_EMAILS,
        'from_email' => FROM_EMAIL,
        'method' => EMAIL_METHOD,
        'debug' => EMAIL_DEBUG
    ];
}

function isEmailConfigured(): bool {
    return !empty(SMTP_PASS) || function_exists('mail');
}

// Test de configuration
if (EMAIL_DEBUG) {
    echo "<pre>";
    echo "Configuration Email TaxiAssur:\n";
    print_r(getEmailConfig());
    echo "\nStatut: " . (isEmailConfigured() ? 'CONFIGURÉ' : 'NON CONFIGURÉ');
    echo "</pre>";
}
?>