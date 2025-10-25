# 🔍 DIAGNOSTIC : Images Pexels Non Affichées

## ✅ Ce qui est CORRECT

Après analyse complète du code :

### 1. Edge Function `generate-seo-content` ✅
```typescript
// Ligne 254 : Génère l'image Pexels
const featuredImage = await generatePexelsImage(keyword, targetCity, imagePrompt);

// Lignes 256-262 : Ajoute l'image au contenu
if (featuredImage) {
  content.blogPost.featuredImage = featuredImage;
  content.blogPost.imageAlt = `${keyword} à ${targetCity} - Photo professionnelle`;
}
```

### 2. Interface TypeScript ✅
```typescript
// AIContentGeneratorUnified.tsx ligne 16
featuredImage?: string;
imageAlt?: string;
```

### 3. Sauvegarde Database ✅
```typescript
// Ligne 184 : Sauvegarde dans Supabase
featured_image: generatedContent.blogPost?.featuredImage || null
```

### 4. Affichage UI ✅
```tsx
// Lignes 569-586 : Affiche l'image dans l'aperçu
{generatedContent.blogPost?.featuredImage && (
  <img src={generatedContent.blogPost.featuredImage} />
)}
```

### 5. Affichage Blog Post ✅
```tsx
// BlogPost.tsx lignes 164-172
{post.coverImage && (
  <img src={post.coverImage} alt={post.title} />
)}
```

### 6. Mapping Database ✅
```typescript
// content.ts ligne 161
coverImage: item.featured_image || null
```

---

## 🎯 LE VRAI PROBLÈME

Le code est **parfaitement configuré**. Le problème est que :

1. **L'image est générée** par Pexels
2. **MAIS** elle n'apparaît pas dans l'aperçu frontend
3. **ET** elle n'est pas dans les articles publiés

### Causes Possibles

#### A) Pexels API Key Non Configurée dans Edge Function
```bash
# Vérifier dans Supabase Dashboard
Settings → Edge Functions → Environment Variables
→ Chercher : PEXELS_API_KEY
```

#### B) L'Image est Générée mais Console la Log Seulement
```typescript
// Ligne 257 : Log mais pas visible frontend
console.log('✅ Image générée:', featuredImage);
```

#### C) CORS ou Sécurité Bloque l'URL Pexels
Les URLs Pexels commencent par `https://images.pexels.com/...`
Peut être bloqué par CSP (Content Security Policy)

---

## 🔧 SOLUTION : 3 Étapes de Diagnostic

### ÉTAPE 1 : Vérifier Clé Pexels dans Supabase

**Action** :
1. Supabase Dashboard
2. Settings → Vault → Secrets
3. Chercher `PEXELS_API_KEY`

**Résultat Attendu** :
```
✅ Secret "PEXELS_API_KEY" existe
✅ Valeur commence par "YOUR_PEXELS_API_KEY..."
```

**Si Non Configuré** :
1. Aller sur https://www.pexels.com/api/
2. Créer compte (gratuit)
3. Copier API Key
4. Vault → New Secret → Name: `PEXELS_API_KEY`

---

### ÉTAPE 2 : Tester Edge Function Manuellement

**Action** : Créer fichier `test-pexels-api.http`

```http
POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content
Content-Type: application/json
Authorization: Bearer VOTRE_ANON_KEY

{
  "keyword": "assurance taxi",
  "city": "Paris",
  "imagePrompt": "taxi professionnel moderne",
  "mode": "unified"
}
```

**Résultat Attendu** :
```json
{
  "success": true,
  "content": {
    "blogPost": {
      "title": "...",
      "featuredImage": "https://images.pexels.com/photos/123/pexels-photo-123.jpeg",
      "imageAlt": "assurance taxi à Paris - Photo professionnelle"
    }
  }
}
```

**Si `featuredImage: null`** :
→ Problème dans Edge Function

**Si `featuredImage: "https://..."`** :
→ Problème dans Frontend

---

### ÉTAPE 3 : Vérifier Logs Edge Function

**Action** :
1. Supabase Dashboard
2. Edge Functions → `generate-seo-content`
3. Logs → Filtrer dernières 24h

**Chercher** :
```
✅ "🖼️ Génération image Pexels..."
✅ "✅ Image générée: https://images.pexels.com..."
```

**OU** :
```
⚠️ "⚠️ Pexels API key not configured"
❌ "❌ Pexels API error: 401"
```

---

## 🛠️ CORRECTIONS SELON DIAGNOSTIC

### CAS 1 : Clé Pexels Manquante

**Symptôme** :
```
⚠️ Pexels API key not configured, skipping image generation
```

**Solution** :
```bash
1. https://www.pexels.com/api/
2. Sign Up (gratuit)
3. Get API Key
4. Supabase Vault → PEXELS_API_KEY
```

---

### CAS 2 : Clé Pexels Invalide

**Symptôme** :
```
❌ Pexels API error: 401
```

