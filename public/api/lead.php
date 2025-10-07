<?php
// API Lead TaxiAssur.com - IONOS 2024 Compliant - Adresse expéditeur conforme
declare(strict_types=1);

// Configuration d'erreurs ULTRA-SÉCURISÉE
error_reporting(0);
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);

// Headers sécurisés TOUJOURS envoyés
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// Gestion CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit(0);
}

// Configuration email IONOS 2024 - CONFORME
define('SMTP_HOST', 'smtp.ionos.fr');
define('SMTP_PORT', 465);
define('SMTP_USER', 'noreply@taxiassur.com');
define('SMTP_PASS', 'Team2025!,&');
define('SMTP_SECURITY', 'ssl');

// IMPORTANT : Adresse expéditeur DOIT être du domaine taxiassur.com (règle IONOS 2024)
define('FROM_EMAIL', 'noreply@taxiassur.com'); // ✅ Conforme IONOS
define('FROM_NAME', 'TaxiAssur.com');
define('REPLY_TO_EMAIL', 'team@taxiassur.com'); // Peut être différent

// Emails destinataires
define('ADMIN_EMAILS', ['commercial@xcr.fr', 'tcerda@xcr.fr']);

// Fonction de log ULTRA-SÉCURISÉE
function logEmail(string $message, array $context = []): void {
    try {
        $logDir = dirname(__DIR__) . '/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        
        $logFile = $logDir . '/email-' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $entry = "[$timestamp] [$ip] $message " . json_encode($context, JSON_UNESCAPED_UNICODE) . "\n";
        
        @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
    } catch (Throwable $e) {
        // IGNORER toute erreur de log
    }
}

// Fonction d'envoi email IONOS 2024 CONFORME
function sendEmailIONOS(string $to, string $subject, string $message, string $fromName = 'TaxiAssur'): bool {
    try {
        // Validation email stricte
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            logEmail('Invalid email', ['email' => $to]);
            return false;
        }
        
        // Sanitisation complète
        $to = filter_var($to, FILTER_SANITIZE_EMAIL);
        $subject = mb_encode_mimeheader($subject, 'UTF-8');
        $fromName = mb_encode_mimeheader($fromName, 'UTF-8');
        
        // Headers IONOS 2024 CONFORMES - Expéditeur OBLIGATOIREMENT du domaine
        $headers = "From: $fromName <" . FROM_EMAIL . ">\r\n"; // ✅ noreply@taxiassur.com
        $headers .= "Reply-To: " . REPLY_TO_EMAIL . "\r\n"; // ✅ team@taxiassur.com
        $headers .= "Return-Path: " . FROM_EMAIL . "\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "Content-Transfer-Encoding: 8bit\r\n";
        $headers .= "X-Mailer: TaxiAssur-IONOS-2024\r\n";
        $headers .= "X-Priority: 1\r\n";
        $headers .= "Message-ID: <" . uniqid() . "@taxiassur.com>\r\n";
        $headers .= "Date: " . date('r') . "\r\n";
        
        // Configuration SMTP pour IONOS
        ini_set('SMTP', SMTP_HOST);
        ini_set('smtp_port', (string)SMTP_PORT);
        ini_set('sendmail_from', FROM_EMAIL); // ✅ Obligatoire IONOS
        
        // Tentative d'envoi
        $success = @mail($to, $subject, $message, $headers);
        
        logEmail('IONOS 2024 email attempt', [
            'to' => $to,
            'from' => FROM_EMAIL,
            'success' => $success,
            'smtp_host' => SMTP_HOST,
            'smtp_port' => SMTP_PORT,
            'smtp_security' => SMTP_SECURITY
        ]);
        
        return $success;
        
    } catch (Throwable $e) {
        logEmail('Email error', ['to' => $to, 'error' => $e->getMessage()]);
        return false;
    }
}

