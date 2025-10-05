<?php
// Webhook TaxiAssur.com - VERSION ULTRA-ROBUSTE - DIAGNOSTIC COMPLET
declare(strict_types=1);

// Configuration d'erreurs ULTRA-SÉCURISÉE
error_reporting(0);
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);

// Headers OBLIGATOIRES - TOUJOURS envoyés
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-MAKE-SECRET, X-Requested-With');

// Gestion OPTIONS - JAMAIS d'erreur
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['ok' => true, 'message' => 'CORS preflight OK']);
    exit(0);
}

// Fonction de log ULTRA-SÉCURISÉE
function logWebhook(string $message, array $context = []): void {
    try {
        $logDir = dirname(__DIR__) . '/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        
        $logFile = $logDir . '/webhook-' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $contextStr = !empty($context) ? ' | ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
        
        $entry = "[$timestamp] [$ip] $message$contextStr\n";
        @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
    } catch (Throwable $e) {
        // IGNORER toute erreur de log
    }
}

// Fonction ULTRA-SIMPLE pour écrire JSON - NE PEUT PAS PLANTER
function writeJsonSafe(string $path, array $data): bool {
    try {
        // Créer le dossier parent si nécessaire
        $dir = dirname($path);
        if (!is_dir($dir)) {
            $created = @mkdir($dir, 0755, true);
            if (!$created) {
                logWebhook('Failed to create directory', ['dir' => $dir]);
                return false;
            }
        }
        
        // Encoder en JSON avec options sécurisées
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            logWebhook('JSON encode failed', ['error' => json_last_error_msg()]);
            return false;
        }
        
        // Écrire le fichier avec verrou
        $result = @file_put_contents($path, $json, LOCK_EX);
        if ($result === false) {
            logWebhook('File write failed', ['path' => $path]);
            return false;
        }
        
        logWebhook('File written successfully', ['path' => $path, 'size' => $result]);
        return true;
    } catch (Throwable $e) {
        logWebhook('Exception in writeJsonSafe', ['error' => $e->getMessage(), 'path' => $path]);
        return false;
    }
}

