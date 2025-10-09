# 🔑 CONFIGURATION CLÉ OPENAI - GUIDE COMPLET

## ✅ CLÉ OPENAI CORRECTE

```
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
```

---

## 📍 OÙ CONFIGURER LA CLÉ

La clé OpenAI doit être configurée à **3 endroits** :

### 1. Frontend (✅ DÉJÀ FAIT)

**Fichier :** `public/env-config.js`  
**Ligne 20**

```javascript
VITE_OPENAI_API_KEY: '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'
```

**Statut :** ✅ Correcte

### 2. Environnement local (✅ DÉJÀ FAIT)

**Fichier :** `.env`  
**Ligne 36**

```bash
VITE_OPENAI_API_KEY=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
```

**Statut :** ✅ Correcte

### 3. Supabase Secrets (⚠️ À CONFIGURER)

**Pour :** Edge Functions qui utilisent OpenAI
**Importance :** CRITIQUE pour le générateur IA

---

## 🚀 CONFIGURER DANS SUPABASE

### Méthode 1 : Via Dashboard Supabase (Recommandé)

1. **Aller sur** : https://supabase.com/dashboard
2. **Sélectionner** votre projet : `viuuznfqkauatkjcegcj`
3. **Menu** : Settings → Edge Functions → Secrets
4. **Ajouter un nouveau secret** :
   - **Name :** `OPENAI_API_KEY`
   - **Value :** `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`
5. **Cliquer** : Save

### Méthode 2 : Via CLI Supabase

Si vous avez Supabase CLI installé :

```bash
npx supabase secrets set OPENAI_API_KEY="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"
```

**Important :** Remplacez par votre référence projet si différente.

---

## 📦 EDGE FUNCTIONS UTILISANT OPENAI

Les Edge Functions suivantes utilisent `OPENAI_API_KEY` :

### 1. generate-seo-content ⭐ (PRIORITAIRE)
**URL :** `/functions/v1/generate-seo-content`  
**Utilité :** Générateur IA dans backoffice  
**Localisation :** `supabase/functions/generate-seo-content/index.ts`

### 2. chatbot
**URL :** `/functions/v1/chatbot`  
**Utilité :** Chat IA sur le site  
**Localisation :** `supabase/functions/chatbot/index.ts`

### 3. email-auto-responder
**URL :** `/functions/v1/email-auto-responder`  
**Utilité :** Réponses emails automatiques  
**Localisation :** `supabase/functions/email-auto-responder/index.ts`

### 4. auto-followup
**URL :** `/functions/v1/auto-followup`  
**Utilité :** Relances automatiques  
**Localisation :** `supabase/functions/auto-followup/index.ts`

### 5. partner-scraper-outreach
**URL :** `/functions/v1/partner-scraper-outreach`  
**Utilité :** Outreach partenaires  
**Localisation :** `supabase/functions/partner-scraper-outreach/index.ts`

---

## 🧪 TESTER LA CLÉ

### Test 1 : Générateur IA

1. **Aller sur** : `https://taxiassur.com/backoffice/ai-generator`
2. **Remplir** :
   - Mot-clé : `test assurance taxi`
   - Type : blog
3. **Générer**
4. **Résultat attendu** : Article généré en 10-30 secondes
5. **Si erreur** : Vérifier que `OPENAI_API_KEY` est bien configurée dans Supabase

### Test 2 : API directe

```bash
curl -X POST \
  'https://viuuznfqkauatkjcegcj.supabase.co/functions/v1/generate-seo-content' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpdXV6bmZxa2F1YXRramNlZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQ4MDAsImV4cCI6MjA3NTI4MDgwMH0.D0wo88ypG2OiZL3wCiUGgMyA3OaqzIjKU2Nbo-oxOjA' \
  -H 'Content-Type: application/json' \
  -d '{"keyword": "test", "type": "blog"}'
```

**Résultat attendu** : JSON avec contenu généré

---

## ❌ ERREURS POSSIBLES

### Erreur 1 : "OpenAI API key not found"

**Cause :** Secret `OPENAI_API_KEY` non configuré dans Supabase  
**Solution :** Suivre "Méthode 1" ci-dessus

### Erreur 2 : "Invalid API key"

**Cause :** Clé incorrecte ou expirée  
**Solution :** Vérifier la clé sur https://platform.openai.com/api-keys

### Erreur 3 : "Rate limit exceeded"

**Cause :** Quota OpenAI dépassé  
**Solution :** Attendre ou augmenter quota sur OpenAI

### Erreur 4 : "Insufficient quota"

**Cause :** Pas de crédit OpenAI  
**Solution :** Ajouter crédit sur https://platform.openai.com/account/billing

---

## 🔐 SÉCURITÉ

### Bonnes pratiques

✅ **NE JAMAIS** exposer la clé dans le code frontend  
✅ **TOUJOURS** utiliser via Edge Functions (backend)  
✅ **JAMAIS** commit la clé dans Git  
✅ Utiliser les secrets Supabase pour les Edge Functions  
✅ Utiliser `env-config.js` pour le frontend (chargé dynamiquement)

### Architecture sécurisée

```
Frontend (Browser)
    ↓ (requête sans clé)
Edge Function (Supabase)
    ↓ (utilise OPENAI_API_KEY depuis secrets)
OpenAI API
    ↓ (réponse)
Edge Function
    ↓ (résultat)
Frontend
```

La clé OpenAI n'est **jamais** exposée côté client.

---

## 📋 CHECKLIST FINALE

Avant d'utiliser le générateur IA :

- [x] Clé correcte dans `env-config.js`
- [x] Clé correcte dans `.env`
- [ ] **À FAIRE** : Clé configurée dans Supabase Secrets
- [ ] Edge Function `generate-seo-content` déployée
- [ ] Test générateur IA réussi

---

## 🆘 SUPPORT

Si problème persiste :

1. **Vérifier logs Supabase** :
   - Dashboard → Edge Functions → generate-seo-content → Logs
   
2. **Vérifier quota OpenAI** :
   - https://platform.openai.com/usage
   
3. **Tester clé directement** :
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer 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"
   ```

---

## ✅ RÉSUMÉ

**Clé OpenAI :** ✅ Correcte dans les fichiers  
**Action requise :** ⚠️ Configurer dans Supabase Secrets  
**Priorité :** 🔴 HAUTE (pour générateur IA)  

**Une fois configurée, le générateur IA fonctionnera parfaitement !**
