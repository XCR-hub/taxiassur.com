# Configuration OpenAI dans Supabase

## Problème
L'Edge Function `ai-viral-content-generator` retourne une **erreur 500** lors de la génération IA dans le backoffice.

## Causes Principales

### 1. Clé OpenAI Manquante ⚠️
La clé `OPENAI_API_KEY` n'est PAS configurée dans Supabase Edge Functions.

**Comment vérifier :**
```typescript
// Dans l'Edge Function (ligne 36-40)
const openaiKey = Deno.env.get("OPENAI_API_KEY");

if (!openaiKey) {
  throw new Error("OPENAI_API_KEY not configured");
  // ❌ C'est ici que ça échoue si la clé n'existe pas
}
```

### 2. Templates Viraux Manquants
Aucun template dans la table `viral_templates` = fonction `get_viral_template` retourne vide.

## Solution Complète

### ÉTAPE 1 : Créer une Clé OpenAI

1. **Aller sur** : https://platform.openai.com/api-keys
2. **Se connecter** avec votre compte OpenAI
3. **Cliquer** : "Create new secret key"
4. **Nom** : `TaxiAssur-Production`
5. **Permissions** : `All` (ou au minimum `Model capabilities`)
6. **Copier** la clé : `sk-proj-...` (⚠️ Ne sera affichée qu'une fois !)

**Important :** Vous devez avoir un compte OpenAI avec :
- Crédit disponible ou carte bancaire enregistrée
- Accès à `gpt-4` (ou au moins `gpt-3.5-turbo`)

### ÉTAPE 2 : Configurer la Clé dans Supabase

#### Option A : Via Dashboard (Recommandé)
1. **Aller sur** : https://supabase.com/dashboard
2. **Sélectionner** votre projet `TaxiAssur`
3. **Aller dans** : Settings → Edge Functions
4. **Section** : "Secrets and Environment Variables"
5. **Cliquer** : "Add secret"
6. **Nom** : `OPENAI_API_KEY`
7. **Valeur** : `sk-proj-...votre-clé-complète...`
8. **Save**

#### Option B : Via Supabase CLI
```bash
# Si vous utilisez Supabase CLI localement
supabase secrets set OPENAI_API_KEY=sk-proj-...votre-clé...

# Lister les secrets pour vérifier
supabase secrets list
```

### ÉTAPE 3 : Insérer les Templates Viraux

**Copier/coller le fichier SQL** : `FIX-GENERATEUR-IA-SOCIAL-MEDIA.sql`

Dans : **Supabase Dashboard → SQL Editor → RUN**

Cela insèrera 5 templates viraux testés :
- ✅ Question Choc (7.2M vues moyennes)
- ✅ Histoire Personnelle (5.8M vues)
- ✅ Top 5 Erreurs (8.5M vues)
- ✅ Avant/Après (6.4M vues)
- ✅ Mythe vs Réalité (7.8M vues)

### ÉTAPE 4 : Redéployer les Edge Functions (Optionnel)

Si vous avez modifié des Edge Functions, redéployez-les :

```bash
# Via Supabase CLI
supabase functions deploy ai-viral-content-generator

# Ou redéployer toutes
supabase functions deploy
```

⚠️ **Normalement pas nécessaire** si vous ajoutez juste un secret.

## Vérification

### Test 1 : Vérifier les Templates en Base

```sql
-- Dans Supabase SQL Editor
SELECT COUNT(*) FROM viral_templates WHERE is_active = true;
-- Résultat attendu : 5
```

### Test 2 : Tester la Fonction RPC

```sql
SELECT * FROM get_viral_template('assurance');
-- Doit retourner au moins 1 template
```

### Test 3 : Tester l'Edge Function

```bash
# Via curl (remplacer YOUR-PROJECT-URL et YOUR-ANON-KEY)
curl -X POST \
  'https://YOUR-PROJECT-URL.supabase.co/functions/v1/ai-viral-content-generator' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR-ANON-KEY' \
  -d '{
    "category": "assurance",
    "topic": "économies assurance taxi",
    "platforms": ["linkedin"],
    "auto_publish": false
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "posts": [...],
  "template_used": "Question Choc - Assurance",
  "viral_potential": "7.2M+ vues",
  "humanization_score": 85,
  "message": "1 publication(s) générée(s) avec succès"
}
```

### Test 4 : Interface Backoffice

1. Aller sur : `https://taxiassur.com/backoffice/social-media`
2. Cliquer sur : **"Générer avec IA"**
3. Attendre 5-10 secondes
4. ✅ Message de succès avec le contenu généré

## Coûts OpenAI

**Modèle utilisé :** `gpt-4`

**Coût par génération :**
- Input : ~200 tokens ≈ $0.006
- Output : ~500 tokens ≈ $0.030
- **Total : ~$0.036 par génération**

**Estimation mensuelle :**
- 10 générations/jour × 30 jours = 300 générations
- **Coût : ~$11/mois**

**Alternative économique :**
Modifier l'Edge Function pour utiliser `gpt-3.5-turbo` :
```typescript
// Ligne 69 dans ai-viral-content-generator/index.ts
model: "gpt-3.5-turbo",  // Au lieu de "gpt-4"
// Coût divisé par 10 : ~$1/mois au lieu de ~$11/mois
```

## Dépannage

### Erreur : "OPENAI_API_KEY not configured"
➡️ La clé n'est pas configurée dans Supabase Secrets.
**Solution :** Suivre ÉTAPE 2 ci-dessus.

### Erreur : "No viral template found"
➡️ Aucun template dans la table `viral_templates`.
**Solution :** Exécuter `FIX-GENERATEUR-IA-SOCIAL-MEDIA.sql`.

### Erreur : "Incorrect API key provided"
➡️ La clé OpenAI est invalide ou expirée.
**Solution :** Régénérer une nouvelle clé sur https://platform.openai.com/api-keys

### Erreur : "You exceeded your current quota"
➡️ Pas de crédit OpenAI ou limite dépassée.
**Solution :** Ajouter du crédit sur https://platform.openai.com/account/billing

### Erreur 500 persistante
1. Vérifier les logs Edge Function :
   - Supabase Dashboard → Edge Functions → Logs
   - Chercher `ai-viral-content-generator`
2. Regarder l'erreur exacte
3. Vérifier que tous les secrets sont configurés

## Sécurité

⚠️ **JAMAIS** mettre la clé OpenAI dans :
- ❌ Le code source (`/src`)
- ❌ Le fichier `.env` (sauf local)
- ❌ Les commits Git
- ❌ Le frontend

✅ **TOUJOURS** utiliser :
- ✅ Supabase Secrets (Edge Functions)
- ✅ Variables d'environnement serveur uniquement
- ✅ Accès via Edge Functions (backend)

## Support

Si le problème persiste :
1. Copier les logs d'erreur de la console navigateur (F12)
2. Vérifier les logs Supabase Edge Functions
3. Partager l'erreur exacte pour diagnostic
