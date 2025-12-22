# Configuration OAuth 2.0 LinkedIn - Guide Complet

## ✅ Étape 1 : Credentials Ajoutés

Les credentials LinkedIn ont été ajoutés au fichier `.env` :

```env
VITE_LINKEDIN_CLIENT_ID=78jlte9c2mbjw5
VITE_LINKEDIN_CLIENT_SECRET=WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==
```

---

## 🔧 Étape 2 : Configuration OAuth 2.0 Redirect URLs

### Comment Accéder aux Paramètres OAuth

1. **Allez sur** : https://www.linkedin.com/developers/apps
2. **Cliquez** sur votre app "TaxiAssur Social Media Manager"
3. **Onglet "Auth"** (dans le menu de gauche)

### Redirect URLs à Ajouter

Dans la section **"OAuth 2.0 settings"** > **"Redirect URLs"**, ajoutez :

```
http://localhost:5173/backoffice/social-media
https://taxiassur.com/backoffice/social-media
```

**Pourquoi ces URLs ?**
- `localhost:5173` = Pour tester en local pendant le développement
- `taxiassur.com/backoffice/social-media` = Pour la production

### Capture d'Écran de la Configuration

```
┌─────────────────────────────────────────────┐
│ OAuth 2.0 settings                          │
├─────────────────────────────────────────────┤
│                                             │
│ Redirect URLs                               │
│ ┌─────────────────────────────────────────┐ │
│ │ http://localhost:5173/backoffice/...    │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ https://taxiassur.com/backoffice/...    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [+ Add redirect URL]                        │
│                                             │
│ [Update]                                    │
└─────────────────────────────────────────────┘
```

### ⚠️ Important

1. **Cliquez sur "Update"** après avoir ajouté les URLs
2. **Attendez 2-3 minutes** pour que les changements prennent effet
3. **Ne fermez pas** la page avant de cliquer sur "Update"

---

## 📋 Étape 3 : Demander Accès aux Produits LinkedIn

### Produits Recommandés pour TaxiAssur

Basé sur les produits disponibles, voici ce dont vous avez besoin :

### 1. **Community Management API** ⭐ (Priorité Haute)

**Pourquoi ?**
- Publier du contenu sur votre Page LinkedIn
- Gérer les posts
- Répondre aux commentaires
- Analyser l'engagement

**Comment demander l'accès ?**
1. Cliquez sur "Request access" sous "Community Management API"
2. Remplissez le formulaire :
   ```
   Use case: Publication automatisée de contenu informatif sur l'assurance taxi
   Description: Notre application génère automatiquement des posts LinkedIn
   pour informer notre audience professionnelle (chauffeurs de taxi,
   gestionnaires de flotte) sur les actualités et conseils en assurance taxi.

   Nous publierons:
   - Actualités du secteur
   - Conseils en assurance
   - Études de cas
   - Articles de blog

   Fréquence: 2-3 posts par semaine
   ```

**Status actuel** : Development Tier (parfait pour commencer)

---

### 2. **Pages Data Portability API** ⭐ (Priorité Moyenne)

**Pourquoi ?**
- Récupérer les statistiques de votre Page
- Analyser les performances
- Exporter les données

**Comment demander l'accès ?**
1. Cliquez sur "Request access" sous "Pages Data Portability API"
2. Remplissez le formulaire :
   ```
   Use case: Analytics et reporting automatique de notre Page LinkedIn
   Description: Notre backoffice a besoin d'accéder aux statistiques de notre
   Page LinkedIn pour analyser les performances de nos publications et optimiser
   notre stratégie de contenu.

   Données nécessaires:
   - Nombre de vues
   - Taux d'engagement
   - Nouveaux followers
   - Performances par post
   ```

**Status actuel** : Standard Tier (peut nécessiter validation)

---

### 3. **Advertising API** (Optionnel - Futur)

**Pourquoi ?**
- Créer des campagnes publicitaires
- Cibler les professionnels du taxi
- Mesurer le ROI

**Recommandation** : Demandez-le plus tard, une fois que vous avez du trafic

---

### 4. **Lead Sync API** (Optionnel - Futur)

**Pourquoi ?**
- Récupérer les leads depuis les LinkedIn Lead Gen Forms
- Synchroniser avec Supabase

**Recommandation** : Utile si vous lancez des campagnes Lead Gen

---

## 📄 Étape 4 : Vérifier les Pages Légales

### Pages Requises par LinkedIn

LinkedIn exige que votre app ait des pages légales accessibles publiquement :

### 1. **Privacy Policy (Politique de Confidentialité)** ✅

**URL actuelle** : https://taxiassur.com/policy

**Vérification** : La page existe dans votre projet
- Fichier : `src/pages/Policy.tsx`
- Route : `/politique-confidentialite`

**À Ajouter** : Section sur LinkedIn API
```markdown
## Utilisation des Réseaux Sociaux

Nous utilisons l'API LinkedIn pour publier automatiquement du contenu
sur notre Page LinkedIn officielle.

Données collectées :
- Aucune donnée personnelle d'utilisateur LinkedIn n'est collectée
- Nous publions uniquement du contenu public sur notre propre Page
- Aucun accès à vos données LinkedIn personnelles

Pour plus d'informations sur LinkedIn :
https://www.linkedin.com/legal/privacy-policy
```

---

### 2. **Terms of Service (Conditions d'Utilisation)** ✅

**URL actuelle** : https://taxiassur.com/conditions

**Vérification** : La page existe dans votre projet
- Fichier : `src/pages/Conditions.tsx`
- Route : `/conditions`

