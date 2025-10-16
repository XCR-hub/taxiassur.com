# 🖼️ CONFIGURER PEXELS API - GUIDE 3 MINUTES

## ✅ DIAGNOSTIC CONFIRMÉ

**Problème** : Pas de section "Image SEO Générée" dans l'aperçu

**Cause** : Clé `PEXELS_API_KEY` non configurée dans Supabase

**Solution** : Suivre les 3 étapes ci-dessous

---

## 🚀 ÉTAPE 1 : Créer Compte Pexels (1 minute)

### Action

1. Ouvrir : https://www.pexels.com/api/

2. Cliquer : **"Get Started"** ou **"Sign Up"**

3. Remplir :
   ```
   Email : votre@email.com
   Password : (choisir un mot de passe)
   ```

4. Vérifier email et confirmer compte

---

## 🔑 ÉTAPE 2 : Obtenir API Key (30 secondes)

### Action

1. Une fois connecté : https://www.pexels.com/api/new/

2. Remplir formulaire :
   ```
   Project name : TaxiAssur
   Project description : Images pour articles de blog
   Website URL : https://taxiassur.com
   ```

3. Cliquer : **"Generate API Key"**

4. **COPIER** la clé qui apparaît :
   ```
   YOUR_PEXELS_API_KEY_HERE_XXXXXXXXXXXXXXXXXX
   ```

   ⚠️ **IMPORTANT** : Copier immédiatement, elle n'apparaîtra qu'une fois !

---

## 🔐 ÉTAPE 3 : Configurer Supabase (1 minute)

### Action

1. Ouvrir : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq

2. Menu gauche : **Settings** (⚙️)

3. Onglet : **Vault**

4. Cliquer : **"New secret"**

5. Remplir :
   ```
   Name : PEXELS_API_KEY
   Secret : [coller votre clé Pexels]
   ```

6. Cliquer : **"Create secret"**

7. ✅ Devrait apparaître dans la liste :
   ```
   PEXELS_API_KEY : •••••••••••••••••
   ```

---

## ✅ ÉTAPE 4 : TESTER (1 minute)

### Action Immédiate

1. Retour sur : https://taxiassur.com/backoffice/ai-generator

2. **Recharger la page** : CTRL + F5 (vider cache)

3. Remplir nouveau test :
   ```
   Mot-clé : assurance taxi Lyon
   Ville : Lyon
   Prompt image : taxi Mercedes noir moderne
   ```

4. Cliquer : **"Générer TOUT le Contenu"**

5. Attendre 30-60 secondes

6. **RÉSULTAT ATTENDU** :

   ✅ Section **"Image SEO Générée"** apparaît

   ✅ Photo haute qualité visible :
   ```
   ┌────────────────────────────────┐
   │  🖼️ Image SEO Générée         │
   ├────────────────────────────────┤
   │  [PHOTO TAXI 1920x1080]       │
   │  https://images.pexels.com/... │
   │                                │
   │  Alt SEO: assurance taxi à    │
   │  Lyon - Photo professionnelle │
   └────────────────────────────────┘
   ```

---

## 🎯 RÉSULTAT APRÈS CONFIGURATION

### Dans Générateur IA

✅ **Aperçu** :
- Section "Image SEO Générée" visible
- Photo haute résolution
- Alt-text SEO optimisé
- URL https://images.pexels.com/...

✅ **Métadonnées** :
- "avec image" dans le résumé
- Score SEO augmenté

### Après Publication

✅ **Page Blog** (/blog) :
- Cartes articles avec images
- Chargement optimisé
- Responsive mobile

✅ **Article Complet** :
- Image en tête (hero)
- 1920x1080 haute qualité
- Alt-text pour SEO
- Libres de droits

### Automatisations Futures

✅ **Génération Auto** :
- Tous futurs articles auront image
- Prompt auto si vide (ville + mot-clé)
- 0 action manuelle
- 100% libres de droits

---

## 🔍 VÉRIFICATION CONFIGURATION

### Checklist Rapide

- [ ] Compte Pexels créé et confirmé
- [ ] API Key copiée (commence par `YOUR_PEXELS...`)
- [ ] Supabase Vault → PEXELS_API_KEY créé
- [ ] Secret visible dans liste (avec •••••)
- [ ] Page générateur rechargée (CTRL+F5)
- [ ] Nouveau contenu généré
- [ ] Section "Image SEO Générée" apparaît

