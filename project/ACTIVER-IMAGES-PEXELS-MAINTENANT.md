# 🖼️ Activer Images Pexels - 2 Minutes

## ❌ Problème
Les articles générés n'ont **PAS d'images** car la clé API Pexels n'est pas configurée dans Supabase.

## ✅ Solution Express

### Étape 1 : Obtenir Clé API Pexels (GRATUITE)

1. Va sur **https://www.pexels.com/api/**
2. Clique **"Get Started"**
3. Crée un compte (gratuit, 200 requêtes/heure)
4. Copie ta **clé API** (format : `AbCd1234EfGh5678...`)

### Étape 2 : Configurer dans Supabase

1. Va dans **Supabase Dashboard** → https://supabase.com/dashboard
2. Sélectionne ton projet **TaxiAssur**
3. Menu **"Settings"** (icône engrenage) → **"Edge Functions"**
4. Section **"Secrets"**
5. Clique **"New Secret"**
6. Ajoute :
   - **Name:** `PEXELS_API_KEY`
   - **Value:** (colle ta clé Pexels)
7. Clique **"Save"**

### Étape 3 : Vérifier

1. Va dans le backoffice : **https://taxiassur.com/backoffice/ai-generator**
2. Génère un nouvel article
3. **L'image s'affiche maintenant automatiquement !** 🎉

## 📊 Résultat Attendu

**AVANT :**
```
✅ Article de blog publié ⚠️ sans image
```

**APRÈS :**
```
✅ Article de blog publié ✅ avec image
Featured Image: https://images.pexels.com/photos/...
```

## 🔍 Vérification Console

Dans la console Edge Function (`supabase functions logs generate-seo-content`), tu verras :

```
🖼️ Génération image Pexels...
✅ Image générée: https://images.pexels.com/photos/...
```

## 🚨 Si Ça Ne Marche Pas

### Erreur : "Pexels API key not configured"
→ La clé n'est pas ajoutée dans Supabase Secrets

### Erreur : "Pexels API error: 401"
→ La clé est invalide ou mal copiée

### Erreur : "Pexels API error: 403"
→ Quota dépassé (200 req/heure), attends 1 heure

## 💡 Avantages Images Pexels

✅ **Gratuites** et libres de droits
✅ **Haute qualité** (large2x = 1920px)
✅ **Pertinentes** (recherche automatique par mot-clé)
✅ **Rapide** (< 2 secondes par image)
✅ **Fallback intelligent** (si pas de résultat, cherche "taxi" générique)

## 🎯 Automatisation Active

Une fois configurée, **TOUTES les automatisations** utiliseront Pexels :

1. ✅ Génération manuelle backoffice
2. ✅ Cron job articles blog (4h00)
3. ✅ Cron job actualités
4. ✅ Génération IA Master

**Plus besoin d'y penser, c'est automatique !** 🚀

## 📝 Temps Total

⏱️ **2-3 minutes maximum**

1. Créer compte Pexels : **1 min**
2. Copier clé API : **10 sec**
3. Ajouter dans Supabase : **30 sec**
4. Tester : **30 sec**

---

**🎉 Une fois fait, toutes les images s'ajoutent automatiquement pour toujours !**
