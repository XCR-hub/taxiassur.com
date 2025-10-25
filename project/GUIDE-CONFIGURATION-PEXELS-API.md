# 🖼️ GUIDE CONFIGURATION PEXELS API

## 🎯 Pourquoi Pexels ?

Pexels fournit des **millions d'images gratuites et libres de droits** via son API.

Votre système IA utilise Pexels pour :
- ✅ Ajouter automatiquement des images professionnelles à chaque article
- ✅ Images haute qualité (1920x1080 minimum)
- ✅ 100% libres de droits commerciaux
- ✅ Aucun crédit requis (pas de lien obligatoire)

---

## ⚡ Configuration en 3 Minutes

### ÉTAPE 1 : Créer compte Pexels (1 min)

1. Ouvrez : **https://www.pexels.com/api/**

2. Cliquez sur **"Get Started"** (en haut à droite)

3. Inscrivez-vous avec :
   - Votre email professionnel
   - Un mot de passe
   - Acceptez les conditions

4. **Validez votre email** (vérifiez votre boîte mail)

---

### ÉTAPE 2 : Obtenir votre API Key (30 secondes)

1. Une fois connecté, allez sur : **https://www.pexels.com/api/new/**

2. Remplissez le formulaire :
   ```
   Project Name: TaxiAssur Content Generator
   Project Description: AI content generation with images for insurance website
   Project URL: https://taxiassur.com
   ```

3. Cliquez sur **"Generate API Key"**

4. **COPIEZ IMMÉDIATEMENT** votre clé API (elle ressemble à ça) :
   ```
   abc123xyz456def789ghi012jkl345mno678pqr901stu234vwx567yza890bcd123
   ```

⚠️ **IMPORTANT** : Cette clé ne sera plus visible après ! Sauvegardez-la.

---

### ÉTAPE 3 : Configurer dans Supabase (1 min)

1. Ouvrez Supabase :
   ```
   https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
   ```

2. Allez dans : **Settings** → **Vault** → **Secrets**

3. Cliquez sur **"New secret"**

4. Remplissez :
   ```
   Name : PEXELS_API_KEY
   Secret : [Collez votre clé Pexels ici]
   ```

5. Cliquez **"Save"**

---

## ✅ Vérification

Pour vérifier que la clé fonctionne :

```sql
-- Exécutez dans Supabase SQL Editor
SELECT
  vault.decrypted_secrets
FROM vault.decrypted_secrets
WHERE name = 'PEXELS_API_KEY';
```

**Résultat attendu** : Vous devriez voir votre clé API.

---

## 🧪 Test Manuel

Testez la génération d'image maintenant :

1. Ouvrez le **Backoffice TaxiAssur** : https://taxiassur.com/admin

2. Allez dans **Générateur IA**

3. Remplissez :
   ```
   Mode : Unifié
   Mot-clé : assurance taxi Paris
   Ville : Paris
   ```

4. Cliquez **"Générer"**

5. Attendez 30-40 secondes

