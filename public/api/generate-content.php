<?php
// Charger la configuration (essaie .env + fallback config.php)
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Récupérer la clé OpenAI depuis les variables d'environnement
// Essayer avec et sans préfixe VITE_
$openaiKey = env('VITE_OPENAI_API_KEY') ?: env('OPENAI_API_KEY') ?: '';

// Debug complet si vide
if (empty($openaiKey)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'OpenAI API key not configured',
        'debug' => [
            'env_function_exists' => function_exists('env'),
            'vite_key_value' => env('VITE_OPENAI_API_KEY') ?: 'NOT_SET',
            'openai_key_value' => env('OPENAI_API_KEY') ?: 'NOT_SET',
            'getenv_vite' => getenv('VITE_OPENAI_API_KEY') ?: 'NOT_SET',
            'getenv_openai' => getenv('OPENAI_API_KEY') ?: 'NOT_SET',
            '_ENV_vite' => $_ENV['VITE_OPENAI_API_KEY'] ?? 'NOT_SET',
            '_ENV_openai' => $_ENV['OPENAI_API_KEY'] ?? 'NOT_SET',
            'config_file_exists' => file_exists(__DIR__ . '/config.php') ? 'yes' : 'no',
            'config_file_readable' => is_readable(__DIR__ . '/config.php') ? 'yes' : 'no',
            'suggestion' => 'Upload config.php to /api/ directory'
        ]
    ]);
    exit;
}

// Lire les données POST
$input = json_decode(file_get_contents('php://input'), true);

$keyword = $input['keyword'] ?? '';
$type = $input['type'] ?? 'blog';
$city = $input['city'] ?? '';
$secondaryKeywords = $input['secondaryKeywords'] ?? [];

if (empty($keyword)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Keyword is required'
    ]);
    exit;
}

// Construire le prompt selon le type de contenu
function buildPrompt($type, $keyword, $city, $secondaryKeywords) {
    $secondaryKeywordsText = !empty($secondaryKeywords)
        ? ' Intégrer naturellement ces mots-clés secondaires : ' . implode(', ', $secondaryKeywords) . '.'
        : '';

    switch ($type) {
        case 'blog':
            return "Tu es un expert en rédaction SEO pour l'assurance taxi en France.

Rédige un article de blog complet et optimisé SEO sur le sujet : \"$keyword\"

L'article doit :
- Faire entre 1800-2200 mots
- Avoir un titre accrocheur et optimisé SEO
- Inclure une meta description de 150-160 caractères
- Contenir des sous-titres H2 et H3 pertinents
- Être structuré avec des paragraphes courts et lisibles
- Inclure des exemples concrets et des chiffres
- Se terminer par une FAQ de 3-5 questions/réponses
$secondaryKeywordsText

Retourne la réponse UNIQUEMENT en JSON valide avec cette structure exacte :
{
  \"title\": \"Titre de l'article\",
  \"slug\": \"titre-de-l-article\",
  \"metaDescription\": \"Description de 150-160 caractères\",
  \"excerpt\": \"Court résumé de 100-150 caractères\",
  \"content\": \"Contenu complet en markdown\",
  \"keywords\": [\"mot-clé 1\", \"mot-clé 2\"],
  \"readingTime\": 8,
  \"category\": \"Guides\",
  \"faq\": [{\"question\": \"Question ?\", \"answer\": \"Réponse détaillée.\"}]
}";

        case 'city':
            $cityName = $city ?: 'Paris';
            return "Tu es un expert en rédaction SEO pour l'assurance taxi en France.

Rédige une page ville complète et optimisée SEO pour : \"Assurance taxi à $cityName\"

La page doit :
- Faire entre 1200-1500 mots
- Être géolocalisée et pertinente pour $cityName
- Inclure des informations locales (réglementation, tarifs moyens)
- Avoir un titre optimisé SEO
- Inclure une meta description de 150-160 caractères
- Contenir des sous-titres H2 et H3 pertinents
$secondaryKeywordsText

Retourne la réponse UNIQUEMENT en JSON valide avec cette structure exacte :
{
  \"title\": \"Titre de la page\",
  \"slug\": \"titre-de-la-page\",
  \"metaDescription\": \"Description de 150-160 caractères\",
  \"content\": \"Contenu complet en markdown\",
  \"keywords\": [\"mot-clé 1\", \"mot-clé 2\"],
  \"readingTime\": 6,
  \"category\": \"Pages Ville\"
}";

        case 'comparison':
            return "Tu es un expert en rédaction SEO pour l'assurance taxi en France.

Rédige un comparatif complet et optimisé SEO sur : \"$keyword\"

Le comparatif doit :
- Faire entre 1000-1500 mots
- Comparer objectivement différentes options
- Inclure un tableau comparatif si pertinent
- Avoir un titre optimisé SEO
- Inclure une meta description de 150-160 caractères
- Contenir des sous-titres H2 et H3 pertinents
$secondaryKeywordsText

Retourne la réponse UNIQUEMENT en JSON valide avec cette structure exacte :
{
  \"title\": \"Titre du comparatif\",
  \"slug\": \"titre-du-comparatif\",
  \"metaDescription\": \"Description de 150-160 caractères\",
  \"content\": \"Contenu complet en markdown avec tableau si pertinent\",
  \"keywords\": [\"mot-clé 1\", \"mot-clé 2\"],
  \"readingTime\": 5,
  \"category\": \"Comparatifs\"
}";

        default:
            return '';
    }
}

$prompt = buildPrompt($type, $keyword, $city, $secondaryKeywords);

// Appeler l'API OpenAI
$ch = curl_init('https://api.openai.com/v1/chat/completions');

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $openaiKey
]);

curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'model' => 'gpt-4o-mini',
    'messages' => [
        [
            'role' => 'system',
            'content' => 'Tu es un expert en rédaction SEO pour l\'assurance taxi en France. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après.'
        ],
        [
            'role' => 'user',
            'content' => $prompt
        ]
    ],
    'temperature' => 0.7,
    'max_tokens' => 4000
]));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Vérifier les erreurs curl
if ($response === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'cURL error',
        'details' => $curlError
    ]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'OpenAI API error',
        'http_code' => $httpCode,
        'details' => json_decode($response, true)
    ]);
    exit;
}

$data = json_decode($response, true);

if (!isset($data['choices'][0]['message']['content'])) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid OpenAI response',
        'details' => $data
    ]);
    exit;
}

$generatedText = $data['choices'][0]['message']['content'];

// Nettoyer le JSON si nécessaire (enlever les backticks)
$generatedText = preg_replace('/```json\s*/', '', $generatedText);
$generatedText = preg_replace('/```\s*$/', '', $generatedText);
$generatedText = trim($generatedText);

// Parser le contenu généré
$content = json_decode($generatedText, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to parse generated content as JSON',
        'raw' => $generatedText,
        'json_error' => json_last_error_msg()
    ]);
    exit;
}

// Calculer l'usage
$usage = [
    'tokens' => $data['usage']['total_tokens'] ?? 0,
    'cost' => ($data['usage']['total_tokens'] ?? 0) * 0.0000015 // Prix approximatif GPT-4o-mini
];

// Retourner le résultat
echo json_encode([
    'success' => true,
    'content' => $content,
    'usage' => $usage
]);