// Validation ULTRA-SÉCURISÉE
function validateLeadData(array $data): array {
    $errors = [];
    
    // Validation nom
    $name = trim($data['name'] ?? '');
    if (empty($name)) {
        $errors[] = 'Nom requis';
    } elseif (strlen($name) < 2) {
        $errors[] = 'Nom trop court';
    } elseif (!preg_match('/^[a-zA-ZÀ-ÿ\s\'-]+$/u', $name)) {
        $errors[] = 'Nom invalide';
    }
    
    // Validation email
    $email = trim($data['email'] ?? '');
    if (empty($email)) {
        $errors[] = 'Email requis';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Email invalide';
    }
    
    // Validation téléphone français
    $phone = preg_replace('/[^0-9]/', '', $data['phone'] ?? '');
    if (empty($phone)) {
        $errors[] = 'Téléphone requis';
    } elseif (!preg_match('/^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/', $phone)) {
        $errors[] = 'Numéro français requis';
    }
    
    // Validation ville
    $city = trim($data['city'] ?? '');
    if (empty($city)) {
        $errors[] = 'Ville requise';
    }
    
    // Validation statut
    $status = $data['status'] ?? '';
    if (!in_array($status, ['taxi', 'vtc', 'autre'], true)) {
        $errors[] = 'Statut invalide';
    }
    
    return $errors;
}

