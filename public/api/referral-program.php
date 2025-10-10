<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$supabaseUrl = getenv('VITE_SUPABASE_URL') ?: 'https://viuuznfqkauatkjcegcj.supabase.co';
$supabaseKey = getenv('VITE_SUPABASE_ANON_KEY') ?: '';

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

function generateReferralCode($name) {
    $prefix = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 3));
    $random = strtoupper(substr(md5(uniqid()), 0, 6));
    return $prefix . $random;
}

$action = $_GET['action'] ?? null;

if (!$action && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? ($_POST['action'] ?? 'list');
}

if (!$action) {
    $action = 'list';
}

try {
    switch ($action) {
        case 'create':
            // Créer un nouveau code de parrainage
            $input = json_decode(file_get_contents('php://input'), true);

            $referrerName = $input['referrer_name'] ?? null;
            $referrerEmail = $input['referrer_email'] ?? null;
            $rewardType = $input['reward_type'] ?? 'discount';
            $rewardValue = $input['reward_value'] ?? 50;

            if (!$referrerName || !$referrerEmail) {
                echo json_encode([
                    'success' => false,
                    'error' => 'referrer_name and referrer_email required'
                ]);
                exit;
            }

            $code = generateReferralCode($referrerName);

            $result = supabaseRequest('POST', 'referral_codes', [
                'code' => $code,
                'referrer_name' => $referrerName,
                'referrer_email' => $referrerEmail,
                'reward_type' => $rewardType,
                'reward_value' => $rewardValue,
                'uses' => 0,
                'max_uses' => 100,
                'status' => 'active',
                'created_at' => date('c')
            ]);

            if ($result['code'] === 201 || $result['code'] === 200) {
                echo json_encode([
                    'success' => true,
                    'code' => $code,
                    'message' => 'Referral code created successfully',
                    'data' => $result['data'][0] ?? null
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to create referral code',
                    'details' => $result['data']
                ]);
            }
            break;

        case 'list':
            // Lister tous les codes de parrainage
            $result = supabaseRequest('GET', 'referral_codes?select=*&order=created_at.desc');

            if ($result['code'] === 200) {
                echo json_encode([
                    'success' => true,
                    'codes' => $result['data'],
                    'count' => count($result['data'])
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to fetch referral codes'
                ]);
            }
            break;

        case 'validate':
            // Valider un code de parrainage
            $input = json_decode(file_get_contents('php://input'), true);
            $code = $input['code'] ?? $_GET['code'] ?? null;

            if (!$code) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Code required'
                ]);
                exit;
            }

            $result = supabaseRequest('GET', "referral_codes?code=eq.$code&status=eq.active");

            if ($result['code'] === 200 && !empty($result['data'])) {
                $referralCode = $result['data'][0];

                // Vérifier si le code n'a pas atteint la limite
                if ($referralCode['uses'] >= $referralCode['max_uses']) {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Code has reached maximum uses'
                    ]);
                    exit;
                }

                echo json_encode([
                    'success' => true,
                    'valid' => true,
                    'code' => $referralCode,
                    'reward_type' => $referralCode['reward_type'],
                    'reward_value' => $referralCode['reward_value']
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'valid' => false,
                    'error' => 'Invalid or inactive code'
                ]);
            }
            break;

        case 'use':
            // Utiliser un code de parrainage
            $input = json_decode(file_get_contents('php://input'), true);

            $code = $input['code'] ?? null;
            $referredEmail = $input['referred_email'] ?? null;

            if (!$code || !$referredEmail) {
                echo json_encode([
                    'success' => false,
                    'error' => 'code and referred_email required'
                ]);
                exit;
            }

            // Récupérer le code
            $result = supabaseRequest('GET', "referral_codes?code=eq.$code&status=eq.active");

            if ($result['code'] !== 200 || empty($result['data'])) {
                echo json_encode([
                    'success' => false,
                    'error' => 'Invalid code'
                ]);
                exit;
            }

            $referralCode = $result['data'][0];

            // Incrémenter le compteur d'utilisations
            $updateResult = supabaseRequest('PATCH', "referral_codes?code=eq.$code", [
                'uses' => $referralCode['uses'] + 1
            ]);

            // Créer une récompense
            $rewardResult = supabaseRequest('POST', 'referral_rewards', [
                'referral_code_id' => $referralCode['id'],
                'referrer_email' => $referralCode['referrer_email'],
                'referred_email' => $referredEmail,
                'reward_type' => $referralCode['reward_type'],
                'reward_value' => $referralCode['reward_value'],
                'status' => 'pending',
                'created_at' => date('c')
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Referral code used successfully',
                'reward' => $rewardResult['data'][0] ?? null
            ]);
            break;

        case 'stats':
            // Statistiques du programme de parrainage
            $codesResult = supabaseRequest('GET', 'referral_codes?select=*');
            $rewardsResult = supabaseRequest('GET', 'referral_rewards?select=*');

            $codes = $codesResult['data'] ?? [];
            $rewards = $rewardsResult['data'] ?? [];

            $stats = [
                'total_codes' => count($codes),
                'active_codes' => count(array_filter($codes, fn($c) => $c['status'] === 'active')),
                'total_uses' => array_sum(array_column($codes, 'uses')),
                'total_rewards' => count($rewards),
                'pending_rewards' => count(array_filter($rewards, fn($r) => $r['status'] === 'pending')),
                'paid_rewards' => count(array_filter($rewards, fn($r) => $r['status'] === 'paid')),
                'total_reward_value' => array_sum(array_column($rewards, 'reward_value'))
            ];

            echo json_encode([
                'success' => true,
                'stats' => $stats
            ]);
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
