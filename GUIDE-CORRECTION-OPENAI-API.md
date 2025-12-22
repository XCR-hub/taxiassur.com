# 🔧 GUIDE CORRECTION - ERREUR 500 API OPENAI

## 🔴 PROBLÈME ACTUEL

```
Error 500: /api/generate-content.php
→ La génération de contenu IA ne fonctionne pas
```

---

## 🎯 SOLUTIONS PAR ORDRE DE PRIORITÉ

### SOLUTION 1 : Vérifier la clé OpenAI (PRIORITÉ MAXIMUM)

#### Étape 1 : Tester la clé actuelle

Allez sur : `https://taxiassur.com/api/test-openai.php`

**Résultats possibles** :

```json
// ✅ CAS 1 : Clé valide
{
  "success": true,
  "message": "Clé OpenAI valide !",
  "model": "gpt-4o-mini"
}
→ Clé OK, problème ailleurs (voir Solution 2)

// ❌ CAS 2 : Clé invalide/expirée (401)
{
  "success": false,
  "error": "Erreur API OpenAI",
  "http_code": 401,
  "response": {
    "error": {
      "message": "Incorrect API key provided",
      "type": "invalid_request_error"
    }
  }
}
→ Clé INVALIDE, remplacer immédiatement (voir ci-dessous)

// ❌ CAS 3 : Quota dépassé (429)
{
  "success": false,
  "error": "Limite de requêtes atteinte",
  "http_code": 429
}
→ Quota épuisé, ajouter du crédit ou attendre
```

#### Étape 2 : Obtenir une nouvelle clé OpenAI

**Si la clé est invalide (401) :**

1. Allez sur : https://platform.openai.com/api-keys
2. Connectez-vous à votre compte OpenAI
3. Cliquez **"+ Create new secret key"**
4. Nommez-la : `TaxiAssur-Production-2025`
5. Permissions : **All** (ou au minimum `model.request`)
6. Copiez la clé (elle commence par `sk-proj-...`)

⚠️ **IMPORTANT** : Cette clé ne sera affichée qu'une seule fois !

#### Étape 3 : Remplacer la clé dans le code

**Fichier à modifier** : `public/api/config.php`

```php
// Ligne 33 - Remplacer par votre NOUVELLE clé
setEnvIfNotExists('VITE_OPENAI_API_KEY', 'sk-proj-VOTRE_NOUVELLE_CLE_ICI');
setEnvIfNotExists('OPENAI_API_KEY', 'sk-proj-VOTRE_NOUVELLE_CLE_ICI');
```

**Upload sur IONOS** :
1. Connexion FTP
2. Upload `public/api/config.php`
3. Vérifier permissions : 644 (rw-r--r--)

#### Étape 4 : Tester

```bash
# Test 1 : Clé valide ?
curl https://taxiassur.com/api/test-openai.php

# Test 2 : Génération contenu
curl -X POST https://taxiassur.com/api/generate-content.php \
  -H "Content-Type: application/json" \
  -d '{"keyword":"assurance taxi","type":"blog","city":"Paris"}'
```

---

### SOLUTION 2 : Ajouter du crédit OpenAI

**Si erreur 429 (quota dépassé)** :

1. Allez sur : https://platform.openai.com/account/billing/overview
2. Cliquez **"Add payment method"**
3. Ajoutez carte bancaire
4. Définir limite mensuelle : **10-20€** recommandé

**Coûts estimés** :
- GPT-4o-mini : ~0.15€ / 1M tokens d'entrée
- Article 2000 mots : ~3000 tokens = **0.0005€**
- 100 articles/mois : **0.05€** (5 centimes)
- Budget sécurisé : **5-10€/mois**

---

### SOLUTION 3 : Vérifier le fichier config.php

**Tester si config.php est chargé** :

```bash
curl https://taxiassur.com/api/config.php?debug=config
```

**Réponse attendue** :
```json
{
  "config_loaded": true,
  "supabase_url_set": true,
  "supabase_key_set": true,
  "openai_key_set": true,
  "serp_key_set": true
}
```

**Si `openai_key_set: false`** :
→ Le fichier config.php n'est PAS uploadé ou corrompu

**Solution** :
1. Vérifier que `public/api/config.php` existe sur le serveur
2. Upload manuel via FTP
3. Vérifier permissions : 644

---

### SOLUTION 4 : Utiliser une clé alternative (Fallback)

**Si problème persiste**, créer un fichier `.env` dans `/public/api/` :

```env
VITE_OPENAI_API_KEY=sk-proj-VOTRE_CLE_ICI
OPENAI_API_KEY=sk-proj-VOTRE_CLE_ICI
```

**Upload sur IONOS** :
1. Créer fichier `.env` localement
2. Upload dans `/public/api/.env`
3. Permissions : 600 (rw-------)

---

## 📊 DIAGNOSTIC COMPLET

### Test 1 : Clé OpenAI valide ?

```bash
curl https://taxiassur.com/api/test-openai.php | jq
```

**Résultat attendu** : `"success": true`

### Test 2 : Config chargée ?

