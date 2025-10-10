<?php
// Charger les variables d'environnement depuis .env
require_once __DIR__ . '/load-env.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$supabaseUrl = env('VITE_SUPABASE_URL') ?: 'https://viuuznfqkauatkjcegcj.supabase.co';
$supabaseKey = env('VITE_SUPABASE_ANON_KEY') ?: '';

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
            $result = supabaseRequest('GET', 'leads?select=*&order=created_at.desc');

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
                    'count' => count($formattedLeads)
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to fetch leads',
                    'details' => $result['data']
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

            if ($newStatus === 'contacte') {
                $updateData['contacted_at'] = date('c');
            } elseif ($newStatus === 'devis_envoye') {
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
            $leadId = $_POST['leadId'] ?? null;

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

            $updateData = [
                'lead_status' => 'devis_envoye',
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
            $leadId = $_POST['leadId'] ?? null;

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

            // TODO: Intégrer l'envoi d'email réel (SendGrid, etc.)
            // Pour l'instant, on simule le succès

            // Simuler l'envoi d'un email de demande d'avis
            $emailSent = true; // Remplacer par l'envoi réel

            if ($emailSent) {
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
                    'error' => 'Failed to send review request email'
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
