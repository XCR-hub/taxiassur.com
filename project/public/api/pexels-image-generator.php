<?php
/**
 * Pexels Image Generator pour TaxiAssur
 *
 * Génère et récupère des images professionnelles via Pexels API
 * avec alt-text SEO optimisé
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Charger config
require_once __DIR__ . '/load-env.php';

/**
 * Recherche une image sur Pexels
 */
function searchPexelsImage($query, $orientation = 'landscape') {
    $apiKey = getenv('VITE_PEXELS_API_KEY');

    if (!$apiKey) {
        return [
            'success' => false,
            'error' => 'Pexels API key not configured'
        ];
    }

    // Nettoyer et optimiser la requête
    $cleanQuery = urlencode(trim($query));

    // Construire URL API
    $url = "https://api.pexels.com/v1/search?query={$cleanQuery}&per_page=3&orientation={$orientation}&size=large";

    // Appel API
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: {$apiKey}",
            "Accept: application/json"
        ],
        CURLOPT_TIMEOUT => 10
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return [
            'success' => false,
            'error' => "Pexels API error: {$error}"
        ];
    }

    if ($httpCode !== 200) {
        return [
            'success' => false,
            'error' => "Pexels API returned HTTP {$httpCode}"
        ];
    }

    $data = json_decode($response, true);

    if (!isset($data['photos']) || empty($data['photos'])) {
        // Aucune image trouvée, essayer une recherche plus générique
        return searchPexelsImage('taxi', $orientation);
    }

    // Sélectionner une image aléatoirement parmi les 3 premières
    $photo = $data['photos'][array_rand($data['photos'])];

    return [
        'success' => true,
        'image' => [
            'url' => $photo['src']['large2x'], // Haute qualité
            'url_medium' => $photo['src']['large'],
            'url_small' => $photo['src']['medium'],
            'photographer' => $photo['photographer'],
            'photographer_url' => $photo['photographer_url'],
            'pexels_url' => $photo['url'],
            'width' => $photo['width'],
            'height' => $photo['height'],
            'alt' => $photo['alt'] ?? ''
        ]
    ];
}

/**
 * Génère un alt-text SEO optimisé
 */
function generateSEOAltText($keyword, $city, $pexelsAlt = '') {
    // Si Pexels fournit un alt, l'utiliser comme base
    $base = !empty($pexelsAlt) ? $pexelsAlt : "taxi professionnel";

    // Variantes naturelles
    $templates = [
        "Taxi professionnel à {$city} - {$keyword}",
        "Véhicule taxi moderne à {$city} pour {$keyword}",
        "Service de taxi à {$city} - {$keyword}",
        "Chauffeur de taxi professionnel à {$city}",
        "Taxi conventionné à {$city} - {$keyword}",
        "Véhicule de tourisme avec chauffeur à {$city}"
    ];

    // Sélectionner un template aléatoire
    $altText = $templates[array_rand($templates)];

    // Ajouter des variations naturelles
    $variations = [
        " pour votre assurance",
        " - photo professionnelle",
        " - service premium",
        ""
    ];

    $altText .= $variations[array_rand($variations)];

    // Limiter à 125 caractères (Google recommandation)
    if (strlen($altText) > 125) {
        $altText = substr($altText, 0, 122) . '...';
    }

    return $altText;
}

/**
 * Génère une requête de recherche optimisée
 */
function generateSearchQuery($keyword, $city) {
    // Requêtes optimisées pour Pexels
    $queries = [
        "taxi {$city}",
        "taxi professionnel {$city}",
        "chauffeur taxi {$city}",
        "véhicule taxi {$city}",
        "taxi service {$city}",
        "taxi moderne"
    ];

    // Si le mot-clé contient des termes spécifiques
    if (stripos($keyword, 'électrique') !== false || stripos($keyword, 'tesla') !== false) {
        $queries[] = "electric taxi";
        $queries[] = "tesla taxi";
    }

    if (stripos($keyword, 'luxe') !== false || stripos($keyword, 'premium') !== false) {
        $queries[] = "luxury taxi {$city}";
        $queries[] = "premium taxi";
    }

    // Sélectionner aléatoirement
    return $queries[array_rand($queries)];
}

// ============================================================================
// ENDPOINT PRINCIPAL
// ============================================================================

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $keyword = $input['keyword'] ?? '';
    $city = $input['city'] ?? '';
    $customQuery = $input['query'] ?? null;

    if (empty($keyword) || empty($city)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Keyword and city are required'
        ]);
        exit;
    }

    // Générer la requête de recherche
    $searchQuery = $customQuery ?? generateSearchQuery($keyword, $city);

    // Rechercher l'image
    $result = searchPexelsImage($searchQuery);

    if (!$result['success']) {
        http_response_code(500);
        echo json_encode($result);
        exit;
    }

    // Générer alt-text SEO
    $altText = generateSEOAltText($keyword, $city, $result['image']['alt']);

    // Réponse finale
    echo json_encode([
        'success' => true,
        'image' => [
            'url' => $result['image']['url'],
            'url_medium' => $result['image']['url_medium'],
            'url_small' => $result['image']['url_small'],
            'alt_text' => $altText,
            'photographer' => $result['image']['photographer'],
            'photographer_url' => $result['image']['photographer_url'],
            'pexels_url' => $result['image']['pexels_url'],
            'width' => $result['image']['width'],
            'height' => $result['image']['height']
        ],
        'query_used' => $searchQuery
    ]);
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed'
    ]);
}
