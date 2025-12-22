# 🔧 FIX GÉNÉRATEUR IA - ERREUR JSON

## 🐛 PROBLÈME IDENTIFIÉ

**Erreur affichée :**
```
Unexpected token '<', "<!doctype "... is not valid JSON
```

**Cause :**
L'Edge Function `generate-seo-content` retourne du HTML au lieu de JSON, ce qui signifie qu'elle **n'est PAS déployée** ou **pas accessible**.

---

## ✅ SOLUTION : DÉPLOYER LA FONCTION

### MÉTHODE 1 : Via Supabase CLI (Recommandé)

**Prérequis :**
```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref viuuznfqkauatkjcegcj
```

**Déploiement :**
```bash
# Depuis la racine du projet
supabase functions deploy generate-seo-content

# Vérifier le déploiement
supabase functions list
```

**Résultat attendu :**
```
✓ Deployed Function generate-seo-content
URL: https://viuuznfqkauatkjcegcj.supabase.co/functions/v1/generate-seo-content
```

---

### MÉTHODE 2 : Via Dashboard Supabase

1. **Dashboard** → https://supabase.com/dashboard/project/viuuznfqkauatkjcegcj
2. **Edge Functions** (menu gauche)
3. **New Function** → "generate-seo-content"
4. **Copiez-collez** : `supabase/functions/generate-seo-content/index.ts`
5. **Deploy**

---

## ⚙️ CONFIGURATION OPENAI API KEY

**IMPORTANT :** La fonction nécessite une clé OpenAI.

### Ajouter la clé dans Supabase :

1. **Dashboard Supabase** → **Settings**
2. **Vault** (ou **Secrets**)
3. **New Secret** :
   - Name: `OPENAI_API_KEY`
   - Value: `sk-...` (votre clé OpenAI)
4. **Save**

**Vérifier :**
```bash
# Via CLI
supabase secrets list

# Doit afficher :
OPENAI_API_KEY=sk-...
```

---

## 🧪 TEST DE LA FONCTION

### Test via CURL :

```bash
curl -X POST \
  'https://viuuznfqkauatkjcegcj.supabase.co/functions/v1/generate-seo-content' \
  -H 'Authorization: Bearer VOTRE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "keyword": "assurance taxi",
    "type": "blog",
    "secondaryKeywords": ["devis gratuit", "RC pro"]
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "content": {
    "title": "...",
    "content": "...",
    "slug": "..."
  },
  "usage": {
    "tokens": 3500,
    "cost": 0.00875
  }
}
```

**Si erreur "OpenAI API key not configured" :**
→ Vérifiez que la clé est bien dans Supabase Secrets

---

## 🎯 TEST DANS LE BACKOFFICE

1. **Backoffice** → **Générateur de Contenu IA**
2. Remplissez :
   - Type : Article de Blog
   - Mot-clé : "assurance taxi"
   - Mots-clés secondaires : "devis gratuit"
3. **Générer le Contenu**
4. ✅ Attendez 20-30 secondes
5. ✅ Le contenu doit s'afficher

**Résultat :**
- Titre généré
- Contenu HTML complet
- Slug URL-friendly
- Meta description
- FAQ

---

## 🚨 ERREURS COURANTES

### Erreur 1 : "Unexpected token '<'"
**Cause :** Fonction pas déployée
**Solution :** Déployez via CLI ou Dashboard

### Erreur 2 : "OpenAI API key not configured"
**Cause :** Clé API manquante
**Solution :** Ajoutez dans Supabase Secrets

### Erreur 3 : "Failed to generate content"
**Cause :** Erreur OpenAI (quota dépassé, clé invalide)
**Solution :** 
- Vérifiez votre compte OpenAI
- Vérifiez les crédits disponibles
- Vérifiez que la clé est valide

### Erreur 4 : CORS Error
**Cause :** Headers CORS manquants
**Solution :** La fonction a déjà les headers CORS, redéployez

---

## 📁 FICHIERS DE LA FONCTION

**Localisation :**
```
supabase/functions/generate-seo-content/index.ts
```

**Contenu :**
- ✅ CORS headers configurés
- ✅ Validation des inputs
- ✅ 3 types de contenu (blog, city, comparison)
- ✅ Prompts optimisés pour contenu humain
- ✅ Gestion d'erreurs complète

---

## ✅ CHECKLIST DÉPLOIEMENT

- [ ] Supabase CLI installé et connecté
- [ ] Projet lié : `viuuznfqkauatkjcegcj`
- [ ] Fonction déployée : `supabase functions deploy generate-seo-content`
- [ ] Clé OpenAI ajoutée dans Secrets
- [ ] Test CURL réussi (retourne JSON)
- [ ] Test backoffice réussi (contenu généré)

---

## 🎓 UTILISATION AVANCÉE

### Personnaliser les prompts :

Éditez `supabase/functions/generate-seo-content/index.ts` :

```typescript
// Ligne 49 : Prompt pour articles de blog
// Ligne 140 : Prompt pour pages ville
// Ligne 189 : Prompt pour comparatifs
```

**Après modification :**
```bash
supabase functions deploy generate-seo-content
```

### Monitorer l'utilisation :

```bash
# Logs en temps réel
supabase functions logs generate-seo-content --tail

# Voir les erreurs
supabase functions logs generate-seo-content --level error
```

---

## 💰 COÛT ESTIMÉ

**Avec GPT-4o :**
- Token moyen : 3000-4000 tokens
- Coût : 0.008-0.01€ par génération
- 100 articles : ~1€
- 1000 articles : ~10€

**Optimisation :**
- Utilisez GPT-4o-mini pour réduire les coûts (2x moins cher)
- Cachez les résultats pour éviter les re-générations

---

## 📞 SUPPORT

**Si problème persiste :**

1. Vérifiez les logs :
```bash
supabase functions logs generate-seo-content
```

2. Testez avec CURL (voir section Test)

3. Vérifiez :
   - Fonction déployée : `supabase functions list`
   - Secrets configurés : `supabase secrets list`
   - Crédits OpenAI : https://platform.openai.com/usage

---

**RÉSULTAT FINAL :**

✅ Générateur IA fonctionnel
✅ 3 types de contenu (blog, ville, comparatif)
✅ Contenu humain et SEO-optimisé
✅ Génération en 20-30 secondes
✅ Coût : ~0.01€ par article

**Prêt à générer du contenu ! 🚀**