**À Ajouter** : Section sur l'intégration LinkedIn
```markdown
## Intégration LinkedIn

Notre service utilise l'API LinkedIn pour :
- Publier du contenu informatif sur notre Page LinkedIn
- Partager des actualités du secteur de l'assurance taxi
- Communiquer avec notre communauté professionnelle

L'utilisation de notre service implique l'acceptation des conditions
d'utilisation de LinkedIn : https://www.linkedin.com/legal/user-agreement
```

---

### 3. **Legal Notice (Mentions Légales)** ✅

**URL actuelle** : https://taxiassur.com/legal

**Vérification** : La page existe dans votre projet
- Fichier : `src/pages/Legal.tsx`
- Route : `/legal`

**Contenu actuel** : OK, déjà complet

---

## 🖼️ Étape 5 : Logo de l'Application

### Spécifications LinkedIn

- **Format** : PNG ou JPG
- **Taille** : Minimum 100x100px
- **Recommandé** : 512x512px (carré)
- **Poids** : Maximum 5 MB

### Logo TaxiAssur Actuel

**Fichier existant** : `public/logo-600x300.png`
**Problème** : Format rectangulaire (600x300), pas carré

### Solution

Vous avez 2 options :

**Option A : Créer un Logo Carré**
- Prenez le logo actuel
- Ajoutez un fond blanc ou transparent
- Redimensionnez à 512x512px
- Uploadez sur LinkedIn

**Option B : Utiliser Uniquement l'Icône**
- Extrayez juste le pictogramme du taxi
- Format carré 512x512px
- Fond transparent ou uni

---

## 🔐 Étape 6 : Configuration des Scopes OAuth

### Scopes à Demander

Lors de l'authentification OAuth, l'application demandera ces permissions :

```javascript
const scopes = [
  'r_organization_social',      // Lire le contenu de la Page
  'w_organization_social',      // Publier sur la Page
  'rw_organization_admin',      // Gérer la Page
  'r_organization_followers',   // Statistiques des followers
];
```

### Comment Configurer les Scopes

1. Dans votre app LinkedIn, onglet **"Products"**
2. Activez **"Community Management API"**
3. Les scopes seront automatiquement disponibles
4. Pas de configuration manuelle nécessaire

---

## 🧪 Étape 7 : Tester l'Intégration

### Test en Local

1. **Démarrez l'application** :
   ```bash
   npm run dev
   ```

2. **Accédez au backoffice** :
   ```
   http://localhost:5173/backoffice
   ```

3. **Mot de passe** : `taxiassur2024`

4. **Allez sur** : Social Media Manager

5. **Cliquez** : "Connect LinkedIn"

6. **Vérifiez** :
   - ✅ Redirection vers LinkedIn
   - ✅ Page d'autorisation s'affiche
   - ✅ Scopes demandés sont corrects
   - ✅ Redirection vers localhost après autorisation
   - ✅ Token reçu et stocké

### Messages de Debug

Dans la console du navigateur, vous devriez voir :
```
✅ LinkedIn OAuth initialisé
✅ Redirect URI: http://localhost:5173/backoffice/social-media
✅ State: [random_string]
```

---

## ⚠️ Problèmes Courants et Solutions

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URL de redirection ne correspond pas

**Solution** :
1. Vérifiez l'URL exacte dans le code
2. Comparez avec LinkedIn Developer Portal > Auth > Redirect URLs
3. Attention à la casse (majuscules/minuscules)
4. Attention au protocole (http vs https)
5. Pas de "/" final dans l'URL

**Exemple Incorrect** :
```
https://taxiassur.com/backoffice/social-media/
                                              ^ "/" en trop
```

**Exemple Correct** :
```
https://taxiassur.com/backoffice/social-media
```

---

### Erreur : "invalid_client_id"

**Cause** : Client ID incorrect dans `.env`

**Solution** :
1. Vérifiez le Client ID dans LinkedIn Developer Portal
2. Copiez-collez exactement (sans espaces)
3. Redémarrez `npm run dev` après modification `.env`

---

### Erreur : "access_denied"

**Cause** : L'utilisateur a refusé l'autorisation

**Solution** : Normal, c'est un choix de l'utilisateur

---

### Erreur : "unauthorized_scope_error"

**Cause** : Vous demandez un scope non autorisé

**Solution** :
1. Vérifiez les produits activés dans votre app LinkedIn
2. Demandez l'accès aux produits nécessaires
3. Attendez l'approbation de LinkedIn (peut prendre 2-5 jours)

---

## 📊 Prochaines Étapes

Une fois OAuth configuré :

1. ✅ Test de publication d'un post
2. ✅ Récupération des statistiques
3. ✅ Automatisation des publications (via Supabase Cron)
4. ✅ Dashboard analytics dans le backoffice

---

## 🆘 Support

### Documentation LinkedIn

- **Developer Portal** : https://www.linkedin.com/developers/
- **OAuth 2.0 Guide** : https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication
- **Community Management API** : https://learn.microsoft.com/en-us/linkedin/marketing/community-management
- **API Terms of Use** : https://www.linkedin.com/legal/l/api-terms-of-use

### Checklist Finale

Avant de passer en production :

- [ ] Client ID et Secret ajoutés dans `.env`
- [ ] Redirect URLs configurées dans LinkedIn
- [ ] Community Management API : Accès demandé
- [ ] Pages légales mises à jour (mention LinkedIn)
- [ ] Logo carré uploadé (512x512px)
- [ ] Test OAuth en local réussi
- [ ] Test de publication réussi
- [ ] Redirect URLs production ajoutées

---

**Date de création** : 2025-10-09
**Dernière mise à jour** : 2025-10-09
**Version** : 1.0
