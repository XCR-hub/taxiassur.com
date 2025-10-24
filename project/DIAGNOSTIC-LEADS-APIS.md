# 🔍 DIAGNOSTIC : Leads & APIs

## 🚨 Problèmes Rapportés

1. **Les vrais leads ont disparu** (remplacés par simulés)
2. **Connexion aux APIs ne fonctionne pas**

---

## ✅ Vérification Base de Données

**Statut Supabase :**
```
✅ 11 leads totaux
✅ 10 vrais leads (emails non-example)
✅ 1 lead simulé (email example)
```

**Les leads EXISTENT dans la base !** Le problème vient de l'affichage.

---

## 🔧 Outils de Diagnostic Créés

### 1️⃣ API Diagnostic Complète

**URL :** `/api/diagnostic.php`

**Ce qu'elle teste :**
- ✅ Version PHP & fonctions (curl, json, etc.)
- ✅ Fichiers .env (3 emplacements)
- ✅ Variables d'environnement chargées
- ✅ Connexion Supabase
- ✅ Connexion OpenAI
- ✅ Récupération des 5 derniers leads

**Test immédiat :**
```
https://votresite.com/api/diagnostic.php
```

**Résultat attendu :**
```json
{
  "summary": {
    "overall_status": "OK",
    "supabase": "OK",
    "openai": "OK",
    "leads_accessible": "OK"
  },
  "leads_test": {
    "success": true,
    "count": 5,
    "sample": [...]
  }
}
```

---

### 2️⃣ Mode Debug Lead Manager

**URL :** `/api/lead-manager.php?action=list&debug=true`

**Ce qu'il affiche :**
- Supabase URL chargée
- Longueur de la clé API
- Code HTTP de réponse
- Nombre de leads trouvés
- Erreurs détaillées

**Test immédiat :**
```
https://votresite.com/api/lead-manager.php?action=list&debug=true
```

**Si erreur "Supabase configuration missing" :**
```json
{
  "success": false,
  "error": "Supabase configuration missing",
  "debug": {
    "supabase_url": true/false,
    "supabase_key": false,
    "message": "Check .env file and load-env.php"
  }
}
```

---

## 🎯 Processus de Diagnostic (Étape par Étape)

### Étape 1 : Test Diagnostic Global

```
1. Allez sur : /api/diagnostic.php
2. Vérifiez : "overall_status": "OK"
3. Si "ERROR" → Regardez quel service échoue
```

**Si erreur Supabase :**
- La clé n'est pas chargée
- Vérifiez que `/public/.env` existe
- Vérifiez les permissions (644)

**Si erreur OpenAI :**
- La clé est invalide ou expirée
- Testez sur : https://platform.openai.com/api-keys

---

### Étape 2 : Test Lead Manager

```
1. Allez sur : /api/lead-manager.php?action=list&debug=true
2. Vérifiez : "success": true
3. Vérifiez : "count": 11 (ou plus)
```

**Si "success": false :**
- Regardez le champ "error"
- Regardez "http_code" (devrait être 200)
- Si 401 → Clé Supabase invalide
- Si 0 → Problème réseau/CURL

---

### Étape 3 : Test Backoffice

```
1. Allez sur : /backoffice/leads
2. Ouvrez Console (F12)
3. Regardez les messages :
   - "🔍 Fetching leads from API..."
   - "✅ Found X leads from API"
```

**Si "Found 0 leads" mais API retourne des leads :**
- Problème de mapping frontend
- Vérifiez la console pour erreurs JavaScript

---

## 🔧 Solutions Rapides

### Problème : "Supabase configuration missing"

**Solution 1 : Vérifier .env**
```bash
# Sur le serveur
cat /public/.env | grep SUPABASE
```

Devrait afficher :
```
VITE_SUPABASE_URL=https://viuuznfqkauatkjcegcj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Solution 2 : Permissions**
```bash
chmod 644 /public/.env
chmod 644 /public/api/*.php
```

**Solution 3 : Variables Serveur (IONOS)**
```
Panel IONOS > Configuration PHP > Variables d'environnement

Ajoutez :
VITE_SUPABASE_URL=https://viuuznfqkauatkjcegcj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Problème : Leads affichés comme "simulés"

**Cause possible :**
- L'API retourne bien les leads mais le frontend ne les affiche pas
- Vérifiez la console navigateur

**Solution :**
```javascript
// Dans /backoffice/leads
// Console devrait afficher :
"✅ Found 11 leads from API"

// Si affiche 0 → Problème API
// Si affiche 11 → Problème affichage frontend
```

---

## 📦 Fichiers Modifiés

1. ✅ `/public/api/diagnostic.php` (NOUVEAU)
2. ✅ `/public/api/lead-manager.php` (mode debug ajouté)
3. ✅ `/public/api/load-env.php` (cherche 3 emplacements)
4. ✅ `/public/.env` (copie pour faciliter accès)

---

## 🎯 Checklist Rapide

```
□ Uploadez /dist/ complet
□ Uploadez /public/api/*.php
□ Uploadez /public/.env
□ Testez /api/diagnostic.php
  □ overall_status: OK
  □ supabase: OK
  □ openai: OK
  □ leads_accessible: OK
□ Testez /api/lead-manager.php?action=list&debug=true
  □ success: true
  □ count: 11+
□ Testez /backoffice/leads
  □ Console: "Found 11 leads"
  □ Interface: 11 leads affichés
```

---

## 🚀 Prochaine Étape

**Testez immédiatement :**
```
1. /api/diagnostic.php → Devrait être OK
2. /api/lead-manager.php?action=list → Devrait retourner 11 leads
3. /backoffice/leads → Devrait afficher 11 leads
```

**Si un test échoue, regardez le message d'erreur et suivez les solutions ci-dessus.**

---

**Build : 17.42s | 0 erreur**
