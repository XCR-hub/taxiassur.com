# 🔍 DEBUG PEXELS - CLÉ CONFIGURÉE MAIS PAS D'IMAGE

## ✅ CONFIRMÉ : PEXELS_API_KEY existe dans Vault

Screenshot montre : `PEXELS_API_KEY` dans la liste des secrets Supabase.

**Donc le problème n'est PAS la configuration.**

---

## 🎯 DIAGNOSTIC URGENT

### Étapes de Diagnostic

#### 1. VÉRIFIER LOGS EDGE FUNCTION (2 minutes)

**Action** :
1. Supabase Dashboard → https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
2. Menu gauche → **Edge Functions**
3. Cliquer sur → **generate-seo-content**
4. Onglet → **Logs**
5. Chercher dernière génération (aujourd'hui)

**Chercher ces messages** :

```
✅ SUCCÈS :
   "🖼️ Génération image Pexels..."
   "✅ Image générée: https://images.pexels.com/..."

❌ ERREURS :
   "⚠️ Pexels API key not configured"
   "❌ Pexels API error: 401"
   "❌ Pexels API error: 403"
   "❌ Error generating Pexels image"
```

---

#### 2. TEST DIRECT API PEXELS

**Vérifier que la clé Pexels est valide** :

```bash
# Test depuis terminal (remplacer YOUR_KEY par votre vraie clé)
curl -H "Authorization: YOUR_PEXELS_API_KEY" \
  "https://api.pexels.com/v1/search?query=taxi&per_page=1"
```

**Résultat attendu** :
```json
{
  "page": 1,
  "per_page": 1,
  "photos": [
    {
      "id": 123456,
      "src": {
        "large2x": "https://images.pexels.com/..."
      }
    }
  ]
}
```

**Si erreur 401** : Clé invalide ou expirée

---

#### 3. VÉRIFIER EDGE FUNCTION REÇOIT LA CLÉ

**Ajouter log temporaire dans Edge Function** :

```typescript
// Dans generate-seo-content/index.ts ligne 11
const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');

console.log('🔑 PEXELS KEY STATUS:', {
  exists: !!PEXELS_API_KEY,
  length: PEXELS_API_KEY?.length,
  firstChars: PEXELS_API_KEY?.substring(0, 10) + '...'
});
```

Puis redéployer et tester.

---

## 🛠️ SOLUTIONS SELON LOGS

### CAS 1 : "⚠️ Pexels API key not configured"

**Problème** : Edge Function ne reçoit pas le secret

**Causes possibles** :
1. Secret pas accessible aux Edge Functions
2. Nom exact différent (majuscules/minuscules)
3. Edge Function pas redéployée après ajout secret

**Solution** :

```bash
# Redéployer Edge Function pour qu'elle charge le nouveau secret
supabase functions deploy generate-seo-content --no-verify-jwt
```

OU via CLI si disponible.

---

### CAS 2 : "❌ Pexels API error: 401"

**Problème** : Clé invalide ou expirée

**Solution** :
1. https://www.pexels.com/api/
2. Se connecter
3. Dashboard → Regenerate API Key
4. Mettre à jour Vault :
   - Delete old secret
   - Create new secret with new key

---

### CAS 3 : "✅ Image générée" MAIS pas visible frontend

**Problème** : Image générée mais pas affichée

**Causes possibles** :
1. CSP (Content Security Policy) bloque images Pexels
2. Composant React ne reçoit pas l'URL
3. Erreur réseau frontend

**Solution** :

Vérifier console navigateur (F12) :
```javascript
// Chercher le debug log ajouté
🖼️ DEBUG IMAGE PEXELS: {
  hasImage: true/false,
  imageUrl: "https://..."
}
```

Si `hasImage: false` → Backend ne retourne pas l'image
Si `hasImage: true` → Frontend a l'URL mais ne l'affiche pas

---

### CAS 4 : Aucun log image du tout

**Problème** : Code Pexels pas exécuté

**Causes possibles** :
1. Mode pas "unified"
2. Edge Function ancienne version
3. Erreur avant génération image

**Solution** :
Vérifier version déployée Edge Function correspond au code actuel.

---

## 🧪 TEST MANUEL IMMÉDIAT

### Générer Contenu avec Debug

1. **Ouvrir** : https://taxiassur.com/backoffice/ai-generator

2. **Console** : F12 (onglet Console)

3. **Remplir** :
   ```
   Mot-clé : assurance taxi
   Ville : Lyon
   Prompt image : taxi moderne
   ```

4. **Générer** et attendre 30-60 sec

5. **Console** : Chercher "🖼️ DEBUG IMAGE PEXELS"

6. **Noter résultat** :
   ```
   hasImage: true/false ?
   imageUrl: "..." ?
   ```

7. **Supabase Logs** : Vérifier logs Edge Function en même temps

---

## 📊 MATRICE DE DIAGNOSTIC

| Console Browser | Supabase Logs | Problème | Solution |
|----------------|---------------|----------|----------|
| `hasImage: false` | "key not configured" | Secret pas chargé | Redéployer function |
| `hasImage: false` | "error 401" | Clé invalide | Régénérer clé |
| `hasImage: false` | "error 403" | Quota dépassé | Vérifier usage |
| `hasImage: false` | Aucun log image | Code pas exécuté | Vérifier version |
| `hasImage: true` | "✅ Image générée" | Affichage frontend | Vérifier CSP/React |

---

## 🚀 ACTION IMMÉDIATE

**FAIRE MAINTENANT** :

1. ⏱️ **1 minute** : Vérifier logs Edge Function
   - Chercher dernière génération
   - Noter message Pexels

2. ⏱️ **1 minute** : Test générateur avec console ouverte
   - F12 → Console
   - Générer contenu
   - Noter hasImage true/false

3. ⏱️ **30 secondes** : M'envoyer résultats :
   - Message logs Supabase (copier/coller)
   - hasImage true ou false
   - Screenshot console si possible

---

## 🎯 PROCHAINES ÉTAPES

Selon vos résultats, je vous donnerai la solution EXACTE :

- Si logs = "not configured" → Redéployer function
- Si logs = "401" → Régénérer clé
- Si hasImage = true → Fix affichage frontend
- Si aucun log → Vérifier version function

**Faites le test maintenant et envoyez-moi les résultats !** 🚀
