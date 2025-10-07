<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$supabaseUrl = getenv('VITE_SUPABASE_URL') ?: 'https://drohhxrkoequjphvabvq.supabase.co';
$supabaseKey = getenv('VITE_SUPABASE_ANON_KEY') ?: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';

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

$action = $_GET['action'] ?? 'list';

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
            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['id']) || !isset($input['leadStatus'])) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Missing required fields: id and leadStatus'
                ]);
                exit;
            }

            $leadId = $input['id'];
            $newStatus = $input['leadStatus'];

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
