# 🔍 Diagnostic Erreur Générateur IA - /backoffice/social-media

## Messages Console Actuels

```
✅ Configuration chargée depuis env-config.js
🔧 Supabase Config: Object
⚠️ Multiple GoTrueClient instances detected
```

**Ces messages sont NORMAUX** et n'empêchent pas le fonctionnement.

## Diagnostic en 2 Étapes

### ÉTAPE 1 : Vérifier les Templates Viraux

**Dans Supabase SQL Editor, exécuter :**

```sql
-- Test 1: Templates existent ?
SELECT COUNT(*) as total_templates
FROM viral_templates
WHERE is_active = true;
```

**Résultats possibles :**

#### A. Résultat : `0` ou erreur "table viral_templates does not exist"
❌ **PROBLÈME : Templates manquants**

**SOLUTION :**
1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier/coller le contenu de : `FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql`
3. Cliquer RUN
4. Vérifier : doit afficher "5 templates actifs"

#### B. Résultat : `5` ou plus
✅ **Templates OK**, passer à l'étape 2

---

### ÉTAPE 2 : Vérifier la Clé OpenAI

**Dans Supabase Dashboard :**
1. Aller dans **Settings** → **Edge Functions**
2. Section **"Secrets and Environment Variables"**
3. Chercher : `OPENAI_API_KEY`

**Résultats possibles :**

#### A. Secret `OPENAI_API_KEY` n'existe PAS
❌ **PROBLÈME : Clé OpenAI manquante**

**SOLUTION :**

**1. Obtenir une clé OpenAI :**
- Aller sur : https://platform.openai.com/api-keys
- Se connecter (créer compte si besoin)
- Cliquer : "Create new secret key"
- Nom : `TaxiAssur-Production`
- Copier la clé : `sk-proj-...`

**2. Ajouter dans Supabase :**
- Supabase Dashboard → Settings → Edge Functions
- Section "Secrets and Environment Variables"
- Cliquer : "Add new secret"
- **Nom** : `OPENAI_API_KEY`
- **Valeur** : Coller `sk-proj-...`
- Save

**3. Tester :**
- Retourner sur `/backoffice/social-media`
- Cliquer "Générer avec IA"
- Attendre 5-10 secondes
- ✅ Doit fonctionner

#### B. Secret `OPENAI_API_KEY` existe
✅ **Clé OpenAI OK**

Si l'erreur persiste, voir section "Diagnostic Avancé" ci-dessous.

---

## Test Rapide : Fonction RPC

**Pour tester si les templates sont accessibles, exécuter dans SQL Editor :**

```sql
-- Test la fonction get_viral_template
SELECT
  name,
  category,
  (avg_views / 1000000)::numeric(10,1) || 'M' as vues,
  performance_score
FROM get_viral_template('assurance')
LIMIT 3;
```

**Résultat attendu :**
```
Question Choc - Assurance | assurance | 7.2M | 95
Top 5 Erreurs | assurance | 8.5M | 98
...
```

**Si vide :** Les templates ne sont pas insérés ou la fonction RPC a un problème.

---

## Test Manuel Edge Function

**Dans un terminal ou Postman :**

```bash
curl -X POST \
  'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-viral-content-generator' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5NjY1NTcsImV4cCI6MjA0MzU0MjU1N30.gTPDE2JR8B6_V0ufmx4nQsggYZPRlBOJBCEt0bTn5s4' \
  -d '{
    "category": "assurance",
    "topic": "test diagnostic",
    "platforms": ["linkedin"],
    "auto_publish": false
  }'
```

**Réponses possibles :**

### A. `{"success": false, "error": "No viral template found"}`
❌ **Exécuter `FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql`**

### B. `{"success": false, "error": "OPENAI_API_KEY not configured"}`
❌ **Configurer le secret `OPENAI_API_KEY` dans Supabase**

### C. `{"success": false, "error": "Incorrect API key"}`
❌ **Clé OpenAI invalide → Régénérer une nouvelle clé**

### D. `{"success": false, "error": "You exceeded your current quota"}`
❌ **Pas de crédit OpenAI → Ajouter du crédit sur platform.openai.com**

### E. `{"success": true, "posts": [...], "message": "..."}`
✅ **Tout fonctionne !**

