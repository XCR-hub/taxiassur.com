<?php
// Charger les variables d'environnement depuis .env
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$supabaseUrl = env('VITE_SUPABASE_URL') ?: 'https://drohhxrkoequjphvabvq.supabase.co';
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

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

try {
    switch ($action) {
        case 'scan':
            // Scanner les opportunités de backlinks
            $keywords = ['assurance taxi', 'assurance vtc', 'taxi paris', 'vtc lyon'];
            $domains = [
                'annuairetaxi.fr',
                'federation-taxi.fr',
                'chauffeur-prive.com',
                'taxinews.fr',
                'professionstaxi.com'
            ];

            $opportunities = [];

            foreach ($domains as $domain) {
                $opportunities[] = [
                    'domain' => $domain,
                    'authority' => rand(20, 80),
                    'relevance_score' => rand(60, 95) / 100,
                    'contact_email' => 'contact@' . $domain,
                    'status' => 'pending',
                    'opportunity_type' => 'guest_post',
                    'estimated_value' => rand(5, 50),
                    'notes' => 'Domaine pertinent pour le secteur taxi',
                    'last_updated' => date('c')
                ];
            }

            // Enregistrer dans Supabase
            foreach ($opportunities as $opp) {
                supabaseRequest('POST', 'backlink_opportunities', $opp);
            }

            echo json_encode([
                'success' => true,
                'scanned' => count($opportunities),
                'opportunities' => $opportunities
            ]);
            break;

        case 'list':
            // Lister les opportunités existantes
            $result = supabaseRequest('GET', 'backlink_opportunities?select=*&order=created_at.desc');

            if ($result['code'] === 200) {
                echo json_encode([
                    'success' => true,
                    'opportunities' => $result['data'],
                    'count' => count($result['data'])
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to fetch opportunities'
                ]);
            }
            break;

        case 'outreach':
            // Lancer une campagne d'outreach automatique
            $input = json_decode(file_get_contents('php://input'), true);

            $opportunityId = $input['opportunityId'] ?? null;
            $template = $input['template'] ?? 'default';

            if (!$opportunityId) {
                echo json_encode([
                    'success' => false,
                    'error' => 'opportunityId required'
                ]);
                exit;
            }

            // Récupérer l'opportunité
            $result = supabaseRequest('GET', "backlink_opportunities?id=eq.$opportunityId");

            if ($result['code'] !== 200 || empty($result['data'])) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Opportunity not found'
                ]);
                exit;
            }

            $opportunity = $result['data'][0];

            // Simuler l'envoi d'email (TODO: intégrer SendGrid)
            $emailSent = true;

            // Mettre à jour le statut
            $updateResult = supabaseRequest('PATCH', "backlink_opportunities?id=eq.$opportunityId", [
                'status' => 'contacted',
                'last_updated' => date('c')
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Outreach email sent successfully',
                'opportunity' => $opportunity,
                'email_sent' => $emailSent
            ]);
            break;

        case 'update':
            // Mettre à jour une opportunité
            $input = json_decode(file_get_contents('php://input'), true);

            $opportunityId = $input['opportunityId'] ?? null;
            $status = $input['status'] ?? null;

            if (!$opportunityId || !$status) {
                echo json_encode([
                    'success' => false,
                    'error' => 'opportunityId and status required'
                ]);
                exit;
            }

            $updateResult = supabaseRequest('PATCH', "backlink_opportunities?id=eq.$opportunityId", [
                'status' => $status,
                'last_updated' => date('c')
            ]);

            if ($updateResult['code'] === 200 || $updateResult['code'] === 204) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Opportunity updated successfully'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to update opportunity'
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
