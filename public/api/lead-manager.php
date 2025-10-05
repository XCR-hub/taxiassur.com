<?php
// API Lead Manager TaxiAssur - Gestion complète des leads
declare(strict_types=1);

error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Configuration
define('LEADS_DIR', dirname(__DIR__) . '/content/leads');
define('UPLOADS_DIR', dirname(__DIR__) . '/uploads');
define('LOG_DIR', dirname(__DIR__) . '/logs');

// Fonction de log
function logLeadManager(string $message, array $context = []): void {
    try {
        if (!is_dir(LOG_DIR)) {
            @mkdir(LOG_DIR, 0755, true);
        }
        
        $logFile = LOG_DIR . '/lead-manager-' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $entry = "[$timestamp] [$ip] $message " . json_encode($context, JSON_UNESCAPED_UNICODE) . "\n";
        
        @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
    } catch (Throwable $e) {
        // Ignorer les erreurs de log
    }
}

// Fonction d'envoi email
function sendLeadEmail(string $to, string $subject, string $message, string $attachment = ''): bool {
    try {
        $headers = "From: TaxiAssur <noreply@taxiassur.com>\r\n";
        $headers .= "Reply-To: team@taxiassur.com\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        
        if ($attachment && file_exists($attachment)) {
            // Pour les attachments, utiliser une méthode plus avancée
            // Ici on se contente d'un email simple avec lien
            $message .= "\n\nVotre document est disponible en téléchargement.";
        }
        
        $success = @mail($to, $subject, $message, $headers);
        logLeadManager('Email sent', ['to' => $to, 'success' => $success]);
        return $success;
    } catch (Throwable $e) {
        logLeadManager('Email error', ['error' => $e->getMessage()]);
        return false;
    }
}

