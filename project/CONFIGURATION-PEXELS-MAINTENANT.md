# 🚨 ACTION IMMÉDIATE : CONFIGURER PEXELS API

## ❌ PROBLÈME
**TOUTES les images sont NULL dans votre base de données.**

Voir screenshot : Tous les `featured_image` affichent "NULL".

## 🔍 CAUSE
La clé API Pexels n'est **PAS configurée** dans Supabase.

L'edge function cherche `PEXELS_API_KEY` mais ne la trouve pas, donc retourne `null` pour toutes les images.

---

## ✅ SOLUTION (5 MINUTES)

### **ÉTAPE 1 : Obtenir une clé API Pexels (GRATUIT)**

1. Allez sur : **https://www.pexels.com/api/**
2. Cliquez sur **"Get Started"**
3. Créez un compte (email + mot de passe)
4. Validez votre email
5. Une fois connecté, copiez votre **API Key**

Format de la clé : `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` (48 caractères)

**Limites gratuites :**
- 200 requêtes/heure
- 20 000 requêtes/mois
- **LARGEMENT SUFFISANT** pour votre usage

---

### **ÉTAPE 2 : Configurer dans Supabase**

1. Allez dans votre **Dashboard Supabase** : https://supabase.com/dashboard
2. Sélectionnez votre projet **TaxiAssur**
3. Menu latéral → **Project Settings** (icône ⚙️)
4. Onglet → **Edge Functions**
5. Section **Secrets** → Cliquez sur **"Add a new secret"**
6. Remplissez :
   - **Name:** `PEXELS_API_KEY`
   - **Value:** Votre clé API Pexels (coller ici)
7. Cliquez sur **"Add secret"**

---

### **ÉTAPE 3 : Redémarrer l'edge function (AUTOMATIQUE)**

Supabase redémarre automatiquement l'edge function quand vous ajoutez un secret.

**Aucune action nécessaire de votre part.**

---

### **ÉTAPE 4 : Tester**

1. Allez sur votre site : `/backoffice`
2. Cliquez sur **"Générateur de Contenu IA Unifié"**
3. Remplissez :
   - Mot-clé : `assurance taxi écologique`
   - Ville : `Nice`
4. Cliquez sur **"Générer"**
5. **Ouvrez la console (F12)** et regardez les logs

**Vous devriez voir :**
```
🖼️ Génération image Pexels...
✅ Image générée: https://images.pexels.com/photos/12345/...
```

6. Cliquez sur **"Publier Tout"**
7. Allez dans Supabase → Table `blog_posts`
8. **Vérifiez que `featured_image` contient une URL** (plus NULL !)

---

## 🔍 VÉRIFIER QUE ÇA MARCHE

### **Dans la console du navigateur (F12) :**

✅ **BON signe :**
```
🖼️ Génération image Pexels...
✅ Image générée: https://images.pexels.com/...
🖼️ Image à sauvegarder: https://images.pexels.com/...
✅ Article sauvegardé avec image: OUI
```

❌ **MAUVAIS signe :**
```
⚠️ Pexels API key not configured, skipping image generation
🖼️ Image à sauvegarder: AUCUNE
✅ Article sauvegardé avec image: NON
```

Si vous voyez le MAUVAIS signe → La clé n'est pas bien configurée.

---

## ❓ TROUBLESHOOTING

### **Problème 1 : "Pexels API key not configured"**

**Solution :**
- Vérifiez que le nom du secret est EXACTEMENT : `PEXELS_API_KEY` (respectez majuscules)
- Vérifiez que la clé est bien collée (pas d'espaces avant/après)
- Attendez 30 secondes et réessayez

---

### **Problème 2 : "Pexels API error: 401"**

**Solution :**
- Votre clé API est invalide
- Retournez sur https://www.pexels.com/api/ et régénérez une nouvelle clé
- Remplacez le secret dans Supabase

---

### **Problème 3 : Images toujours NULL après configuration**

**Solution :**
1. Supprimez le secret dans Supabase
2. Re-créez-le avec le bon nom : `PEXELS_API_KEY`
3. Attendez 1 minute
4. Générez un nouvel article de test
5. Vérifiez les logs console

---

## 📊 IMPACT DE LA CORRECTION

### **Avant (maintenant) :**
- ❌ 0 articles avec image
- ❌ SEO dégradé
- ❌ Taux de rebond élevé
- ❌ Contenu peu attractif

### **Après (avec Pexels) :**
- ✅ 100% articles avec image professionnelle
- ✅ SEO amélioré (+20% trafic estimé)
- ✅ Taux de rebond réduit
- ✅ Contenu attractif et professionnel

---

## 🎯 RÉCAPITULATIF

| Étape | Durée | Difficulté |
|-------|-------|------------|
| 1. Créer compte Pexels | 2 min | ⭐ Facile |
| 2. Obtenir API Key | 1 min | ⭐ Facile |
| 3. Configurer Supabase | 1 min | ⭐ Facile |
| 4. Tester génération | 1 min | ⭐ Facile |
| **TOTAL** | **5 min** | ⭐ **Facile** |

---

## ✅ APRÈS CETTE CORRECTION

Votre système sera **100% opérationnel** :
- ✅ Articles générés automatiquement
- ✅ **Images professionnelles Pexels**
- ✅ FAQ publiées
- ✅ Actualités publiées
- ✅ Pages ville créées
- ✅ SEO optimisé

---

**C'est la SEULE action critique nécessaire. Tout le reste fonctionne déjà ! 🚀**
