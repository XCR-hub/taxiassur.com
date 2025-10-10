<?php
// Charger les variables d'environnement depuis .env
require_once __DIR__ . '/load-env.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Récupérer la clé SerpAPI depuis les variables d'environnement
$serpApiKey = env('VITE_SERP_API_KEY') ?: env('SERP_API_KEY') ?: '';

if (empty($serpApiKey)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'SerpAPI key not configured'
    ]);
    exit;
}

// Lire les données POST
$input = json_decode(file_get_contents('php://input'), true);

$keywords = $input['keywords'] ?? ['assurance taxi'];
$location = $input['location'] ?? 'France';

// Mots-clés par défaut pour l'assurance taxi
$defaultKeywords = [
    'assurance taxi',
    'assurance taxi pas cher',
    'devis assurance taxi',
    'rc pro taxi',
    'assurance vtc',
    'assurance flotte taxi',
    'assurance taxi en ligne',
    'comparateur assurance taxi',
    'assurance taxi jeune conducteur',
    'prix assurance taxi'
];

$keywordsToAnalyze = !empty($keywords) ? $keywords : $defaultKeywords;

// Analyser les opportunités SERP
$opportunities = [];
$totalSearches = 0;
$totalCompetition = 0;

foreach ($keywordsToAnalyze as $keyword) {
    // Appel SerpAPI pour obtenir les résultats de recherche
    $url = 'https://serpapi.com/search.json?' . http_build_query([
        'q' => $keyword,
        'location' => $location,
        'hl' => 'fr',
        'gl' => 'fr',
        'api_key' => $serpApiKey,
        'num' => 10
    ]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        $data = json_decode($response, true);

        $organicResults = $data['organic_results'] ?? [];
        $relatedSearches = $data['related_searches'] ?? [];

        // Calculer le score d'opportunité
        $competition = count($organicResults);
        $hasAds = isset($data['ads']) && count($data['ads']) > 0;
        $difficulty = $hasAds ? 'High' : ($competition > 5 ? 'Medium' : 'Low');

        // Estimer le volume de recherche (simplifié)
        $estimatedSearches = $hasAds ? rand(1000, 5000) : rand(100, 1000);

        $opportunities[] = [
            'keyword' => $keyword,
            'search_volume' => $estimatedSearches,
            'competition' => $competition,
            'difficulty' => $difficulty,
            'current_ranking' => null, // À compléter avec votre domaine
            'top_competitors' => array_slice(array_map(function($result) {
                return [
                    'domain' => parse_url($result['link'] ?? '', PHP_URL_HOST),
                    'position' => $result['position'] ?? null,
                    'title' => $result['title'] ?? ''
                ];
            }, $organicResults), 0, 3),
            'related_keywords' => array_slice(array_map(function($search) {
                return $search['query'] ?? '';
            }, $relatedSearches), 0, 5),
            'priority' => $difficulty === 'Low' ? 'High' : ($difficulty === 'Medium' ? 'Medium' : 'Low')
        ];

        $totalSearches += $estimatedSearches;
        $totalCompetition += $competition;
    }

    // Pause pour éviter rate limiting
    usleep(200000); // 200ms
}

// Calculer la stratégie recommandée
$avgCompetition = count($opportunities) > 0 ? $totalCompetition / count($opportunities) : 0;

$strategy = [
    'focus' => $avgCompetition < 5 ? 'Long-tail keywords' : 'Content marketing + backlinks',
    'priority_actions' => [
        'Créer du contenu ciblé pour les mots-clés à faible concurrence',
        'Optimiser les pages existantes avec les mots-clés connexes',
        'Développer une stratégie de backlinks de qualité',
        'Améliorer les signaux de pertinence locale'
    ],
    'estimated_traffic_potential' => $totalSearches,
    'content_gaps' => []
];

// Identifier les lacunes de contenu
$existingContent = []; // TODO: Récupérer depuis la base
$missingTopics = [];

foreach ($opportunities as $opp) {
    $related = $opp['related_keywords'];
    foreach ($related as $relatedKw) {
        if (!empty($relatedKw)) {
            $missingTopics[] = $relatedKw;
        }
    }
}

$strategy['content_gaps'] = array_unique(array_slice($missingTopics, 0, 10));

// Retourner les résultats
echo json_encode([
    'success' => true,
    'analyzed' => count($opportunities),
    'opportunities' => $opportunities,
    'strategy' => $strategy,
    'total_search_volume' => $totalSearches,
    'avg_competition' => round($avgCompetition, 2)
]);
