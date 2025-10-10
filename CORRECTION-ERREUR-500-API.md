# ✅ CORRECTION : Erreur 500 sur APIs PHP

## 🚨 Problème Identifié

```
/api/generate-content.php:1 Failed to load resource: the server responded with a status of 500 ()
```

**Cause :** Les APIs PHP ne pouvaient pas lire le fichier `.env`

---

## 🔧 Solution Appliquée

### Créé `/public/api/load-env.php`

Fonction qui charge automatiquement les variables depuis `.env` :

```php
<?php
function loadEnvFile($filePath) {
    // Parse le fichier .env ligne par ligne
    // Définit les variables dans $_ENV, $_SERVER et putenv()
}

// Auto-chargement du fichier .env
$envPath = __DIR__ . '/../../.env';
loadEnvFile($envPath);
```

---

## ✅ APIs Corrigées (5 fichiers)

Toutes les APIs incluent maintenant `load-env.php` :

1. ✅ `/api/generate-content.php` (OpenAI)
2. ✅ `/api/serp-optimizer.php` (SerpAPI)
3. ✅ `/api/backlink-automation.php` (Supabase)
4. ✅ `/api/referral-program.php` (Supabase)
5. ✅ `/api/lead-manager.php` (Supabase)

Modification dans chaque fichier :
```php
// Avant
$key = getenv('VITE_OPENAI_API_KEY');

// Après
require_once __DIR__ . '/load-env.php';
$key = env('VITE_OPENAI_API_KEY');
```

---

## 📦 Fichiers à Uploader sur IONOS

```
/dist/                              (build 17.16s)
/public/api/load-env.php           (NOUVEAU - IMPORTANT!)
/public/api/generate-content.php   (modifié)
/public/api/serp-optimizer.php     (modifié)
/public/api/backlink-automation.php (modifié)
/public/api/referral-program.php   (modifié)
/public/api/lead-manager.php       (modifié)
/.env                              (vos clés API)
```

**IMPORTANT :** Le fichier `.env` doit être à la racine du projet pour que `load-env.php` le trouve.

---

## 🎯 Test Post-Correction

1. **Test API OpenAI** : `/api/test-openai.php`
   - Vérifie que PHP peut lire `.env`
   - Teste la connexion OpenAI
   - Retourne diagnostic complet

2. **Test Génération** : `/backoffice/content`
   - Générer un article
   - Devrait fonctionner en 15-30 secondes
   - Vérifier console : **AUCUNE erreur 500**

---

## ✅ Résultat Attendu

**Avant :**
```
❌ Error 500 sur toutes les APIs PHP
❌ OpenAI API key not configured
```

**Après :**
```
✅ APIs lisent .env correctement
✅ Clés API chargées
✅ Génération IA fonctionnelle
✅ 0 erreur 500
```

---

**Build réussi : 17.16s | 0 erreur**