**Solution** :
1. Régénérer clé sur Pexels.com
2. Mettre à jour Supabase Vault
3. Redéployer Edge Function :
```bash
supabase functions deploy generate-seo-content
```

---

### CAS 3 : Image Générée mais Pas Visible Frontend

**Symptôme** :
- Logs montrent `✅ Image générée: https://...`
- Mais aperçu vide dans UI

**Solution** : Vérifier CSP Headers

```typescript
// Ajouter dans vite.config.ts
server: {
  headers: {
    'Content-Security-Policy': "img-src 'self' https://images.pexels.com data: blob:"
  }
}
```

---

### CAS 4 : Image dans Aperçu mais Pas dans Blog

**Symptôme** :
- Aperçu générateur IA montre image
- Page blog article ne montre pas image

**Solution** : Vérifier Database

```sql
-- Vérifier si featured_image est sauvegardé
SELECT
  id,
  title,
  featured_image,
  LENGTH(featured_image) as url_length
FROM blog_posts
WHERE published = true
ORDER BY created_at DESC
LIMIT 5;
```

**Si `featured_image` est NULL** :
→ Problème dans fonction `publishAll()`

**Si `featured_image` a une URL** :
→ Problème dans composant `BlogPost.tsx`

---

## 🧪 TEST COMPLET : Générer Article avec Image

### Test Manuel Complet

1. **Aller sur** : `/backoffice/ai-generator`

2. **Remplir** :
   - Mot-clé : `assurance taxi pas cher`
   - Ville : `Marseille`
   - Prompt image : `taxi moderne Mercedes classe E noir, photo professionnelle, haute qualité`

3. **Cliquer** : "Générer TOUT le Contenu"

4. **Attendre** : 30-60 secondes

5. **Vérifier Aperçu** :
   ```
   ✅ Section "Image SEO Générée" visible
   ✅ Image affichée (1920x1080 Pexels)
   ✅ Alt SEO présent
   ```

6. **Cliquer** : "Enregistrer et Publier TOUT"

7. **Aller sur** : `/blog`

8. **Ouvrir dernier article**

9. **Vérifier** :
   ```
   ✅ Image en haut de l'article
   ✅ Haute résolution
   ✅ Alt tag correct
   ```

---

## 📊 CHECKLIST FINALE

### Configuration
- [ ] Compte Pexels créé
- [ ] API Key obtenue (commençant par `YOUR_PEXELS_API_KEY...`)
- [ ] PEXELS_API_KEY ajouté dans Supabase Vault
- [ ] Edge Function redéployée (optionnel si nouvelle clé)

### Tests Backend
- [ ] Logs Edge Function montrent "✅ Image générée"
- [ ] Test API retourne `featuredImage: "https://images.pexels.com/..."`
- [ ] Aucune erreur 401 ou 403 dans logs

### Tests Frontend
- [ ] Aperçu générateur IA affiche image
- [ ] Section "Image SEO Générée" visible
- [ ] Image cliquable et haute résolution

### Tests Database
- [ ] `featured_image` sauvegardé en DB (non NULL)
- [ ] URL commence par `https://images.pexels.com/`
- [ ] Colonne existe et bon type (text ou varchar)

### Tests Publication
- [ ] Page blog liste affiche image (card)
- [ ] Page article affiche image en tête
- [ ] Image responsive sur mobile
- [ ] Alt tag SEO présent

---

## 🎯 SOLUTION RAPIDE (TL;DR)

**Vous dites** : "Pexels tout est ok de mon côté... je pense qu'il génère bien les images"

**Donc le problème est** : L'image est générée MAIS pas visible frontend

**Diagnostic Express** :

1. **Ouvrir Console Navigateur** (F12) sur `/backoffice/ai-generator`

2. **Générer un article test**

3. **Chercher dans Console** :
   ```javascript
   // Chercher l'objet retourné par Edge Function
   {
     success: true,
     content: {
       blogPost: {
         featuredImage: ??? // NULL ou URL ?
       }
     }
   }
   ```

4. **SI `featuredImage: null`** :
   → Problème Edge Function (clé Pexels)

5. **SI `featuredImage: "https://images.pexels.com/..."`** :
   → Problème Frontend (composant ou CSP)

---

## 🔧 FIX IMMÉDIAT : Forcer Affichage Image

Si l'image est générée mais pas visible, ajouter debug :

```typescript
// Dans AIContentGeneratorUnified.tsx ligne 113
const data = await response.json();
console.log('🖼️ DEBUG IMAGE:', {
  hasImage: !!data.content?.blogPost?.featuredImage,
  imageUrl: data.content?.blogPost?.featuredImage?.substring(0, 50)
});
```

Puis regénérer un article et vérifier console.

---

## 📞 BESOIN D'AIDE ?

**Envoyez-moi** :
1. Screenshot aperçu générateur IA après génération
2. Screenshot page blog article
3. Logs Supabase Edge Function (dernières 10 lignes)
4. Résultat SQL : `SELECT featured_image FROM blog_posts LIMIT 1;`

Je diagnostiquerai exactement le problème ! 🚀
