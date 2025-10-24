# 🚨 CLÉ OPENAI INVALIDE - Action Requise

## ✅ Diagnostic Complet

J'ai testé votre clé OpenAI et elle est **INVALIDE** :

```
Error: "Incorrect API key provided: sk-proj-***...GhIA"
Type: "invalid_request_error"
Code: "invalid_api_key"
```

**Causes possibles :**
1. Clé révoquée manuellement sur OpenAI
2. Clé expirée (projet OpenAI supprimé)
3. Quota dépassé
4. Compte OpenAI suspendu

---

## 🔑 SOLUTION : Créer une Nouvelle Clé OpenAI

### Étape 1 : Aller sur OpenAI Platform

**URL :** https://platform.openai.com/api-keys

### Étape 2 : Créer une Nouvelle Clé

1. Cliquez sur **"+ Create new secret key"**
2. Donnez un nom : `TaxiAssur Production`
3. **Permissions recommandées :**
   - ✅ `gpt-4o-mini` (modèle économique)
   - ✅ `gpt-4` (si besoin)
   - ❌ Désactivez `DALL-E` (pas nécessaire)
4. Cliquez **"Create secret key"**
5. **COPIEZ LA CLÉ IMMÉDIATEMENT** (elle ne sera plus visible après)

**Format attendu :**
```
sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 📝 Étape 3 : Remplacer la Clé (2 fichiers)

### Fichier 1 : /public/api/config.php

**Ligne 33 :**
```php
setEnvIfNotExists('VITE_OPENAI_API_KEY', 'VOTRE_NOUVELLE_CLE_ICI');
```

**Ligne 34 :**
```php
setEnvIfNotExists('OPENAI_API_KEY', 'VOTRE_NOUVELLE_CLE_ICI');
```

### Fichier 2 : /.env (local)

**Ligne ~12 :**
```
VITE_OPENAI_API_KEY=VOTRE_NOUVELLE_CLE_ICI
```

---

## 🚀 Étape 4 : Upload et Test

### 4.1 Upload config.php

**Via FTP IONOS :**
```
/public/api/config.php  →  /api/config.php (écraser)
```

### 4.2 Test Immédiat

**URL de test :**
```
https://taxiassur.com/api/test-debug-complet.php
```

**Résultat attendu :**
```json
{
  "step_3_variables": {
    "VITE_OPENAI_API_KEY": {
      "isset": "YES"    ← Doit être "YES"
    }
  },
  "step_4_conclusion": {
    "status": "✅ ALL OK"
  }
}
```

### 4.3 Test Génération

```
1. Allez sur : /backoffice/content
2. Mot-clé : "assurance taxi"
3. Cliquez : "Générer le Contenu"
4. ✅ Devrait générer SANS erreur 500
```

---

## 🔍 Vérifications Pré-Upload

### Test Local (optionnel)

**Depuis votre terminal :**
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer VOTRE_NOUVELLE_CLE_ICI"
```

**Résultat attendu :**
```json
{
  "object": "list",
  "data": [
    { "id": "gpt-4o-mini", ... },
    ...
  ]
}
```

**Si erreur :**
- ❌ Clé invalide → Vérifiez que vous l'avez bien copiée
- ❌ Quota dépassé → Ajoutez un moyen de paiement sur OpenAI
- ❌ Unauthorized → Vérifiez les permissions de la clé

---

## 💰 Coût Estimé

**Modèle utilisé :** `gpt-4o-mini`

| Action | Tokens | Coût (USD) |
|--------|--------|-----------|
| 1 article blog (2000 mots) | ~3000 | $0.003 |
| 10 articles | ~30000 | $0.03 |
| 100 articles | ~300000 | $0.30 |

**Recommandation :**
- Ajoutez 5-10$ de crédit sur OpenAI
- Activez les alertes de quota

---

## 📁 Fichiers à Modifier

```
✏️ À MODIFIER (puis upload) :
   /public/api/config.php        (ligne 33-34)

✏️ À MODIFIER (local uniquement) :
   /.env                          (ligne ~12)

📤 À UPLOADER :
   /public/api/config.php  →  /api/config.php sur IONOS
```

---

## ✅ Checklist de Remplacement

- [ ] Clé OpenAI créée sur https://platform.openai.com/api-keys
- [ ] Clé copiée dans un endroit sûr
- [ ] `/public/api/config.php` modifié (ligne 33-34)
- [ ] `/.env` modifié (ligne ~12)
- [ ] Test local avec curl (optionnel)
- [ ] `config.php` uploadé sur IONOS
- [ ] Test https://taxiassur.com/api/test-debug-complet.php → "ALL OK"
- [ ] Test génération IA → Fonctionne sans erreur

---

## 🚨 URGENT : Ne Partagez JAMAIS Votre Clé

**⚠️ Votre ancienne clé est exposée dans les fichiers de configuration.**

**Actions de sécurité :**

1. **Révoquez l'ancienne clé** sur OpenAI (même si invalide)
2. **Ne committez JAMAIS** de clés API dans Git
3. **Utilisez .gitignore** pour exclure :
   ```
   .env
   .env.local
   /public/api/config.php
   ```

---

## 📞 Support

**Si problème persiste après remplacement :**

1. Testez en navigation privée (cache)
2. Vérifiez la console (F12) pour erreurs
3. Vérifiez que `config.php` a bien été uploadé
4. Testez directement l'API : `curl https://taxiassur.com/api/generate-content.php -X POST -H "Content-Type: application/json" -d '{"keyword":"test","type":"blog"}'`

---

**Temps estimé : 5 minutes + temps d'upload**
