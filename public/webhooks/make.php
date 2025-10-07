<?php
// Webhook TaxiAssur.com - ULTRA-ROBUSTE - ZÉRO erreur 500
// Configuration de base pour éviter TOUTE erreur

error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Headers de sécurité de base - TOUJOURS envoyés
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-MAKE-SECRET');

// Gestion des requêtes OPTIONS - JAMAIS d'erreur
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit(0);
}

// Configuration de base - ULTRA-SÉCURISÉE
define('CONTENT_DIR', __DIR__ . '/../content');
define('FEEDS_DIR', __DIR__ . '/../feeds');
define('LOG_DIR', __DIR__ . '/logs');

// Fonction de logging ULTRA-SIMPLE - ne peut JAMAIS planter
function logError($message, $context = []) {
    try {
        $logFile = LOG_DIR . '/error-' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        $entry = "[$timestamp] $message " . json_encode($context) . "\n";
        
        if (!is_dir(LOG_DIR)) {
            @mkdir(LOG_DIR, 0755, true);
        }
        
        @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
    } catch (Throwable $e) {
        // IGNORER toute erreur de log
    }
}

// Fonction pour écrire JSON de façon ULTRA-SÉCURISÉE
function writeJsonFile($path, $data) {
    try {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            logError('JSON encode failed', ['path' => $path]);
            return false;
        }
        
        $result = @file_put_contents($path, $json, LOCK_EX);
        return $result !== false;
    } catch (Throwable $e) {
        logError('Write file failed', ['path' => $path, 'error' => $e->getMessage()]);
        return false;
    }
}

// Fonction d'envoi d'email ULTRA-SIMPLE
function sendSimpleEmail($to, $subject, $message) {
    try {
        $headers = "From: TaxiAssur <noreply@taxiassur.com>\r\n";
        $headers .= "Reply-To: team@taxiassur.com\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        
        $success = @mail($to, $subject, $message, $headers);
        logError('Email sent', ['to' => $to, 'success' => $success]);
        return $success;
    } catch (Throwable $e) {
        logError('Email failed', ['error' => $e->getMessage()]);
        return false;
    }
}

// Validation ULTRA-SIMPLE des données
function validateLead($data) {
    $required = ['name', 'email', 'phone', 'city', 'status'];
    
    foreach ($required as $field) {
        if (empty($data[$field])) {
            return "Champ requis manquant: $field";
        }
    }
    
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        return "Email invalide";
    }
    
    if (strlen($data['name']) < 2) {
        return "Nom trop court";
    }
    
    return null;
}

// Router principal ULTRA-SIMPLIFIÉ
try {
    $action = $_GET['action'] ?? 'ping';

    switch ($action) {
        case 'ping':
            $permissions = [
                'content_dir_exists' => is_dir(CONTENT_DIR),
                'content_dir_writable' => is_writable(CONTENT_DIR),
                'feeds_dir_exists' => is_dir(FEEDS_DIR),
                'feeds_dir_writable' => is_writable(FEEDS_DIR),
                'log_dir_exists' => is_dir(LOG_DIR),
                'log_dir_writable' => is_writable(LOG_DIR),
                'php_version' => PHP_VERSION,
                'mail_available' => function_exists('mail')
            ];

            echo json_encode([
                'ok' => true,
                'message' => 'Webhook accessible',
                'timestamp' => date('c'),
                'version' => '1.0',
                'diagnostics' => $permissions
            ]);
            break;
            
        case 'lead':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON']);
                exit;
            }
            
            // Anti-spam basique
            if (!empty($input['honeypot']) || !empty($input['company'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Spam detected']);
                exit;
            }
            
            // Validation
            $validationError = validateLead($input);
            if ($validationError) {
                http_response_code(400);
                echo json_encode(['error' => $validationError]);
                exit;
            }
            
            // Sanitisation
            $name = htmlspecialchars(trim($input['name']));
            $email = filter_var($input['email'], FILTER_SANITIZE_EMAIL);
            $phone = htmlspecialchars(trim($input['phone']));
            $city = htmlspecialchars(trim($input['city']));
            $status = htmlspecialchars(trim($input['status']));
            $immatriculation = htmlspecialchars(trim($input['immatriculation'] ?? ''));
            
            // Email admin
            $adminEmail = 'commercial@xcr.fr';
            $adminSubject = "[TAXIASSUR] Nouveau lead - $name - $city";
            $adminMessage = "NOUVELLE DEMANDE TAXIASSUR\n\n";
            $adminMessage .= "Nom: $name\n";
            $adminMessage .= "Email: $email\n";
            $adminMessage .= "Téléphone: $phone\n";
            $adminMessage .= "Ville: $city\n";
            $adminMessage .= "Statut: $status\n";
            if ($immatriculation) {
                $adminMessage .= "Immatriculation: $immatriculation\n";
            }
            $adminMessage .= "Date: " . date('d/m/Y H:i:s') . "\n";
            
            $adminSent = sendSimpleEmail($adminEmail, $adminSubject, $adminMessage);
            
            // Email client
            $clientSubject = "Demande confirmée ! Votre expert TaxiAssur vous recontacte rapidement";
            $clientMessage = "Bonjour $name,\n\n";
            $clientMessage .= "Votre demande de devis a été confirmée avec succès ✓\n\n";
            $clientMessage .= "Votre expert TaxiAssur vous recontacte rapidement pour personnaliser votre offre.\n\n";
            $clientMessage .= "Documents à préparer :\n";
            $clientMessage .= "• Carte professionnelle taxi\n";
            $clientMessage .= "• Permis de conduire\n";
            $clientMessage .= "• Carte d'identité\n";
            $clientMessage .= "• Carte grise du véhicule\n";
            $clientMessage .= "• Relevé d'information assureur précédent\n\n";
            $clientMessage .= "Questions ? 01 80 85 57 86\n\n";
            $clientMessage .= "L'équipe TaxiAssur.com\n";
            $clientMessage .= "Excellence Coverage Risks";
            
            $clientSent = sendSimpleEmail($email, $clientSubject, $clientMessage);
            
            // Sauvegarde lead anonymisé
            $leadData = [
                'id' => uniqid(),
                'status' => $status,
                'city' => $city,
                'timestamp' => date('c'),
                'source' => 'website'
            ];
            
            $leadDir = CONTENT_DIR . '/leads/' . date('Ym');
            $leadFile = "$leadDir/lead-{$leadData['id']}.json";
            writeJsonFile($leadFile, $leadData);
            
            if ($adminSent && $clientSent) {
                echo json_encode(['ok' => true, 'message' => 'Lead processed']);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Email sending failed']);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Action not found']);
            break;
    }
    
} catch (Throwable $e) {
    logError('Webhook error', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>