```bash
curl https://taxiassur.com/api/config.php?debug=config | jq
```

**Résultat attendu** : `"openai_key_set": true`

### Test 3 : Génération simple

```bash
curl -X POST https://taxiassur.com/api/generate-content.php \
  -H "Content-Type: application/json" \
  -d '{"keyword":"test","type":"blog","city":"Paris"}' | jq
```

**Résultat attendu** : `"success": true, "content": {...}`

---

## 🎯 CHECKLIST DE RÉSOLUTION

Cochez au fur et à mesure :

- [ ] 1. Tester `/api/test-openai.php`
- [ ] 2. Si erreur 401 → Créer nouvelle clé sur platform.openai.com
- [ ] 3. Remplacer clé dans `public/api/config.php`
- [ ] 4. Upload `config.php` sur IONOS
- [ ] 5. Re-tester `/api/test-openai.php`
- [ ] 6. Tester génération contenu
- [ ] 7. Si quota dépassé → Ajouter crédit (5-10€)
- [ ] 8. Vérifier budget mensuel OpenAI

---

## 💡 PRÉVENTION FUTURE

### 1. Surveiller le quota OpenAI

**Dashboard** : https://platform.openai.com/usage

**Alertes** :
- Email si < 1€ de crédit restant
- Email si usage > 80% du budget

### 2. Rotation des clés

**Créer 2 clés** :
- `TaxiAssur-Production-Primary` (principale)
- `TaxiAssur-Production-Backup` (backup)

**Dans config.php** :
```php
// Essayer clé primaire, sinon backup
$openaiKey = env('VITE_OPENAI_API_KEY') ?: env('OPENAI_API_KEY_BACKUP') ?: '';
```

### 3. Logs d'erreur

**Activer logs PHP** :

Dans `public/api/generate-content.php` :
```php
// En haut du fichier
error_log('[OPENAI] Request: ' . json_encode($input));
// Après appel API
error_log('[OPENAI] Response code: ' . $httpCode);
```

**Voir les logs** :
```bash
# Sur IONOS, via cPanel → Error Logs
# Ou SSH :
tail -f /var/log/apache2/error.log | grep OPENAI
```

---

## 🔐 SÉCURITÉ

### NE JAMAIS :

- ❌ Commit la clé OpenAI dans Git
- ❌ Partager la clé publiquement
- ❌ Utiliser la même clé pour dev + prod

### TOUJOURS :

- ✅ Utiliser variables d'environnement
- ✅ Permissions 600 ou 644 sur config.php
- ✅ Révoquer clés compromises immédiatement
- ✅ Définir limite de dépenses OpenAI (10-20€/mois)

---

## 📞 SUPPORT

### OpenAI

- Dashboard : https://platform.openai.com
- Support : https://help.openai.com
- Status : https://status.openai.com

### Erreurs courantes

| Code | Erreur | Solution |
|------|--------|----------|
| 401 | Clé invalide | Créer nouvelle clé |
| 429 | Quota dépassé | Ajouter crédit |
| 500 | Erreur serveur | Réessayer dans 5 min |
| 503 | Service indisponible | Vérifier status.openai.com |

---

## 📝 EXEMPLE DE CLÉ VALIDE

```
Format : sk-proj-XXXXXXXXXXXXXXXXXXXXX

Exemple (FAKE, ne pas utiliser) :
sk-proj-AbCdEf1234567890GhIjKlMnOpQrStUvWxYz123456789

Longueur : ~50-60 caractères
Préfixe : sk-proj- (clés projet) ou sk- (clés classiques)
```

---

## 🚀 RÉSULTAT ATTENDU APRÈS CORRECTION

```bash
# Test API
curl https://taxiassur.com/api/test-openai.php

# Réponse attendue
{
  "success": true,
  "message": "Clé OpenAI valide !",
  "model": "gpt-4o-mini",
  "response": "OK",
  "key_preview": "sk-proj-Uw...M5QAA"
}
```

```bash
# Test génération
curl -X POST https://taxiassur.com/api/generate-content.php \
  -H "Content-Type: application/json" \
  -d '{"keyword":"assurance taxi","type":"blog","city":"Paris"}'

# Réponse attendue
{
  "success": true,
  "content": {
    "title": "Assurance Taxi à Paris : Guide Complet 2025",
    "slug": "assurance-taxi-paris-guide-2025",
    "metaDescription": "...",
    "content": "# Introduction\n\n..."
  },
  "usage": {
    "tokens": 2500,
    "cost": 0.00375
  }
}
```

---

## ⏱️ TEMPS DE RÉSOLUTION ESTIMÉ

- **Clé invalide** : 5-10 minutes (créer + remplacer)
- **Quota dépassé** : 2 minutes (ajouter crédit)
- **Config manquante** : 3 minutes (upload FTP)

**Total** : 10-15 minutes maximum

---

**Date création** : 13 Janvier 2025
**Status** : ✅ Guide complet
**Priorité** : 🔴 CRITIQUE - À appliquer immédiatement

🎯 **OBJECTIF** : API OpenAI 100% fonctionnelle en < 15 minutes
