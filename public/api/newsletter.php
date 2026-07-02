<?php
// API Newsletter TaxiAssur - Optimisée SEO et conversion
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

require_once __DIR__ . '/load-env.php';
require_once __DIR__ . '/smtp-mailer.php';

define('NEWSLETTER_FROM_EMAIL', env('NEWSLETTER_FROM_EMAIL', env('FROM_EMAIL', env('SMTP_USER', 'tcerda@xcr.fr'))));
define('NEWSLETTER_REPLY_TO', env('REPLY_TO_EMAIL', env('CONTACT_EMAIL', 'team@taxiassur.com')));

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

function logNewsletter($message, $data = []) {
    try {
        $logDir = dirname(__DIR__) . '/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        
        $logFile = $logDir . '/newsletter-' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $entry = "[$timestamp] [$ip] $message " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n";
        
        @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
    } catch (Throwable $e) {
        // Ignorer les erreurs de log
    }
}

function sendWelcomeEmail($email) {
    try {
        // Utiliser la fonction Supabase Edge Function pour envoyer avec pièces jointes
        return sendWelcomeEmailViaSupabase($email);
    } catch (Throwable $e) {
        logNewsletter('Welcome email error', ['error' => $e->getMessage()]);
        // Fallback: envoyer sans pièces jointes
        return sendEmailRobust($email, "✅ Bienvenue dans la Newsletter TaxiAssur !", generateWelcomeMessage(), 'TaxiAssur Newsletter');
    }
}

function sendWelcomeEmailViaSupabase($email) {
    try {
        $supabaseUrl = getenv('VITE_SUPABASE_URL') ?: 'https://drohhxrkoequjphvabvq.supabase.co';
        $supabaseKey = getenv('VITE_SUPABASE_ANON_KEY');

        if (!$supabaseKey) {
            logNewsletter('Supabase key missing, using fallback');
            return sendEmailRobust($email, "✅ Bienvenue dans la Newsletter TaxiAssur !", generateWelcomeMessage(), 'TaxiAssur Newsletter');
        }

        $emailData = [
            'to' => $email,
            'subject' => '✅ Bienvenue dans la Newsletter TaxiAssur !',
            'text' => generateWelcomeMessage(),
            'from' => [
                'email' => 'newsletter@taxiassur.com',
                'name' => 'TaxiAssur Newsletter'
            ],
            'replyTo' => 'team@taxiassur.com',
            'attachments' => []
        ];

        // TODO: Ajouter les pièces jointes quand les PDF seront créés
        // $emailData['attachments'][] = [
        //     'filename' => 'Guide-Assurance-Taxi-2024.pdf',
        //     'content' => base64_encode(file_get_contents(__DIR__ . '/../content/guides/guide-assurance-taxi-2024.pdf')),
        //     'type' => 'application/pdf'
        // ];

        $url = $supabaseUrl . '/functions/v1/send-email';

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $supabaseKey,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            logNewsletter('Welcome email sent via Supabase', ['email' => $email]);
            return true;
        } else {
            logNewsletter('Supabase email failed, using fallback', ['code' => $httpCode]);
            return sendEmailRobust($email, "✅ Bienvenue dans la Newsletter TaxiAssur !", generateWelcomeMessage(), 'TaxiAssur Newsletter');
        }
    } catch (Throwable $e) {
        logNewsletter('Supabase email error', ['error' => $e->getMessage()]);
        return sendEmailRobust($email, "✅ Bienvenue dans la Newsletter TaxiAssur !", generateWelcomeMessage(), 'TaxiAssur Newsletter');
    }
}