// Router principal
try {
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            // Lister tous les leads
            $leads = [];
            $currentMonth = date('Ym');
            $leadsPath = LEADS_DIR . '/' . $currentMonth;
            
            if (is_dir($leadsPath)) {
                $files = glob($leadsPath . '/lead-*.json');
                foreach ($files as $file) {
                    $data = json_decode(file_get_contents($file), true);
                    if ($data) {
                        $leads[] = $data;
                    }
                }
            }
            
            // Trier par date de création (plus récent en premier)
            usort($leads, function($a, $b) {
                return strtotime($b['createdAt'] ?? $b['timestamp'] ?? '0') - strtotime($a['createdAt'] ?? $a['timestamp'] ?? '0');
            });
            
            echo json_encode(['success' => true, 'leads' => $leads]);
            break;
            
        case 'update':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID requis']);
                exit;
            }
            
            $leadId = $input['id'];
            $newStatus = $input['leadStatus'] ?? '';
            $primeRealisee = $input['primeRealisee'] ?? null;
            $notes = $input['notes'] ?? '';
            
            // Trouver et mettre à jour le lead
            $currentMonth = date('Ym');
            $leadFile = LEADS_DIR . '/' . $currentMonth . '/lead-' . $leadId . '.json';
            
            if (file_exists($leadFile)) {
                $leadData = json_decode(file_get_contents($leadFile), true);
                
                $leadData['leadStatus'] = $newStatus;
                $leadData['updatedAt'] = date('c');
                $leadData['notes'] = $notes;
                
                if ($primeRealisee) {
                    $leadData['primeRealisee'] = floatval($primeRealisee);
                }
                
                // Ajouter timestamps selon le statut
                switch ($newStatus) {
                    case 'contacte':
                        $leadData['contactedAt'] = date('c');
                        break;
                    case 'devis_envoye':
                        $leadData['devisEnvoyeAt'] = date('c');
                        break;
                    case 'client':
                        $leadData['clientAt'] = date('c');
                        break;
                }
                
                $success = file_put_contents($leadFile, json_encode($leadData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
                
                if ($success) {
                    logLeadManager('Lead updated', ['id' => $leadId, 'status' => $newStatus]);
                    echo json_encode(['success' => true, 'message' => 'Lead mis à jour']);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'Erreur de sauvegarde']);
                }
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Lead non trouvé']);
            }
            break;
            
        case 'send_devis':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            
            $leadId = $_POST['leadId'] ?? '';
            if (!$leadId) {
                http_response_code(400);
                echo json_encode(['error' => 'Lead ID requis']);
                exit;
            }
            
            // Gérer l'upload du fichier
            $uploadedFile = '';
            if (isset($_FILES['devis']) && $_FILES['devis']['error'] === UPLOAD_ERR_OK) {
                if (!is_dir(UPLOADS_DIR)) {
                    @mkdir(UPLOADS_DIR, 0755, true);
                }
                
                $fileName = 'devis-' . $leadId . '-' . date('Y-m-d') . '.pdf';
                $uploadPath = UPLOADS_DIR . '/' . $fileName;
                
                if (move_uploaded_file($_FILES['devis']['tmp_name'], $uploadPath)) {
                    $uploadedFile = $uploadPath;
                }
            }
            
            // Trouver le lead
            $currentMonth = date('Ym');
            $leadFile = LEADS_DIR . '/' . $currentMonth . '/lead-' . $leadId . '.json';
            
            if (file_exists($leadFile)) {
                $leadData = json_decode(file_get_contents($leadFile), true);
                
                // Envoyer l'email de devis
                $subject = "Votre devis d'assurance taxi personnalisé - TaxiAssur";
                $message = "Bonjour " . ($leadData['name'] ?? 'Client') . ",\n\n";
                $message .= "Nous avons le plaisir de vous transmettre votre devis d'assurance taxi personnalisé.\n\n";
                $message .= "📋 VOTRE DEVIS PERSONNALISÉ :\n";
                $message .= "• Analysé selon votre profil et votre activité\n";
                $message .= "• Tarifs négociés exclusifs TaxiAssur\n";
                $message .= "• Garanties adaptées à vos besoins\n";
                $message .= "• Conditions préférentielles\n\n";
                $message .= "💰 ÉCONOMIES IDENTIFIÉES :\n";
                $message .= "Nous avons identifié des opportunités d'économies importantes par rapport à votre situation actuelle.\n\n";
                $message .= "📞 PROCHAINES ÉTAPES :\n";
                $message .= "1. Consultez attentivement votre devis\n";
                $message .= "2. Appelez-nous pour toute question : 01 80 85 57 86\n";
                $message .= "3. Validez votre choix pour recevoir votre contrat\n\n";
                $message .= "❓ QUESTIONS ?\n";
                $message .= "Notre équipe reste à votre disposition :\n";
                $message .= "📞 01 80 85 57 86 (ligne directe)\n";
                $message .= "📧 team@taxiassur.com\n\n";
                $message .= "Merci de votre confiance !\n\n";
                $message .= "L'équipe TaxiAssur\n";
                $message .= "Excellence Coverage Risks\n";
                $message .= "Courtier agréé ORIAS 11 061 425";
                
                $emailSent = sendLeadEmail($leadData['email'] ?? '', $subject, $message, $uploadedFile);
                
                if ($emailSent) {
                    // Mettre à jour le statut du lead
                    $leadData['leadStatus'] = 'devis_envoye';
                    $leadData['devisEnvoyeAt'] = date('c');
                    $leadData['updatedAt'] = date('c');
                    
                    file_put_contents($leadFile, json_encode($leadData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
                    
                    echo json_encode(['success' => true, 'message' => 'Devis envoyé avec succès']);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'Erreur lors de l\'envoi du devis']);
                }
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Lead non trouvé']);
            }
            break;
            
        case 'send_contract':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            
            $leadId = $_POST['leadId'] ?? '';
            if (!$leadId) {
                http_response_code(400);
                echo json_encode(['error' => 'Lead ID requis']);
                exit;
            }
            
            // Gérer l'upload du contrat
            $uploadedFile = '';
            if (isset($_FILES['contract']) && $_FILES['contract']['error'] === UPLOAD_ERR_OK) {
                if (!is_dir(UPLOADS_DIR)) {
                    @mkdir(UPLOADS_DIR, 0755, true);
                }
                
                $fileName = 'contrat-' . $leadId . '-' . date('Y-m-d') . '.pdf';
                $uploadPath = UPLOADS_DIR . '/' . $fileName;
                
                if (move_uploaded_file($_FILES['contract']['tmp_name'], $uploadPath)) {
                    $uploadedFile = $uploadPath;
                }
            }
            
            // Trouver le lead
            $currentMonth = date('Ym');
            $leadFile = LEADS_DIR . '/' . $currentMonth . '/lead-' . $leadId . '.json';
            
            if (file_exists($leadFile)) {
                $leadData = json_decode(file_get_contents($leadFile), true);
                
                // Envoyer l'email de contrat
                $subject = "🎉 Votre contrat d'assurance taxi - Bienvenue chez TaxiAssur !";
                $message = "Bonjour " . ($leadData['name'] ?? 'Client') . ",\n\n";
                $message .= "🎉 FÉLICITATIONS ! Bienvenue dans la famille TaxiAssur !\n\n";
                $message .= "Nous avons le plaisir de vous transmettre votre contrat d'assurance taxi.\n\n";
                $message .= "📋 VOTRE CONTRAT :\n";
                $message .= "• Garanties complètes adaptées à votre activité\n";
                $message .= "• Tarifs négociés exclusifs\n";
                $message .= "• Service client dédié\n";
                $message .= "• Assistance 24h/24 - 7j/7\n\n";
                $message .= "🚀 ACTIVATION IMMÉDIATE :\n";
                $message .= "Votre assurance est active dès signature du contrat.\n";
                $message .= "Votre attestation vous sera envoyée sous 2h.\n\n";
                $message .= "👨‍💼 VOTRE CONSEILLER DÉDIÉ :\n";
                $message .= "Un conseiller TaxiAssur reste votre interlocuteur privilégié pour :\n";
                $message .= "• Toutes vos questions\n";
                $message .= "• Gestion des sinistres\n";
                $message .= "• Évolution de vos besoins\n";
                $message .= "• Renouvellement de contrat\n\n";
                $message .= "📞 CONTACT PRIORITAIRE :\n";
                $message .= "01 80 85 57 86 (ligne directe clients)\n";
                $message .= "team@taxiassur.com\n\n";
                $message .= "🏆 MERCI DE VOTRE CONFIANCE !\n";
                $message .= "Vous avez fait le bon choix en rejoignant TaxiAssur.\n";
                $message .= "Nous nous engageons à vous offrir le meilleur service.\n\n";
                $message .= "Cordialement,\n";
                $message .= "L'équipe TaxiAssur\n";
                $message .= "Excellence Coverage Risks\n";
                $message .= "Courtier agréé ORIAS 11 061 425";
                
                $emailSent = sendLeadEmail($leadData['email'] ?? '', $subject, $message, $uploadedFile);
                
                if ($emailSent) {
                    // Mettre à jour le statut du lead en client
                    $leadData['leadStatus'] = 'client';
                    $leadData['clientAt'] = date('c');
                    $leadData['updatedAt'] = date('c');
                    
                    file_put_contents($leadFile, json_encode($leadData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
                    
                    echo json_encode(['success' => true, 'message' => 'Contrat envoyé, client activé']);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'Erreur lors de l\'envoi du contrat']);
                }
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Lead non trouvé']);
            }
            break;
            
        case 'request_review':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['leadId'], $input['name'], $input['email'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Données manquantes']);
                exit;
            }
            
            $leadId = $input['leadId'];
            $name = htmlspecialchars($input['name']);
            $email = filter_var($input['email'], FILTER_SANITIZE_EMAIL);
            $city = htmlspecialchars($input['city'] ?? '');
            
            // Email de demande d'avis Google
            $subject = "🌟 Votre avis nous intéresse - TaxiAssur";
            $message = "Bonjour $name,\n\n";
            $message .= "🎉 Nous espérons que vous êtes satisfait(e) de nos services TaxiAssur !\n\n";
            $message .= "📝 VOTRE AVIS COMPTE :\n";
            $message .= "Votre retour d'expérience nous aide à améliorer nos services et aide d'autres chauffeurs à nous découvrir.\n\n";
            $message .= "⭐ LAISSEZ VOTRE AVIS GOOGLE (2 minutes) :\n";
            $message .= "👉 https://g.page/r/taxiassur/review\n\n";
            $message .= "🎁 EN REMERCIEMENT :\n";
            $message .= "• Suivi prioritaire de votre dossier\n";
            $message .= "• Conseils personnalisés gratuits\n";
            $message .= "• Conditions préférentielles au renouvellement\n\n";
            $message .= "❓ BESOIN D'AIDE ?\n";
            $message .= "Notre équipe reste à votre disposition :\n";
            $message .= "📞 01 80 85 57 86\n";
            $message .= "📧 team@taxiassur.com\n\n";
            $message .= "Merci encore pour votre confiance !\n\n";
            $message .= "L'équipe TaxiAssur\n";
            $message .= "Excellence Coverage Risks\n";
            $message .= "Courtier agréé ORIAS 11 061 425\n\n";
            $message .= "--\n";
            $message .= "Cet email a été envoyé car vous êtes client TaxiAssur.\n";
            $message .= "Pour toute question : team@taxiassur.com";
            
            $reviewSent = sendSimpleEmail($email, $subject, $message);
            
            if ($reviewSent) {
                // Enregistrer la demande d'avis
                $reviewRequest = [
                    'id' => uniqid('review_request_', true),
                    'leadId' => $leadId,
                    'clientName' => $name,
                    'clientEmail' => $email,
                    'clientCity' => $city,
                    'requestedAt' => date('c'),
                    'status' => 'sent',
                    'source' => 'backoffice_manual'
                ];
                
                $reviewDir = dirname(__DIR__) . '/content/review-requests';
                if (!is_dir($reviewDir)) {
                    @mkdir($reviewDir, 0755, true);
                }
                
                $reviewFile = $reviewDir . '/request-' . $reviewRequest['id'] . '.json';
                @file_put_contents($reviewFile, json_encode($reviewRequest, JSON_PRETTY_PRINT), LOCK_EX);
                
                echo json_encode([
                    'success' => true, 
                    'message' => 'Demande d\'avis envoyée avec succès',
                    'email_sent' => true
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Erreur lors de l\'envoi de l\'email']);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Action non trouvée']);
            break;
    }
    
} catch (Throwable $e) {
    logLeadManager('Critical error', ['error' => $e->getMessage()]);
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Erreur serveur',
        'debug' => [
            'php_version' => PHP_VERSION,
            'timestamp' => date('c')
        ]
    ]);
}
?>