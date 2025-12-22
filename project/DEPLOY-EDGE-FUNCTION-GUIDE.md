# 🚀 GUIDE DE DÉPLOIEMENT - EDGE FUNCTION

## ✅ PROBLÈME RÉSOLU

**Erreur précédente :**
```
Failed to deploy edge function: Unexpected token `try`
```

**Cause :** Faute de frappe à la ligne 17 : `}<` au lieu de `}`

**Solution :** ✅ CORRIGÉ - Le fichier est maintenant valide

---

## 📋 DÉPLOIEMENT DE LA FONCTION

### Option 1 : Depuis le Dashboard Supabase (Recommandé)

**Étapes :**

1. **Connectez-vous à Supabase**
   - https://supabase.com/dashboard
   - Sélectionnez votre projet "taxiassur-production"

2. **Allez dans Edge Functions**
   - Menu latéral → Edge Functions

3. **Déployez la fonction**
   - Cliquez sur "Deploy a new function"
   - Nom : `generate-seo-content`
   - Uploadez le fichier corrigé : `supabase/functions/generate-seo-content/index.ts`

4. **Configurez le secret OpenAI (obligatoire)**
   - Edge Functions → Secrets
   - Cliquez sur "Add Secret"
   - Nom : `OPENAI_API_KEY`
   - Valeur : votre clé OpenAI (format : `sk-proj-...`)

5. **Testez la fonction**
   - Utilisez le testeur intégré
   - Ou depuis le backoffice : Générateur IA

---

### Option 2 : Via Supabase CLI (Avancé)

**Si vous avez la CLI Supabase installée :**

```bash
# 1. Naviguez vers le projet
cd /tmp/cc-agent/58094969/project

# 2. Liez votre projet
supabase link --project-ref drohhxrkoequjphvabvq

# 3. Déployez la fonction
supabase functions deploy generate-seo-content

# 4. Configurez le secret
supabase secrets set OPENAI_API_KEY=sk-proj-votre-cle-ici
```

---

## 🔑 OBTENIR UNE CLÉ API OPENAI

### Étape 1 : Créer un compte OpenAI