function generateWelcomeMessage(): string {
    $message = "Bonjour,\n\n";
    $message .= "🎉 Félicitations ! Vous êtes maintenant abonné(e) à la newsletter TaxiAssur.\n\n";
    $message .= "📬 VOUS ALLEZ RECEVOIR :\n";
    $message .= "• Actualités assurance taxi (nouvelles réglementations, évolutions tarifaires)\n";
    $message .= "• Conseils d'experts pour optimiser votre couverture\n";
    $message .= "• Guides pratiques exclusifs (PDF téléchargeables)\n";
    $message .= "• Offres spéciales réservées aux abonnés\n";
    $message .= "• Alertes importantes du secteur taxi\n\n";
    $message .= "🎁 BONUS D'INSCRIPTION (à venir dans prochain email) :\n";
    $message .= "• Guide PDF \"Assurance Taxi 2024 : Tout Savoir\"\n";
    $message .= "• Checklist \"Documents Obligatoires Taxi\"\n";
    $message .= "• Calculateur d'économies personnalisé\n";
    $message .= "• Accès prioritaire aux conseils experts\n\n";
    $message .= "📊 Rejoignez notre communauté grandissante de professionnels du taxi !\n\n";
    $message .= "❓ Questions ? Répondez à cet email ou appelez le 01 80 85 57 86\n\n";
    $message .= "📧 Fréquence : 1 email par semaine (mardi 9h)\n";
    $message .= "🚫 Pas de spam, désinscription facile en 1 clic\n\n";
    $message .= "Merci de votre confiance !\n\n";
    $message .= "L'équipe TaxiAssur.com\n";
    $message .= "Excellence Coverage Risks\n";
    $message .= "Courtier agréé ORIAS 11 061 425\n\n";
    $message .= "--\n";
    $message .= "TaxiAssur.com - Newsletter Assurance Taxi\n";
    $message .= "https://taxiassur.com/newsletter";
    
    return $message;
}

// Fonction d'envoi email robuste (copie de lead.php)
function sendEmailRobust(string $to, string $subject, string $message, string $fromName = 'TaxiAssur'): bool {
    // Validation email
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        logNewsletter('Invalid email', ['email' => $to]);
        return false;
    }
    
    // Sanitisation
    $to = filter_var($to, FILTER_SANITIZE_EMAIL);
    $subject = mb_encode_mimeheader($subject, 'UTF-8');
    // NE PAS htmlspecialchars le message - c'est du texte brut
    $fromName = str_replace(['<', '>', '"', "'"], '', $fromName);
    
    try {
        $success = sendSmtpTextEmail(
            $to,
            $subject,
            $message,
            NEWSLETTER_FROM_EMAIL,
            $fromName,
            NEWSLETTER_REPLY_TO,
            [
                'X-Mailer' => 'TaxiAssur-Newsletter-hMail',
                'X-Priority' => '1'
            ]
        );
        logNewsletter('Email sent via hMail', [
            'to' => $to,
            'success' => $success,
            'smtp_error' => $success ? null : getSmtpLastError()
        ]);
        return $success;
    } catch (Throwable $e) {
        logNewsletter('Email error', ['error' => $e->getMessage()]);
        return false;
    }
}

function sendWelcomeEmailOld($email) {
    try {
        $subject = "✅ Bienvenue dans la Newsletter TaxiAssur !";
        $message = "Bonjour,\n\n";
        $message .= "🎉 Félicitations ! Vous êtes maintenant abonné(e) à la newsletter TaxiAssur.\n\n";
        $message .= "📬 VOUS ALLEZ RECEVOIR :\n";
        $message .= "• Actualités assurance taxi (nouvelles réglementations, évolutions tarifaires)\n";
        $message .= "• Conseils d'experts pour optimiser votre couverture\n";
        $message .= "• Guides pratiques exclusifs (PDF téléchargeables)\n";
        $message .= "• Offres spéciales réservées aux abonnés\n";
        $message .= "• Alertes importantes du secteur taxi\n\n";
        $message .= "🎁 BONUS D'INSCRIPTION (à venir dans prochain email) :\n";
        $message .= "• Guide PDF \"Assurance Taxi 2024 : Tout Savoir\"\n";
        $message .= "• Checklist \"Documents Obligatoires Taxi\"\n";
        $message .= "• Calculateur d'économies personnalisé\n";
        $message .= "• Accès prioritaire aux conseils experts\n\n";
        $message .= "📊 Rejoignez notre communauté grandissante de professionnels du taxi !\n\n";
        $message .= "❓ Questions ? Répondez à cet email ou appelez le 01 80 85 57 86\n\n";
        $message .= "📧 Fréquence : 1 email par semaine (mardi 9h)\n";
        $message .= "🚫 Pas de spam, désinscription facile en 1 clic\n\n";
        $message .= "Merci de votre confiance !\n\n";
        $message .= "L'équipe TaxiAssur.com\n";
        $message .= "Excellence Coverage Risks\n";
        $message .= "Courtier agréé ORIAS 11 061 425\n\n";
        $message .= "--\n";
        $message .= "TaxiAssur.com - Newsletter Assurance Taxi\n";
        $message .= "Spécialiste assurance taxi depuis 15 ans\n";
        $message .= "https://taxiassur.com/newsletter\n\n";
        $message .= "Pour vous désinscrire : https://taxiassur.com/newsletter/unsubscribe?email=" . urlencode($email);

        return sendEmailRobust($email, $subject, $message, 'TaxiAssur Newsletter');
    } catch (Throwable $e) {
        logNewsletter('Welcome email error', ['error' => $e->getMessage()]);
        return false;
    }
}

