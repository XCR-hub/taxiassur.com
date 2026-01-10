<?php
/**
 * Charge les variables depuis le fichier .env
 * Compatible avec le format .env standard
 */

function loadEnvFile($filePath) {
    if (!file_exists($filePath)) {
        return false;
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        // Ignorer les commentaires
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        // Parser la ligne KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);

            $key = trim($key);
            $value = trim($value);

            // Enlever les guillemets si présents
            $value = trim($value, '"\'');

            // Définir comme variable d'environnement
            if (!empty($key) && !getenv($key)) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
            }
        }
    }

    return true;
}

// Charger le fichier .env depuis plusieurs emplacements possibles
$possiblePaths = [
    __DIR__ . '/../.env',        // /public/.env (IONOS)
    __DIR__ . '/../../.env',     // /projet/.env (local)
    $_SERVER['DOCUMENT_ROOT'] . '/.env',  // Racine serveur
];

$loaded = false;
foreach ($possiblePaths as $path) {
    if (loadEnvFile($path)) {
        $loaded = true;
        break;
    }
}

// Si aucun .env trouvé, essayer de charger depuis les variables serveur
if (!$loaded) {
    // Les variables peuvent être déjà définies par le serveur (ex: IONOS)
    // Dans ce cas, elles sont déjà dans $_SERVER
}

// Fonction helper pour récupérer une variable
function env($key, $default = null) {
    $value = getenv($key);
    if ($value === false) {
        return $default;
    }
    return $value;
}
