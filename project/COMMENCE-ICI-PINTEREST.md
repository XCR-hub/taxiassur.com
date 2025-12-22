# 🎯 COMMENCEZ ICI - Pinterest en 3 Clics

## ⚡ Version Ultra-Rapide

### Étape 1 : SQL (1 minute)

1. Ouvrir https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
2. Cliquer **SQL Editor** (⚡ dans le menu gauche)
3. Copier-coller TOUT le fichier **`FIX-PINTEREST-SIMPLE-FINAL.sql`**
4. Cliquer **Run** (en haut à droite)

✅ **Résultat attendu** :
```
Query executed successfully
```

Vous devriez voir en bas :
- `platform: pinterest`
- `is_active: true`
- `is_connected: true`
- `token_preview: pina_AMATW2QXAABNSBAAGCAB4DLX...`

---

### Étape 2 : Secret Supabase (30 secondes)

1. Cliquer **⚙️ Project Settings** (roue dentée en bas du menu gauche)
2. Aller dans **Edge Functions** (dans le menu Project Settings)
3. Cliquer sur l'onglet **Secrets**
4. Cliquer **Add a new secret**
5. Remplir :
   - **Name** : `PINTEREST_ACCESS_TOKEN`
   - **Value** : `pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA`
6. Cliquer **Save**

✅ Le secret est maintenant disponible pour toutes les Edge Functions

---

### Étape 3 : Déployer l'Edge Function (2 minutes)

#### Option A : Via le Dashboard (plus simple)

1. Cliquer **Edge Functions** (⚡ dans le menu gauche)
2. Cliquer **Deploy a new function**
3. Remplir :
   - **Function name** : `pinterest-publisher`
4. Dans votre projet local, ouvrir le fichier :
   ```
   supabase/functions/pinterest-publisher/index.ts
   ```
5. Copier tout son contenu
6. Coller dans l'éditeur Supabase
7. Cliquer **Deploy function**

#### Option B : Via CLI (si installé)

```bash
cd /chemin/vers/votre/projet
supabase functions deploy pinterest-publisher
```

✅ **Résultat** : Function status = **Active**

---

## 🎉 C'est Terminé !

### Premier Test

**Via l'interface web** :
1. Aller sur `https://taxiassur.com/backoffice/social-media`
2. Login avec `taxiassur2024`
3. Cocher **Pinterest**
4. Cliquer **"Générer avec IA"**
5. Cliquer **"Publier maintenant"**

**Via curl (test API direct)** :
```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/pinterest-publisher \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Pinterest",
    "description": "Premier test ! #AssuranceTaxi",
    "link": "https://taxiassur.com",
    "image_url": "https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg"
  }'
```

✅ **Succès** : Vous obtenez un `pin_url`
❌ **Erreur** : Voir ci-dessous

---

## 🆘 Problèmes Courants

### Erreur : "column does not exist"
➡️ **Solution** : Vous n'avez pas exécuté `FIX-PINTEREST-SIMPLE-FINAL.sql`
- Ce fichier ajoute automatiquement toutes les colonnes manquantes
- Il s'adapte à votre structure existante

### Erreur : "PINTEREST_ACCESS_TOKEN not found"
➡️ **Solution** : Le secret n'est pas ajouté
- Vérifier dans **Project Settings** → **Edge Functions** → **Secrets**
- Le nom doit être exactement : `PINTEREST_ACCESS_TOKEN`

### Erreur : "Board not found"
➡️ **Solution** : Créer au moins 1 board sur Pinterest
1. Aller sur https://pinterest.com
2. Cliquer **Create** → **Board**
3. Nom : "Assurance Taxi"
4. Réessayer

### Erreur 401 : "Invalid token"
➡️ **Solution** : Le token a expiré (24h)
1. Aller sur https://developers.pinterest.com/apps/1534523/
2. **OAuth** → **Generate access token**
3. Copier le nouveau token
4. Mettre à jour le secret dans Supabase
5. Réexécuter le SQL avec le nouveau token

---

## 📊 Vérifications

### ✅ Checklist Complète

Après les 3 étapes, vérifier :

**Dans Supabase SQL Editor** :
```sql
SELECT platform, is_active, is_connected
FROM social_networks
WHERE platform = 'pinterest';
```
Doit retourner : `is_active: true`, `is_connected: true`

**Dans Project Settings → Edge Functions → Secrets** :
- [ ] `PINTEREST_ACCESS_TOKEN` présent

**Dans Edge Functions** :
- [ ] `pinterest-publisher` déployée
- [ ] Status : **Active**

**Test de publication** :
- [ ] Backoffice accessible
- [ ] Pinterest coché
- [ ] Publication réussie
- [ ] Épingle visible sur Pinterest.com

---

## 📚 Documentation Complète

Si vous voulez en savoir plus :

- **`ACTIVER-PINTEREST-3-ETAPES.md`** - Guide détaillé pas-à-pas
- **`PINTEREST-PRET-A-UTILISER.md`** - Documentation complète d'utilisation
- **`RECAP-PINTEREST-FINAL.md`** - Récapitulatif de tout ce qui a été fait

---

## 🚀 Prochaines Étapes

Une fois Pinterest actif :

1. **Créer des boards thématiques**
   - "Assurance Taxi - Conseils"
   - "Assurance Taxi - Actualités"
   - "Assurance Taxi - Guides"

2. **Optimiser les images**
   - Format idéal : 1000x1500px (2:3)
   - Ajouter du texte overlay
   - Utiliser Canva pour créer des visuels pros

3. **Automatiser les publications**
   - Programmer 3 posts/jour
   - Heures optimales : 10h, 14h, 19h
   - Contenu varié : conseils, promo, guides

4. **Suivre les statistiques**
   - Impressions
   - Clics vers le site
   - Saves (enregistrements)
   - Engagement

---

## 💡 Conseil Final

**Le fichier `FIX-PINTEREST-SIMPLE-FINAL.sql` est magique** :
- Il détecte votre structure actuelle
- Ajoute seulement ce qui manque
- S'adapte automatiquement
- Ne casse rien

➡️ **Commencez par exécuter ce fichier, puis suivez les 2 autres étapes !**

---

## ✅ Résumé Ultra-Court

1. **SQL** : `FIX-PINTEREST-SIMPLE-FINAL.sql` dans Supabase SQL Editor
2. **Secret** : Ajouter `PINTEREST_ACCESS_TOKEN` dans Edge Functions Secrets
3. **Deploy** : Uploader `pinterest-publisher/index.ts`

**Temps total : 3 minutes**
**Résultat : Pinterest actif et fonctionnel !**