### Test SQL (Optionnel)

Pour vérifier que le secret est bien configuré :

```sql
-- Dans Supabase SQL Editor
SELECT vault.decrypted_secret('PEXELS_API_KEY');
```

Devrait retourner votre clé (ou erreur si pas configurée).

---

## ❓ PROBLÈMES FRÉQUENTS

### Problème 1 : "Secret already exists"

**Symptôme** : Erreur lors création secret

**Solution** :
1. Liste des secrets → Trouver PEXELS_API_KEY
2. Cliquer sur icône poubelle (supprimer)
3. Recréer avec nouvelle clé

---

### Problème 2 : Image toujours pas générée

**Symptôme** : Section image toujours absente après config

**Diagnostic** :
1. Supabase Dashboard → Edge Functions
2. `generate-seo-content` → Logs
3. Chercher dernière génération
4. Vérifier message :
   - ✅ "✅ Image générée: https://..."
   - ⚠️ "⚠️ Pexels API key not configured"
   - ❌ "❌ Pexels API error: 401"

**Solutions selon message** :

**Si "not configured"** :
- Vérifier nom exact : `PEXELS_API_KEY` (sensible à la casse)
- Recréer secret
- Attendre 1-2 min (propagation)

**Si "error 401"** :
- Clé invalide ou expirée
- Régénérer sur Pexels.com
- Mettre à jour Vault

**Si aucun message image** :
- Edge Function n'a pas été appelée
- Vérifier console navigateur (F12)
- Chercher erreurs réseau

---

### Problème 3 : Clé Pexels perdue

**Symptôme** : Impossible de retrouver clé API

**Solution** :
1. https://www.pexels.com/api/
2. Se connecter
3. Dashboard → API Keys
4. Régénérer nouvelle clé
5. Mettre à jour Supabase Vault

---

## 🎨 EXEMPLES DE RÉSULTATS

### Pour "assurance taxi Paris"

**Recherche Pexels** : `taxi professional Paris`

**Images typiques** :
- Taxis parisiens (Peugeot, Mercedes)
- Éclairage urbain nocturne
- Style professionnel haute qualité
- Résolution 1920x1080

---

### Pour "assurance taxi électrique"

**Recherche Pexels** : `electric taxi professional`

**Images typiques** :
- Tesla Model 3/S blanches ou noires
- Voitures modernes premium
- Ambiance futuriste
- Charging stations

---

### Prompt Personnalisé

**Exemple** : `taxi Mercedes classe E noir, photo professionnelle, haute qualité, style réaliste, éclairage doré`

**Résultat** :
- Recherche exacte dans Pexels
- 3 photos aléatoires parmi résultats
- Qualité "large2x" (haute résolution)
- Orientation paysage

---

## 📊 QUOTA PEXELS

### Plan Gratuit

✅ **200 requêtes / heure**
✅ **20 000 requêtes / mois**
✅ Largement suffisant pour votre usage

### Votre Usage Estimé

- Génération manuelle : ~5-10 articles/jour = 150-300/mois
- Génération auto CRON : ~50 articles/mois
- **TOTAL** : ~200-350 images/mois

✅ **0% de risque de dépasser le quota gratuit**

---

## 🚀 RÉCAPITULATIF EXPRESS

### TL;DR - 3 Minutes

```bash
1. https://www.pexels.com/api/ → Sign Up
2. Obtenir API Key
3. Supabase Vault → PEXELS_API_KEY
4. Tester générateur IA
5. ✅ Section "Image SEO Générée" apparaît
```

---

## 📞 STATUT CONFIGURATION

Après avoir suivi ce guide :

- [ ] ✅ Pexels configuré
- [ ] ✅ Premier article avec image généré
- [ ] ✅ Image visible dans aperçu
- [ ] ✅ Article publié avec image

**Temps total** : 3 minutes

**Résultat** : Images automatiques sur TOUS vos futurs articles ! 🎉

---

## 🎯 PROCHAINE ACTION

**MAINTENANT** :

1. Ouvrir https://www.pexels.com/api/
2. Suivre ÉTAPE 1 → ÉTAPE 3
3. Tester générateur IA
4. Confirmer que section image apparaît

**Durée** : 3 minutes chrono ⏱️

C'est parti ! 🚀
