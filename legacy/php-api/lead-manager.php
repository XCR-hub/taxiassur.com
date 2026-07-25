<?php
// Charger les variables d'environnement depuis .env
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$supabaseUrl = env('VITE_SUPABASE_URL') ?: 'https://drohhxrkoequjphvabvq.supabase.co';
$supabaseKey = env('VITE_SUPABASE_ANON_KEY') ?: '';

// Debug mode (retirer après tests)
$debugMode = isset($_GET['debug']) && $_GET['debug'] === 'true';

if ($debugMode) {
    error_log("🔍 LeadManager Debug:");
    error_log("Supabase URL: " . $supabaseUrl);
    error_log("Supabase Key exists: " . (!empty($supabaseKey) ? 'YES (' . strlen($supabaseKey) . ' chars)' : 'NO'));
}

function sendEmail($emailData) {
    global $supabaseUrl, $supabaseKey;

    $url = $supabaseUrl . '/functions/v1/send-email';

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);

    $headers = [
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ];

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($emailData));
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    curl_close($ch);

    if ($httpCode === 200) {
        $result = json_decode($response, true);
        return [
            'success' => true,
            'data' => $result
        ];
    } else {
        return [
            'success' => false,
            'error' => 'HTTP ' . $httpCode . ': ' . $response
        ];
    }
}

function supabaseRequest($method, $endpoint, $data = null) {
    global $supabaseUrl, $supabaseKey;

    $url = $supabaseUrl . '/rest/v1/' . $endpoint;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    $headers = [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json',
        'Prefer: return=representation'
    ];

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'code' => $httpCode,
        'data' => json_decode($response, true)
    ];
}

// Récupérer l'action depuis GET ou POST
$action = $_GET['action'] ?? null;

// Si pas dans GET, essayer dans POST (JSON)
if (!$action && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? ($_POST['action'] ?? 'list');
}

if (!$action) {
    $action = 'list';
}