6. **Vérifiez l'article généré** :
   - Doit avoir une image featured_image
   - Image doit être une URL Pexels (commence par https://images.pexels.com)

---

## 📊 Limites API Pexels

### Plan Gratuit (suffisant pour vous)

- ✅ **200 requêtes par heure**
- ✅ **20 000 requêtes par mois**
- ✅ Images illimitées
- ✅ Aucune attribution requise

### Votre Usage Estimé

Si vous générez **1 article par jour** :
- 30 requêtes par mois
- **Largement sous la limite gratuite** ✅

Si vous générez **10 articles par jour** :
- 300 requêtes par mois
- **Toujours OK** ✅

---

## 🔧 Dépannage

### Problème : "Pexels API key not configured"

**Cause** : La clé n'est pas dans Supabase Vault

**Solution** :
1. Vérifiez que vous avez bien créé le secret `PEXELS_API_KEY`
2. Nom exact (sensible à la casse)
3. Redéployez les Edge Functions si nécessaire

---

### Problème : "Pexels API error: 401"

**Cause** : Clé API invalide ou expirée

**Solution** :
1. Vérifiez votre clé sur : https://www.pexels.com/api/
2. Générez une nouvelle clé si nécessaire
3. Mettez à jour le secret dans Supabase Vault

---

### Problème : "Pexels API error: 429"

**Cause** : Trop de requêtes (limite dépassée)

**Solution** :
- Attendez 1 heure (les limites se réinitialisent)
- Si récurrent : Passez au plan Pro Pexels (99$/mois, 20000/heure)

---

### Problème : Articles générés sans image

**Cause** : Recherche trop spécifique, pas de photo trouvée

**Ce qui se passe** :
1. Recherche Pexels avec mot-clé + ville
2. Si 0 résultat → Recherche fallback "taxi"
3. Si toujours 0 → Article sans image

**Solution** :
- Normal, pas grave
- L'article est quand même généré
- Image sera ajoutée manuellement si besoin

---

## 📈 Monitoring Usage Pexels

Pour voir votre consommation API :

1. Connectez-vous : https://www.pexels.com/api/

2. Allez dans **"Your API Keys"**

3. Cliquez sur votre clé API

4. Voyez les stats :
   - Requêtes du jour
   - Requêtes du mois
   - Limite restante

---

## 🎨 Personnalisation Images

Par défaut, le système recherche :
```
"taxi professional [ville]"
```

Pour personnaliser les recherches, modifiez l'edge function :
```typescript
// supabase/functions/generate-seo-content/index.ts
// Ligne ~28
const searchQuery = customPrompt || `taxi professional ${city}`;
```

Exemples de mots-clés qui fonctionnent bien :
- `"yellow cab city"`
- `"taxi driver business"`
- `"professional transportation"`
- `"taxi service urban"`

---

## ✅ Checklist Finale

- [ ] Compte Pexels créé et email validé
- [ ] API Key obtenue et sauvegardée
- [ ] Secret PEXELS_API_KEY configuré dans Supabase Vault
- [ ] Test de génération réussi avec image
- [ ] Article backoffice affiche l'image

---

## 🚀 Résultat Attendu

**Après configuration** :

Chaque article généré aura :
- ✅ Une image featured haute qualité
- ✅ Alt text optimisé SEO
- ✅ Image pertinente au sujet
- ✅ 100% libre de droits
- ✅ Chargement rapide (CDN Pexels)

**Exemple d'article avec image** :
```json
{
  "title": "Assurance Taxi Paris : Guide Complet 2025",
  "featuredImage": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?auto=compress&cs=tinysrgb&w=1920",
  "imageAlt": "Assurance taxi Paris - Taxi parisien professionnel"
}
```

---

## 📞 Support

Questions sur Pexels API ?
- Documentation : https://www.pexels.com/api/documentation/
- Support : https://help.pexels.com/hc/en-us

---

## 💡 Alternatives

Si Pexels ne convient pas, alternatives gratuites :

1. **Unsplash API** (https://unsplash.com/developers)
   - 50 requêtes/heure gratuit
   - Très haute qualité
   - Attribution recommandée

2. **Pixabay API** (https://pixabay.com/api/docs/)
   - 100 requêtes/minute gratuit
   - Bonne qualité
   - 100% libre de droits

3. **Placeholder Images** (https://placehold.co)
   - Illimité gratuit
   - Placeholder temporaire
   - Pas de vraies photos

---

## 🎉 C'est Prêt !

Une fois configuré :
- ✅ Génération automatique d'images
- ✅ 0 effort manuel
- ✅ Articles plus professionnels
- ✅ Meilleur SEO (images = ranking boost)
- ✅ 100% gratuit jusqu'à 20k/mois

**Temps total** : 3 minutes de configuration pour des mois d'images automatiques ! 🚀