---

## Diagnostic Avancé

### Vérifier les Logs Edge Function

1. **Supabase Dashboard**
2. **Edge Functions** (menu gauche)
3. **Cliquer** sur `ai-viral-content-generator`
4. **Onglet** : Logs
5. **Chercher** les erreurs récentes

**Erreurs courantes dans les logs :**

```
Error: OPENAI_API_KEY not configured
→ Solution: Ajouter secret OPENAI_API_KEY

Error: No viral template found
→ Solution: Exécuter SQL V2

Error: fetch failed
→ Solution: Problème réseau OpenAI (vérifier status.openai.com)
```

### Vérifier la Console Navigateur

1. **F12** (ouvrir DevTools)
2. **Console** tab
3. **Network** tab
4. Cliquer **"Générer avec IA"**
5. Chercher la requête à `ai-viral-content-generator`
6. Regarder la **Response**

**Si Response = 500 :**
- Cliquer sur la requête
- Onglet **"Response"** ou **"Preview"**
- Lire le message d'erreur exact
- Suivre les instructions correspondantes ci-dessus

---

## Checklist Complète

### Configuration Base de Données
- [ ] Table `viral_templates` existe
- [ ] 5 templates actifs minimum
- [ ] Fonction `get_viral_template()` retourne des résultats

**Test :**
```sql
SELECT COUNT(*) FROM viral_templates WHERE is_active = true;
-- Doit retourner au moins 5
```

### Configuration Secrets
- [ ] Secret `OPENAI_API_KEY` existe dans Supabase
- [ ] Clé commence par `sk-proj-` ou `sk-`
- [ ] Compte OpenAI a du crédit disponible

**Test :**
```bash
# Tester la clé OpenAI directement
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-proj-..." \
  | grep "gpt-4"
# Doit retourner des modèles
```

### Configuration Edge Function
- [ ] Edge Function `ai-viral-content-generator` déployée
- [ ] Pas d'erreur dans les logs
- [ ] Répond en moins de 30 secondes

---

## Actions Correctives par Scénario

### Scénario 1 : Templates Manquants
```
1. Copier FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql
2. Supabase SQL Editor → Coller → RUN
3. Vérifier: "5 templates actifs"
4. Retester générateur
```

### Scénario 2 : Clé OpenAI Manquante
```
1. platform.openai.com/api-keys
2. Create new secret key
3. Copier sk-proj-...
4. Supabase → Settings → Edge Functions → Secrets
5. Add: OPENAI_API_KEY = sk-proj-...
6. Retester générateur
```

### Scénario 3 : Clé OpenAI Invalide
```
1. Vérifier crédit OpenAI (platform.openai.com/account/billing)
2. Si pas de crédit: ajouter carte/crédit
3. Ou régénérer nouvelle clé
4. Mettre à jour secret dans Supabase
5. Retester générateur
```

### Scénario 4 : Tout est OK mais ça ne marche pas
```
1. Vérifier les logs Edge Function
2. Regarder la console navigateur (F12)
3. Copier l'erreur exacte
4. Chercher dans ce guide
5. Si introuvable: vérifier status.openai.com
```

---

## Résumé - Ordre d'Exécution

### ✅ À faire DANS L'ORDRE :

**1. Templates (2 min)**
```sql
-- Dans Supabase SQL Editor
-- Exécuter FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql
```

**2. Clé OpenAI (5 min)**
```
- platform.openai.com → Créer clé
- Supabase Secrets → Ajouter OPENAI_API_KEY
```

**3. Test (1 min)**
```
- /backoffice/social-media
- Cliquer "Générer avec IA"
- ✅ Succès !
```

---

## Support

**Logs utiles :**
- Console navigateur (F12 → Console)
- Supabase Edge Functions Logs
- Network tab (F12 → Network)

**Documentation complète :**
- `DEMARRAGE-RAPIDE-IA-SOCIAL.md` - Guide 10 min
- `CONFIGURATION-OPENAI-SUPABASE.md` - Détails complets
- `FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql` - Script SQL

**Status externe :**
- OpenAI API : https://status.openai.com/
- Supabase : https://status.supabase.com/

---

**Date :** 21 Octobre 2025
**Pour :** Diagnostic erreur générateur IA social media