try {
    switch ($action) {
        case 'list':
            // Vérifier que Supabase est configuré
            if (empty($supabaseKey)) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Supabase configuration missing',
                    'debug' => [
                        'supabase_url' => !empty($supabaseUrl),
                        'supabase_key' => false,
                        'message' => 'Check .env file and load-env.php'
                    ]
                ]);
                break;
            }

            $result = supabaseRequest('GET', 'leads?select=*&order=created_at.desc');

            if ($debugMode) {
                error_log("Supabase response code: " . $result['code']);
                error_log("Supabase response: " . json_encode($result['data']));
            }

            if ($result['code'] === 200) {
                $leads = $result['data'];

                $formattedLeads = array_map(function($lead) {
                    return [
                        'id' => $lead['id'] ?? null,
                        'name' => $lead['name'] ?? 'Lead anonyme',
                        'email' => $lead['email'] ?? '',
                        'phone' => $lead['phone'] ?? '',
                        'city' => $lead['city'] ?? '',
                        'status' => $lead['status'] ?? 'taxi',
                        'immatriculation' => $lead['immatriculation'] ?? 'Non renseignée',
                        'leadStatus' => $lead['lead_status'] ?? 'nouveau',
                        'createdAt' => $lead['created_at'] ?? date('c'),
                        'updatedAt' => $lead['updated_at'] ?? null,
                        'contactedAt' => $lead['contacted_at'] ?? null,
                        'devisEnvoyeAt' => $lead['devis_envoye_at'] ?? null,
                        'clientAt' => $lead['client_at'] ?? null,
                        'primeRealisee' => $lead['prime_realisee'] ?? null,
                        'notes' => $lead['notes'] ?? '',
                        'source' => $lead['source'] ?? 'website',
                        'assignedTo' => $lead['assigned_to'] ?? null
                    ];
                }, $leads);

                echo json_encode([
                    'success' => true,
                    'leads' => $formattedLeads,
                    'count' => count($formattedLeads),
                    'debug' => $debugMode ? [
                        'supabase_connected' => true,
                        'raw_count' => count($leads)
                    ] : null
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to fetch leads from Supabase',
                    'http_code' => $result['code'],
                    'details' => $result['data'],
                    'debug' => $debugMode ? [
                        'supabase_url' => substr($supabaseUrl, 0, 30) . '...',
                        'key_length' => strlen($supabaseKey)
                    ] : null
                ]);
            }
            break;

        case 'update':
        case 'update_status':
            $input = json_decode(file_get_contents('php://input'), true);

            // Supporter les deux formats: id/leadStatus et leadId/status
            $leadId = $input['leadId'] ?? $input['id'] ?? null;
            $newStatus = $input['status'] ?? $input['leadStatus'] ?? null;

            if (!$leadId || !$newStatus) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Missing required fields: leadId and status'
                ]);
                exit;
            }

            $updateData = [
                'lead_status' => $newStatus,
                'updated_at' => date('c')
            ];

            if ($newStatus === 'contacté') {
                $updateData['contacted_at'] = date('c');
            } elseif ($newStatus === 'devis envoyé') {
                $updateData['devis_envoye_at'] = date('c');
            } elseif ($newStatus === 'client') {
                $updateData['client_at'] = date('c');
            }

            if (isset($input['primeRealisee'])) {
                $updateData['prime_realisee'] = floatval($input['primeRealisee']);
            }

            if (isset($input['notes'])) {
                $updateData['notes'] = $input['notes'];
            }

            $result = supabaseRequest('PATCH', 'leads?id=eq.' . $leadId, $updateData);

            if ($result['code'] === 200 || $result['code'] === 204) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Lead updated successfully'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to update lead',
                    'details' => $result['data']
                ]);
            }
            break;

        case 'send_devis':
            // Lire depuis JSON si envoyé en JSON
            if ($_SERVER['CONTENT_TYPE'] === 'application/json' || strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
                $jsonInput = json_decode(file_get_contents('php://input'), true);
                $leadId = $jsonInput['leadId'] ?? null;
            } else {
                $leadId = $_POST['leadId'] ?? null;
            }

            if (!$leadId) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Missing leadId'
                ]);
                exit;
            }

            $result = supabaseRequest('GET', 'leads?id=eq.' . $leadId . '&select=*');

            if ($result['code'] !== 200 || empty($result['data'])) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Lead not found'
                ]);
                exit;
            }

            $lead = $result['data'][0];

            // Préparer l'email
            $emailData = [
                'to' => $lead['email'],
                'subject' => 'Votre Devis Assurance Taxi - TaxiAssur',
                'template' => 'devis',
                'data' => [
                    'name' => $lead['name'],
                    'city' => $lead['city']
                ]
            ];

            // Gérer la pièce jointe si présente
            if (isset($_FILES['devis']) && $_FILES['devis']['error'] === UPLOAD_ERR_OK) {
                $fileContent = file_get_contents($_FILES['devis']['tmp_name']);
                $base64Content = base64_encode($fileContent);

                $emailData['attachments'] = [
                    [
                        'filename' => $_FILES['devis']['name'],
                        'content' => $base64Content,
                        'type' => $_FILES['devis']['type'] ?: 'application/pdf'
                    ]
                ];

                error_log('✅ Attachment added: ' . $_FILES['devis']['name'] . ' (' . strlen($base64Content) . ' bytes base64)');
            }

            // Envoyer l'email via Supabase Edge Function
            $emailResult = sendEmail($emailData);

            if (!$emailResult['success']) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to send email: ' . ($emailResult['error'] ?? 'Unknown error')
                ]);
                exit;
            }

            // Mettre à jour le statut du lead
            $updateData = [
                'lead_status' => 'devis envoyé',
                'devis_envoye_at' => date('c'),
                'updated_at' => date('c')
            ];

            $updateResult = supabaseRequest('PATCH', 'leads?id=eq.' . $leadId, $updateData);

            if ($updateResult['code'] === 200 || $updateResult['code'] === 204) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Devis sent successfully'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to update lead status',
                    'details' => $updateResult['data']
                ]);
            }
            break;

        case 'send_contract':
            // Lire depuis JSON si envoyé en JSON
            if ($_SERVER['CONTENT_TYPE'] === 'application/json' || strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
                $jsonInput = json_decode(file_get_contents('php://input'), true);
                $leadId = $jsonInput['leadId'] ?? null;
            } else {
                $leadId = $_POST['leadId'] ?? null;
            }

            if (!$leadId) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Missing leadId'
                ]);
                exit;
            }

            $result = supabaseRequest('GET', 'leads?id=eq.' . $leadId . '&select=*');

            if ($result['code'] !== 200 || empty($result['data'])) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Lead not found'
                ]);
                exit;
            }

            $lead = $result['data'][0];

            // Préparer l'email
            $emailData = [
                'to' => $lead['email'],
                'subject' => 'Votre Contrat d\'Assurance Taxi - TaxiAssur',
                'template' => 'contract',
                'data' => [
                    'name' => $lead['name'],
                    'city' => $lead['city']
                ]
            ];

            // Gérer la pièce jointe si présente
            if (isset($_FILES['contract']) && $_FILES['contract']['error'] === UPLOAD_ERR_OK) {
                $fileContent = file_get_contents($_FILES['contract']['tmp_name']);
                $base64Content = base64_encode($fileContent);

                $emailData['attachments'] = [
                    [
                        'filename' => $_FILES['contract']['name'],
                        'content' => $base64Content,
                        'type' => $_FILES['contract']['type'] ?: 'application/pdf'
                    ]
                ];

                error_log('✅ Attachment added: ' . $_FILES['contract']['name'] . ' (' . strlen($base64Content) . ' bytes base64)');
            }

            // Envoyer l'email via Supabase Edge Function
            $emailResult = sendEmail($emailData);

            if (!$emailResult['success']) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to send email: ' . ($emailResult['error'] ?? 'Unknown error')
                ]);
                exit;
            }

            // Mettre à jour le statut du lead
            $updateData = [
                'lead_status' => 'client',
                'client_at' => date('c'),
                'updated_at' => date('c')
            ];

            $updateResult = supabaseRequest('PATCH', 'leads?id=eq.' . $leadId, $updateData);

            if ($updateResult['code'] === 200 || $updateResult['code'] === 204) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Contract sent successfully'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to update lead status',
                    'details' => $updateResult['data']
                ]);
            }
            break;

        case 'request_review':
            $input = json_decode(file_get_contents('php://input'), true);

            $leadId = $input['leadId'] ?? null;
            $name = $input['name'] ?? null;
            $email = $input['email'] ?? null;
            $city = $input['city'] ?? null;

            if (!$leadId || !$name || !$email) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Missing required fields'
                ]);
                exit;
            }

            // Préparer l'email de demande d'avis
            // TaxiAssur – Courtier Assurance Taxi France
            $reviewLink = 'https://search.google.com/local/writereview?placeid=ChIJS-e7No775UcRJqe_yRYfC6Y';

            $emailData = [
                'to' => $email,
                'subject' => 'Votre avis compte pour nous - TaxiAssur',
                'template' => 'review_request',
                'data' => [
                    'name' => $name,
                    'city' => $city,
                    'review_link' => $reviewLink
                ]
            ];

            // Envoyer l'email via Supabase Edge Function
            $emailResult = sendEmail($emailData);

            if ($emailResult['success']) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Review request sent successfully',
                    'data' => [
                        'leadId' => $leadId,
                        'name' => $name,
                        'email' => $email,
                        'city' => $city
                    ]
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to send review request email: ' . ($emailResult['error'] ?? 'Unknown error')
                ]);
            }
            break;

        default:
            echo json_encode([
                'success' => false,
                'error' => 'Unknown action: ' . $action
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error',
        'message' => $e->getMessage()
    ]);
}
