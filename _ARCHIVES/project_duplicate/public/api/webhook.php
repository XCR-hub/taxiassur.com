<?php
/**
 * Webhook Proxy - Redirige vers le vrai webhook
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-MAKE-SECRET');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = $_GET['action'] ?? 'ping';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'ping') {
    echo json_encode([
        'ok' => true,
        'message' => 'Webhook accessible',
        'timestamp' => date('c'),
        'version' => '1.0'
    ]);
    exit();
}

// Rediriger vers le vrai webhook
header('Location: /webhooks/make.php?action=' . urlencode($action));
exit();