function saveSubscriber($email, $interests = []) {
    try {
        $subscriberData = [
            'id' => uniqid('newsletter_', true),
            'email' => $email,
            'interests' => $interests,
            'subscribed_at' => date('c'),
            'source' => 'website',
            'status' => 'active',
            'ip_hash' => hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown'),
            'user_agent_hash' => hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? 'unknown')
        ];

        $subscribersDir = dirname(__DIR__) . '/content/newsletter';
        if (!is_dir($subscribersDir)) {
            @mkdir($subscribersDir, 0755, true);
        }

        $subscriberFile = $subscribersDir . '/subscriber-' . $subscriberData['id'] . '.json';
        $success = @file_put_contents($subscriberFile, json_encode($subscriberData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

        return $success !== false;
    } catch (Throwable $e) {
        logNewsletter('Save subscriber error', ['error' => $e->getMessage()]);
        return false;
    }
}

// Traitement principal
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['email'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email requis']);
        exit;
    }

    $email = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email invalide']);
        exit;
    }

    // Anti-spam basique
    if (!empty($input['honeypot'])) {
        logNewsletter('Newsletter spam detected', ['email' => $email]);
        echo json_encode(['success' => true]); // Réponse normale pour les bots
        exit;
    }

    $interests = $input['interests'] ?? ['assurance-taxi'];
    
    // Sauvegarder l'abonné
    $saved = saveSubscriber($email, $interests);
    
    // Envoyer email de bienvenue
    $welcomeSent = sendWelcomeEmail($email);
    
    // Notifier l'admin
    $adminEmails = ['team@taxiassur.com', 'tcerda@xcr.fr'];
    $adminSubject = "[TAXIASSUR] Nouvel abonné newsletter - $email";
    $adminMessage = "NOUVEL ABONNÉ NEWSLETTER\n\n";
    $adminMessage .= "Email : $email\n";
    $adminMessage .= "Intérêts : " . implode(', ', $interests) . "\n";
    $adminMessage .= "Source : " . ($input['source'] ?? 'website') . "\n";
    $adminMessage .= "Date : " . date('d/m/Y H:i:s') . "\n";
    $adminMessage .= "IP : " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . "\n\n";
    $adminMessage .= "Communauté en croissance\n\n";
    $adminMessage .= "--\nTaxiAssur Newsletter System";

    // Notifier les deux adresses admin
    foreach ($adminEmails as $adminEmail) {
        sendEmailRobust($adminEmail, $adminSubject, $adminMessage, 'TaxiAssur Newsletter');
    }

    echo json_encode([
        'success' => true,
        'message' => 'Inscription confirmée',
        'welcome_sent' => $welcomeSent,
        'subscriber_saved' => $saved
    ]);

    logNewsletter('Newsletter subscription successful', [
        'email' => $email,
        'interests' => $interests,
        'welcome_sent' => $welcomeSent,
        'saved' => $saved
    ]);

} catch (Throwable $e) {
    logNewsletter('Newsletter critical error', ['error' => $e->getMessage()]);
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Erreur temporaire. Veuillez réessayer.',
        'code' => 'INTERNAL_ERROR'
    ]);
}
?>