1. Allez sur https://platform.openai.com
2. Créez un compte (ou connectez-vous)
3. Ajoutez un moyen de paiement (nécessaire pour l'API)

### Étape 2 : Générer une clé API

1. Allez dans "API Keys" : https://platform.openai.com/api-keys
2. Cliquez sur "Create new secret key"
3. Nom : "TaxiAssur Production"
4. Copiez la clé (format : `sk-proj-...`)
5. ⚠️ **Sauvegardez-la** car elle ne sera plus visible !

### Étape 3 : Activer GPT-4

La fonction utilise le modèle `gpt-4o` (GPT-4 Optimized).

**Vérifiez que vous avez accès :**
- Playground → Sélectionnez "gpt-4o"
- Si pas d'accès : ajoutez du crédit ($5 minimum)

---

## 💰 COÛTS OPENAI

### Modèle utilisé : gpt-4o

**Tarifs (2025) :**
- Input : $2.50 / 1M tokens
- Output : $10.00 / 1M tokens

**Coût par génération :**

| Type | Mots | Tokens | Coût estimé |
|------|------|--------|-------------|
| Article blog | 2000 | ~3000 | $0.20-0.40 |
| Page ville | 1500 | ~2500 | $0.15-0.30 |
| Comparatif | 1000 | ~1800 | $0.10-0.20 |

**Budget recommandé :**
- Pour tester : $10 (50+ articles)
- Pour production : $50-100/mois (selon usage)

---

## 🧪 TESTER LA FONCTION

### Test 1 : Depuis le Dashboard Supabase

1. Edge Functions → `generate-seo-content`
2. Cliquez sur "Invoke"
3. Body :
   ```json
   {
     "keyword": "assurance taxi",
     "type": "blog",
     "secondaryKeywords": ["devis taxi", "rc professionnelle"]
   }
   ```
4. Cliquez "Invoke"
5. ✅ Vous devriez recevoir un JSON avec le contenu généré

---

### Test 2 : Depuis le Backoffice

1. Allez sur https://taxiassur.com/backoffice/ai-generator
2. Remplissez le formulaire :
   - Type : Article de Blog
   - Mot-clé : "assurance taxi électrique"
   - Mots-clés secondaires : "Tesla, véhicule écologique"
3. Cliquez "Générer le Contenu"
4. Attendez 20-30 secondes
5. ✅ Le contenu s'affiche (texte noir, lisible)

---

### Test 3 : Avec curl

```bash
curl -X POST \
  'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content' \
  -H 'Authorization: Bearer VOTRE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "keyword": "assurance taxi Paris",
    "type": "blog",
    "city": "Paris",
    "secondaryKeywords": ["devis gratuit", "courtier ORIAS"]
  }'
```

---

## ❌ DÉPANNAGE

### Erreur : "OpenAI API key not configured"

**Cause :** Le secret `OPENAI_API_KEY` n'est pas configuré dans Supabase

**Solution :**
1. Supabase Dashboard → Edge Functions → Secrets
2. Ajoutez : `OPENAI_API_KEY` = votre clé OpenAI

---

### Erreur : "Failed to generate content"

**Cause :** Problème avec l'API OpenAI

**Vérifiez :**
1. ✅ Votre clé API est valide
2. ✅ Vous avez du crédit sur votre compte OpenAI
3. ✅ Vous avez accès au modèle `gpt-4o`

**Consulter les logs :**
- Supabase Dashboard → Edge Functions → `generate-seo-content` → Logs

---

### Erreur : "The module's source code could not be parsed"

**Cause :** Erreur de syntaxe dans le code

**Solution :** ✅ CORRIGÉ - Le fichier `index.ts` est maintenant valide

Si l'erreur persiste :
1. Vérifiez qu'il n'y a pas de caractères bizarres
2. Redéployez avec le fichier corrigé

---

### Le texte généré est invisible (blanc sur blanc)

**Cause :** CSS manquant

**Solution :** ✅ CORRIGÉ dans le dernier build

**Vérifiez :**
1. Uploadez le nouveau build (`/dist/*`) sur IONOS
2. Videz le cache du navigateur (Ctrl+F5)
3. Retestez le générateur

---

## 📊 MONITORING

### Consulter les logs

**Supabase Dashboard :**
- Edge Functions → `generate-seo-content`
- Onglet "Logs"
- Vous verrez :
  - Requêtes reçues
  - Erreurs
  - Temps de réponse
  - Tokens utilisés

**Tracking OpenAI :**
- https://platform.openai.com/usage
- Consultez votre consommation
- Fixez des limites de budget

---

## 🎯 CHECKLIST DE DÉPLOIEMENT

- [ ] Fichier `index.ts` corrigé (pas de `}<`)
- [ ] Compte OpenAI créé
- [ ] Clé API OpenAI générée
- [ ] Crédit ajouté sur OpenAI ($5 minimum)
- [ ] Fonction déployée sur Supabase
- [ ] Secret `OPENAI_API_KEY` configuré
- [ ] Test depuis Dashboard : ✅ JSON retourné
- [ ] Test depuis Backoffice : ✅ Contenu visible
- [ ] Logs Supabase consultés : ✅ Pas d'erreur
- [ ] Usage OpenAI surveillé

---

## 🚀 RÉSUMÉ ULTRA-RAPIDE

**Pour déployer :**

1. **Fix appliqué** : Fichier corrigé (ligne 17)
2. **OpenAI** : Créez compte + clé API + crédit
3. **Supabase** :
   - Déployez fonction `generate-seo-content`
   - Ajoutez secret `OPENAI_API_KEY`
4. **Test** : Backoffice → Générateur IA → "Générer"

**Coût :**
- ~$0.20-0.40 par article généré
- Budget recommandé : $10 pour tester

**Statut :**
- ✅ Erreur de syntaxe corrigée
- ✅ Fonction prête à être déployée
- ⏳ En attente de : Clé OpenAI + déploiement

**La fonction est maintenant valide et peut être déployée ! 🎉**