// TRAITEMENT PRINCIPAL
try {
    $clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    
    logEmail('API called - IONOS 2024', [
        'method' => $_SERVER['REQUEST_METHOD'],
        'ip' => $clientIP,
        'from_email' => FROM_EMAIL,
        'smtp_configured' => !empty(SMTP_PASS)
    ]);
    
    // Vérifier méthode HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        exit;
    }

    // Lire et décoder les données
    $rawInput = file_get_contents('php://input');
    if (!$rawInput) {
        http_response_code(400);
        echo json_encode(['error' => 'Aucune donnée reçue']);
        exit;
    }

    $input = json_decode($rawInput, true);
    if (!$input || json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'JSON invalide']);
        exit;
    }

    // Validation
    $validationErrors = validateLeadData($input);
    if (!empty($validationErrors)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Données invalides: ' . implode(', ', $validationErrors),
            'details' => $validationErrors
        ]);
        exit;
    }

    // Anti-spam
    if (!empty($input['company']) || !empty($input['honeypot']) || !empty($input['company_website'])) {
        logEmail('Spam detected', ['ip' => $clientIP]);
        echo json_encode(['success' => true]);
        exit;
    }

    // Sanitisation
    $name = htmlspecialchars(trim($input['name']), ENT_QUOTES, 'UTF-8');
    $email = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
    $phone = htmlspecialchars(trim($input['phone']), ENT_QUOTES, 'UTF-8');
    $city = htmlspecialchars(trim($input['city']), ENT_QUOTES, 'UTF-8');
    $status = htmlspecialchars(trim($input['status']), ENT_QUOTES, 'UTF-8');
    $immatriculation = htmlspecialchars(trim($input['immatriculation'] ?? ''), ENT_QUOTES, 'UTF-8');

    logEmail('Processing lead', ['name' => $name, 'city' => $city, 'status' => $status]);

    // === EMAIL ADMIN 1 : commercial@xcr.fr ===
    $adminSubject = "[TAXIASSUR] 🚖 Nouveau lead - $name - $city";
    $adminMessage = "🚖 NOUVELLE DEMANDE DE DEVIS TAXIASSUR\n\n";
    $adminMessage .= "=== INFORMATIONS CLIENT ===\n";
    $adminMessage .= "Nom complet : $name\n";
    $adminMessage .= "Email : $email\n";
    $adminMessage .= "Téléphone : $phone\n";
    $adminMessage .= "Ville d'activité : $city\n";
    $adminMessage .= "Statut professionnel : $status\n";
    if ($immatriculation) {
        $adminMessage .= "Immatriculation : $immatriculation\n";
    }
    $adminMessage .= "\n=== DÉTAILS TECHNIQUES ===\n";
    $adminMessage .= "Date de demande : " . date('d/m/Y H:i:s') . "\n";
    $adminMessage .= "IP client : " . $clientIP . "\n";
    $adminMessage .= "\n=== ACTIONS RECOMMANDÉES ===\n";
    $adminMessage .= "1. 📞 Rappeler le client sous 15 minutes\n";
    $adminMessage .= "2. 📋 Préparer le devis personnalisé\n";
    $adminMessage .= "3. 📧 Envoyer l'attestation si souscription\n";
    $adminMessage .= "\n--\n";
    $adminMessage .= "TaxiAssur.com - Système automatique\n";
    $adminMessage .= "Excellence Coverage Risks - ORIAS 11 061 425";

    // Envoi commercial@xcr.fr
    $commercialSent = sendEmailIONOS('commercial@xcr.fr', $adminSubject, $adminMessage, FROM_NAME);
    
    // === EMAIL ADMIN 2 : tcerda@xcr.fr ===
    $tcerdaSubject = "[TAXIASSUR] 🚖 Copie lead - $name - $city";
    $tcerdaMessage = "🚖 COPIE LEAD TAXIASSUR (pour tcerda@xcr.fr)\n\n";
    $tcerdaMessage .= "=== INFORMATIONS CLIENT ===\n";
    $tcerdaMessage .= "Nom complet : $name\n";
    $tcerdaMessage .= "Email : $email\n";
    $tcerdaMessage .= "Téléphone : $phone\n";
    $tcerdaMessage .= "Ville d'activité : $city\n";
    $tcerdaMessage .= "Statut professionnel : $status\n";
    if ($immatriculation) {
        $tcerdaMessage .= "Immatriculation : $immatriculation\n";
    }
    $tcerdaMessage .= "\n=== INFORMATIONS SYSTÈME ===\n";
    $tcerdaMessage .= "Date : " . date('d/m/Y H:i:s') . "\n";
    $tcerdaMessage .= "IP : " . $clientIP . "\n";
    $tcerdaMessage .= "Email commercial envoyé : " . ($commercialSent ? 'OUI' : 'NON') . "\n";
    $tcerdaMessage .= "\n=== SUIVI ===\n";
    $tcerdaMessage .= "Ce lead a été transmis à commercial@xcr.fr pour traitement.\n";
    $tcerdaMessage .= "Ceci est une copie pour information et suivi.\n";
    $tcerdaMessage .= "\n--\n";
    $tcerdaMessage .= "TaxiAssur.com - Système automatique\n";
    $tcerdaMessage .= "Excellence Coverage Risks";

    // Envoi tcerda@xcr.fr
    $tcerdaSent = sendEmailIONOS('tcerda@xcr.fr', $tcerdaSubject, $tcerdaMessage, FROM_NAME);

    // === EMAIL CLIENT ===
    $clientSubject = "✅ Demande confirmée ! Votre expert TaxiAssur vous recontacte rapidement";
    $clientMessage = "Bonjour $name,\n\n";
    $clientMessage .= "🎉 EXCELLENTE NOUVELLE !\n\n";
    $clientMessage .= "Votre demande de devis d'assurance taxi a été confirmée avec succès ✓\n\n";
    $clientMessage .= "🚀 PROCHAINES ÉTAPES :\n";
    $clientMessage .= "• Votre expert TaxiAssur vous recontacte sous 15 minutes\n";
    $clientMessage .= "• Analyse personnalisée de vos besoins spécifiques\n";
    $clientMessage .= "• Proposition des meilleures offres du marché\n";
    $clientMessage .= "• Économies moyennes constatées : 580€/an\n\n";
    $clientMessage .= "📋 DOCUMENTS À PRÉPARER :\n\n";
    $clientMessage .= "OBLIGATOIRES :\n";
    $clientMessage .= "• Carte professionnelle taxi en cours de validité\n";
    $clientMessage .= "• Permis de conduire (recto-verso)\n";
    $clientMessage .= "• Pièce d'identité (carte nationale ou passeport)\n";
    $clientMessage .= "• Certificat d'immatriculation du véhicule taxi\n";
    $clientMessage .= "• Relevé d'information de votre assureur précédent\n\n";
    $clientMessage .= "💡 ASTUCE PRO : Envoyez ces pièces par email à team@taxiassur.com\n";
    $clientMessage .= "pour un traitement PRIORITAIRE !\n\n";
    $clientMessage .= "❓ QUESTIONS ? Notre équipe disponible :\n";
    $clientMessage .= "☎️  01 80 85 57 86 (ligne directe)\n";
    $clientMessage .= "📧  team@taxiassur.com (réponse rapide)\n\n";
    $clientMessage .= "🏆 POURQUOI TAXIASSUR ?\n";
    $clientMessage .= "• Courtier agréé ORIAS 11 061 425\n";
    $clientMessage .= "• +100 chauffeurs nous font confiance\n";
    $clientMessage .= "• Tarifs négociés exclusifs (-35% en moyenne)\n";
    $clientMessage .= "• Service expert et réactif\n\n";
    $clientMessage .= "Merci de votre confiance !\n\n";
    $clientMessage .= "L'équipe TaxiAssur.com\n";
    $clientMessage .= "Excellence Coverage Risks\n\n";
    $clientMessage .= "--\n";
    $clientMessage .= "TaxiAssur.com - Spécialiste Assurance Taxi\n";
    $clientMessage .= "https://taxiassur.com\n\n";
    $clientMessage .= "Cet email a été envoyé depuis noreply@taxiassur.com\n";
    $clientMessage .= "Pour nous contacter : team@taxiassur.com";

    // Envoi au client avec validation stricte
    $clientSent = false;
    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $clientSent = sendEmailIONOS($email, $clientSubject, $clientMessage, FROM_NAME);
        
        // Si échec, essayer avec une méthode alternative
        if (!$clientSent) {
            logEmail('Client email failed, trying alternative method', ['email' => $email]);
            
            // Méthode alternative avec headers simplifiés
            $simpleHeaders = "From: TaxiAssur <" . FROM_EMAIL . ">\r\n";
            $simpleHeaders .= "Reply-To: " . REPLY_TO_EMAIL . "\r\n";
            $simpleHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";
            
            $clientSent = @mail($email, $clientSubject, $clientMessage, $simpleHeaders);
            logEmail('Alternative client email attempt', ['email' => $email, 'success' => $clientSent]);
        }
    } else {
        logEmail('Invalid client email', ['email' => $email]);
    }

    // === INSERTION SUPABASE ===
    $supabaseInserted = false;
    try {
        $supabaseUrl = 'https://drohhxrkoequjphvabvq.supabase.co';
        $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';

        $leadPayload = json_encode([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'city' => $city,
            'status' => $status,
            'immatriculation' => $immatriculation ?: null,
            'source' => 'website_form'
        ]);

        $ch = curl_init($supabaseUrl . '/rest/v1/leads');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $leadPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Prefer: return=minimal'
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $supabaseInserted = ($httpCode >= 200 && $httpCode < 300);

        logEmail('Supabase insert', [
            'success' => $supabaseInserted,
            'http_code' => $httpCode,
            'response' => $response
        ]);

    } catch (Throwable $e) {
        logEmail('Supabase error', ['error' => $e->getMessage()]);
    }

    // Sauvegarde lead anonymisé (backup)
    try {
        $leadData = [
            'id' => uniqid('lead_', true),
            'status' => $status,
            'city' => $city,
            'timestamp' => date('c'),
            'source' => 'website_form',
            'supabase_inserted' => $supabaseInserted,
            'emails_sent' => [
                'commercial' => $commercialSent,
                'tcerda' => $tcerdaSent,
                'client' => $clientSent
            ]
        ];

        $leadDir = dirname(__DIR__) . '/content/leads/' . date('Ym');
        if (!is_dir($leadDir)) {
            @mkdir($leadDir, 0755, true);
        }

        $leadFile = $leadDir . '/lead-' . $leadData['id'] . '.json';
        @file_put_contents($leadFile, json_encode($leadData, JSON_PRETTY_PRINT), LOCK_EX);
    } catch (Throwable $e) {
        logEmail('Lead save error', ['error' => $e->getMessage()]);
    }

    // Réponse détaillée avec statut de chaque email
    echo json_encode([
        'success' => true,
        'ok' => true,
        'message' => 'Demande traitée avec succès - IONOS 2024',
        'supabase_inserted' => $supabaseInserted,
        'email_status' => [
            'commercial_sent' => $commercialSent,
            'tcerda_sent' => $tcerdaSent,
            'client_sent' => $clientSent,
            'from_email' => FROM_EMAIL,
            'smtp_config' => [
                'host' => SMTP_HOST,
                'port' => SMTP_PORT,
                'user' => SMTP_USER,
                'security' => SMTP_SECURITY,
                'ionos_2024_compliant' => true
            ]
        ],
        'debug_info' => [
            'total_emails_attempted' => 3,
            'total_emails_sent' => ($commercialSent ? 1 : 0) + ($tcerdaSent ? 1 : 0) + ($clientSent ? 1 : 0),
            'supabase_status' => $supabaseInserted ? 'inserted' : 'failed',
            'timestamp' => date('c')
        ]
    ], JSON_PRETTY_PRINT);

    logEmail('Lead processing completed - IONOS 2024', [
        'client_email' => $email,
        'commercial_sent' => $commercialSent,
        'tcerda_sent' => $tcerdaSent,
        'client_sent' => $clientSent,
        'supabase_inserted' => $supabaseInserted,
        'from_email_used' => FROM_EMAIL,
        'ionos_compliant' => true
    ]);

} catch (Throwable $e) {
    logEmail('Critical error', [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Service temporairement indisponible',
        'success' => false,
        'debug' => [
            'php_version' => PHP_VERSION,
            'ionos_compliant' => true,
            'from_email' => FROM_EMAIL
        ]
    ]);
}
?>