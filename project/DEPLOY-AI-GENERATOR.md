# 🤖 DÉPLOIEMENT : Générateur IA (Edge Function)

## ❌ **PROBLÈME ACTUEL**

```
GET https://taxiassur.com/.../generate-seo-content
❌ Erreur : "Unexpected token '<', "<!doctype "... is not valid JSON"
```

**Cause** : La fonction Edge `generate-seo-content` n'est **PAS déployée** sur Supabase.

---

## ✅ **SOLUTION : Déployer via Supabase CLI**

### **Étape 1 : Installer Supabase CLI**

**Windows :**
```powershell
scoop install supabase
```

Ou avec npm :
```bash
npm install -g supabase
```

**Mac/Linux :**
```bash
brew install supabase/tap/supabase
```

---

### **Étape 2 : Se connecter à Supabase**

```bash
supabase login
```

Cela ouvrira un navigateur pour vous authentifier.

---

### **Étape 3 : Lier le projet**

```bash
supabase link --project-ref drohhxrkoequjphvabvq
```

**Ref du projet** : `drohhxrkoequjphvabvq` (visible dans l'URL Supabase)

---

### **Étape 4 : Configurer la clé OpenAI**

**IMPORTANT** : La fonction nécessite une clé OpenAI.

1. **Obtenir une clé OpenAI** :
   - Allez sur : https://platform.openai.com/api-keys
   - Créez une nouvelle clé
   - Copiez-la (format : `sk-...`)

2. **Ajouter la clé dans Supabase** :
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-votre-cle-ici
   ```

   Ou via le dashboard :
   - https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/functions
   - **Secrets** → **Add secret**
   - Nom : `OPENAI_API_KEY`
   - Valeur : `sk-...`

---

### **Étape 5 : Déployer la fonction**

Depuis la racine du projet :

```bash
supabase functions deploy generate-seo-content
```

**Sortie attendue** :
```
✓ Bundled generate-seo-content [1.2s]
✓ Deployed generate-seo-content to Supabase
```

---

### **Étape 6 : Vérifier le déploiement**

```bash
supabase functions list
```

**Sortie attendue** :
```
✓ generate-seo-content (deployed)
```

---

## 🧪 **TESTER LA FONCTION**

### **Via curl**

```bash
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"keyword": "assurance taxi paris", "type": "blog"}'
```

**Réponse attendue** (JSON) :
```json
{
  "success": true,
  "content": {
    "title": "...",
    "slug": "...",
    "content": "..."
  },
  "usage": {
    "tokens": 2500,
    "cost": 0.00625
  }
}
```

---

### **Via le backoffice**

1. Allez sur : https://taxiassur.com/backoffice/ai-generator
2. Entrez un mot-clé : `assurance taxi`
3. Cliquez sur **"Générer le Contenu"**
4. ✅ Vous devriez voir le contenu généré !

---

## 📋 **LISTE DES FONCTIONS EDGE À DÉPLOYER**

Votre projet contient **12 fonctions Edge** :

| Fonction | Statut | Action |
|----------|--------|--------|
| `generate-seo-content` | ❌ Non déployée | **PRIORITÉ 1** |
| `chatbot` | ⚠️ À vérifier | Déployer si nécessaire |
| `send-email` | ⚠️ À vérifier | Déployer si nécessaire |
| `auto-followup` | ⚠️ À vérifier | Optionnel |
| `cron-orchestrator` | ⚠️ À vérifier | Optionnel |
| `email-auto-responder` | ⚠️ À vérifier | Optionnel |
| `partner-scraper-outreach` | ⚠️ À vérifier | Optionnel |
| `scan-backlinks` | ⚠️ À vérifier | Optionnel |
| `send-outreach-emails` | ⚠️ À vérifier | Optionnel |
| `webhook-email-receiver` | ⚠️ À vérifier | Optionnel |
| `automation-dashboard-api` | ⚠️ À vérifier | Optionnel |

**Commande pour déployer toutes les fonctions** :
```bash
supabase functions deploy
```

---

## 💰 **COÛTS OPENAI**

**Modèle utilisé** : `gpt-4o`

**Tarif** (au 07/10/2025) :
- Input : $2.50 / 1M tokens
- Output : $10.00 / 1M tokens

**Estimation par génération** :
- Tokens moyens : 2000-3000 tokens
- Coût : ~$0.01-0.02 par génération

**Budget mensuel recommandé** :
- 100 générations/mois = ~$2
- 500 générations/mois = ~$10
- 1000 générations/mois = ~$20

---

## 🔧 **DÉPANNAGE**

### **Erreur : "OpenAI API key not configured"**

La clé OpenAI n'est pas configurée :
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

---

### **Erreur : "Failed to generate content"**

Problème avec l'API OpenAI :
1. Vérifiez que votre clé est valide
2. Vérifiez votre quota OpenAI : https://platform.openai.com/usage
3. Vérifiez les logs :
   ```bash
   supabase functions logs generate-seo-content
   ```

---

### **Erreur : "Unexpected token '<'"**

La fonction n'est PAS déployée :
```bash
supabase functions deploy generate-seo-content
```

---

## 🎯 **ALTERNATIVE : Utiliser le Dashboard Supabase**

Si vous ne voulez pas installer le CLI :

1. **Dashboard** : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
2. **Edge Functions** → **New function**
3. **Nom** : `generate-seo-content`
4. **Copiez-collez** le contenu de `/supabase/functions/generate-seo-content/index.ts`
5. **Deploy**
6. **Settings** → **Secrets** → Ajoutez `OPENAI_API_KEY`

---

## ✅ **RÉSUMÉ**

1. ✅ Installez Supabase CLI : `npm install -g supabase`
2. ✅ Connectez-vous : `supabase login`
3. ✅ Liez le projet : `supabase link --project-ref drohhxrkoequjphvabvq`
4. ✅ Ajoutez la clé OpenAI : `supabase secrets set OPENAI_API_KEY=sk-...`
5. ✅ Déployez : `supabase functions deploy generate-seo-content`
6. ✅ Testez dans le backoffice !

---

## 📞 **BESOIN D'AIDE ?**

Si vous rencontrez des problèmes, partagez :
- Les logs de la console (F12)
- La sortie de `supabase functions list`
- Le message d'erreur complet