// TRAITEMENT PRINCIPAL - VERSION ULTRA-SÉCURISÉE
try {
    logWebhook('=== WEBHOOK START ===', [
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'query' => $_SERVER['QUERY_STRING'] ?? 'none',
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
        'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'none'
    ]);
    
    $action = $_GET['action'] ?? 'upsert';
    logWebhook('Action determined', ['action' => $action]);
    
    // Configuration des chemins - ULTRA-SÉCURISÉE
    $baseDir = dirname(__DIR__);
    $contentDir = $baseDir . '/content';
    
    // Vérifier que le dossier content existe
    if (!is_dir($contentDir)) {
        $created = @mkdir($contentDir, 0755, true);
        logWebhook('Content directory creation', ['success' => $created, 'path' => $contentDir]);
    }
    
    switch ($action) {
        case 'ping':
            logWebhook('Processing ping request');
            $response = [
                'ok' => true,
                'message' => 'Webhook accessible et fonctionnel',
                'timestamp' => date('c'),
                'version' => 'ultra-robust-v2',
                'php_version' => PHP_VERSION,
                'content_dir' => is_dir($contentDir) ? 'exists' : 'missing',
                'content_writable' => is_writable($contentDir),
                'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
            ];
            echo json_encode($response, JSON_PRETTY_PRINT);
            logWebhook('Ping response sent', $response);
            break;
            
        case 'upsert':
        default:
            logWebhook('Processing upsert request');
            
            // Vérifier la méthode HTTP
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                logWebhook('Invalid method', ['method' => $_SERVER['REQUEST_METHOD']]);
                http_response_code(405);
                echo json_encode([
                    'error' => 'Method not allowed', 
                    'method' => $_SERVER['REQUEST_METHOD'],
                    'expected' => 'POST'
                ]);
                exit;
            }
            
            // Lire les données POST avec validation ULTRA-ROBUSTE
            $rawInput = @file_get_contents('php://input');
            if ($rawInput === false) {
                logWebhook('Failed to read input stream');
                http_response_code(400);
                echo json_encode(['error' => 'Failed to read input stream']);
                exit;
            }
            
            if ($rawInput === '') {
                logWebhook('Empty input received');
                http_response_code(400);
                echo json_encode(['error' => 'Empty input received']);
                exit;
            }
            
            logWebhook('Raw input received', [
                'length' => strlen($rawInput), 
                'preview' => substr($rawInput, 0, 200),
                'first_char' => ord($rawInput[0]),
                'last_char' => ord($rawInput[strlen($rawInput) - 1])
            ]);
            
            // Nettoyer l'input (supprimer BOM et caractères invisibles)
            $cleanInput = trim($rawInput);
            $cleanInput = preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $cleanInput); // Supprimer caractères non-ASCII
            
            if ($cleanInput !== $rawInput) {
                logWebhook('Input cleaned', [
                    'original_length' => strlen($rawInput),
                    'cleaned_length' => strlen($cleanInput),
                    'original_preview' => substr($rawInput, 0, 50),
                    'cleaned_preview' => substr($cleanInput, 0, 50)
                ]);
            }
            
            // Décoder JSON avec gestion d'erreur ULTRA-DÉTAILLÉE
            $input = @json_decode($cleanInput, true);
            $jsonError = json_last_error();
            
            if ($input === null || $jsonError !== JSON_ERROR_NONE) {
                logWebhook('JSON decode error - DETAILED', [
                    'error_code' => $jsonError,
                    'error_message' => json_last_error_msg(),
                    'raw_input_length' => strlen($rawInput),
                    'cleaned_input_length' => strlen($cleanInput),
                    'input_preview' => substr($cleanInput, 0, 500),
                    'input_hex' => bin2hex(substr($cleanInput, 0, 100))
                ]);
                
                http_response_code(400);
                echo json_encode([
                    'error' => 'Invalid JSON format',
                    'json_error' => json_last_error_msg(),
                    'json_error_code' => $jsonError,
                    'input_length' => strlen($rawInput),
                    'cleaned_length' => strlen($cleanInput),
                    'input_preview' => substr($cleanInput, 0, 200),
                    'debug_info' => [
                        'first_10_chars' => substr($cleanInput, 0, 10),
                        'last_10_chars' => substr($cleanInput, -10),
                        'contains_quotes' => strpos($cleanInput, '"') !== false,
                        'contains_braces' => strpos($cleanInput, '{') !== false
                    ]
                ]);
                exit;
            }
            
            logWebhook('JSON decoded successfully', [
                'input_keys' => array_keys($input),
                'input_structure' => json_encode(array_map(function($v) {
                    return is_array($v) ? 'array[' . count($v) . ']' : gettype($v);
                }, $input))
            ]);
            
            // Vérifier la structure minimale avec messages détaillés
            if (!isset($input['type'])) {
                logWebhook('Missing type field', ['available_keys' => array_keys($input)]);
                http_response_code(400);
                echo json_encode([
                    'error' => 'Missing required field: type',
                    'received_keys' => array_keys($input),
                    'expected_structure' => ['type' => 'string', 'payload' => 'object']
                ]);
                exit;
            }
            
            if (!isset($input['payload'])) {
                logWebhook('Missing payload field', ['available_keys' => array_keys($input)]);
                http_response_code(400);
                echo json_encode([
                    'error' => 'Missing required field: payload',
                    'received_keys' => array_keys($input),
                    'type_received' => $input['type']
                ]);
                exit;
            }
            
            $type = $input['type'];
            $payload = $input['payload'];
            
            logWebhook('Input structure validated', [
                'type' => $type,
                'payload_type' => gettype($payload),
                'payload_keys' => is_array($payload) ? array_keys($payload) : 'not_array'
            ]);
            
            // Types autorisés - MAKE + MANUEL
            $allowedTypes = ['blog', 'faq', 'reviews', 'offers', 'newsletter', 'partners', 'backlinks', 'leads'];
            if (!in_array($type, $allowedTypes, true)) {
                logWebhook('Invalid type', ['type' => $type, 'allowed' => $allowedTypes]);
                http_response_code(400);
                echo json_encode([
                    'error' => 'Invalid content type',
                    'type' => $type,
                    'allowed_types' => $allowedTypes
                ]);
                exit;
            }
            
            // Traitement spécial pour newsletter (pas de fichier)
            if ($type === 'newsletter') {
                logWebhook('Newsletter processing - no file needed', [
                    'subject' => $payload['subject'] ?? 'no_subject',
                    'recipients' => $payload['recipients'] ?? 'no_recipients'
                ]);
                
                $response = [
                    'ok' => true,
                    'message' => 'Newsletter processed successfully',
                    'type' => 'newsletter',
                    'timestamp' => date('c'),
                    'payload_received' => true
                ];
                echo json_encode($response, JSON_PRETTY_PRINT);
                logWebhook('Newsletter response sent', $response);
                break;
            }
            
            // Pour les autres types : écriture fichier
            if (!is_array($payload)) {
                logWebhook('Payload is not array', ['payload_type' => gettype($payload)]);
                http_response_code(400);
                echo json_encode([
                    'error' => 'Payload must be an object/array',
                    'payload_type' => gettype($payload)
                ]);
                exit;
            }
            
            $id = $payload['id'] ?? 'item-' . time() . '-' . rand(1000, 9999);
            $typeDir = $contentDir . '/' . $type;
            $filePath = $typeDir . '/' . $id . '.json';
            
            logWebhook('File operation planned', [
                'type' => $type,
                'id' => $id,
                'type_dir' => $typeDir,
                'file_path' => $filePath,
                'type_dir_exists' => is_dir($typeDir),
                'content_dir_writable' => is_writable($contentDir)
            ]);
            
            // Créer le dossier du type si nécessaire
            if (!is_dir($typeDir)) {
                $created = @mkdir($typeDir, 0755, true);
                logWebhook('Type directory creation', ['dir' => $typeDir, 'success' => $created]);
                
                if (!$created) {
                    http_response_code(500);
                    echo json_encode([
                        'error' => 'Cannot create content directory',
                        'directory' => $typeDir,
                        'base_dir_exists' => is_dir($contentDir),
                        'base_dir_writable' => is_writable($contentDir),
                        'permissions' => substr(sprintf('%o', fileperms($contentDir)), -4)
                    ]);
                    exit;
                }
            }
            
            // Écrire le fichier avec validation complète
            $writeSuccess = writeJsonSafe($filePath, $payload);
            
            if ($writeSuccess) {
                logWebhook('SUCCESS: Content saved', [
                    'type' => $type, 
                    'id' => $id, 
                    'file' => $filePath,
                    'file_size' => filesize($filePath)
                ]);
                
                $response = [
                    'ok' => true,
                    'message' => 'Content saved successfully',
                    'type' => $type,
                    'id' => $id,
                    'file' => basename($filePath),
                    'timestamp' => date('c'),
                    'file_size' => filesize($filePath)
                ];
                echo json_encode($response, JSON_PRETTY_PRINT);
                logWebhook('Success response sent', $response);
            } else {
                logWebhook('FAILED: Content save failed', [
                    'type' => $type, 
                    'id' => $id, 
                    'file' => $filePath,
                    'directory_exists' => is_dir($typeDir),
                    'directory_writable' => is_writable($typeDir),
                    'file_exists' => file_exists($filePath)
                ]);
                
                http_response_code(500);
                echo json_encode([
                    'error' => 'Failed to save content to file',
                    'type' => $type,
                    'id' => $id,
                    'file' => basename($filePath),
                    'directory_exists' => is_dir($typeDir),
                    'directory_writable' => is_writable($typeDir),
                    'debug_info' => [
                        'content_dir' => $contentDir,
                        'type_dir' => $typeDir,
                        'file_path' => $filePath
                    ]
                ]);
            }
            
            logWebhook('Upsert processing completed');
            break;
    }
    
    logWebhook('=== WEBHOOK END SUCCESS ===');
    
} catch (ParseError $e) {
    logWebhook('PARSE ERROR', [
        'message' => $e->getMessage(), 
        'file' => $e->getFile(), 
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    http_response_code(500);
    echo json_encode([
        'error' => 'PHP Parse Error',
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
} catch (TypeError $e) {
    logWebhook('TYPE ERROR', [
        'message' => $e->getMessage(), 
        'file' => $e->getFile(), 
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    http_response_code(500);
    echo json_encode([
        'error' => 'PHP Type Error',
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
} catch (Exception $e) {
    logWebhook('EXCEPTION', [
        'message' => $e->getMessage(), 
        'file' => $e->getFile(), 
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    http_response_code(500);
    echo json_encode([
        'error' => 'Exception caught',
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
} catch (Error $e) {
    logWebhook('ERROR', [
        'message' => $e->getMessage(), 
        'file' => $e->getFile(), 
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    http_response_code(500);
    echo json_encode([
        'error' => 'PHP Error',
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
} catch (Throwable $e) {
    logWebhook('THROWABLE', [
        'message' => $e->getMessage(), 
        'file' => $e->getFile(), 
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    http_response_code(500);
    echo json_encode([
        'error' => 'Throwable caught',
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
        'php_version' => PHP_VERSION,
        'timestamp' => date('c')
    ]);
}
?>