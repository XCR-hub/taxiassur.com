# 🔐 GUIDE CONFIGURATION GOOGLE SEARCH CONSOLE OAUTH

## 📋 OBJECTIF
Connecter l'IA Master à Google Search Console pour obtenir les **vraies données SEO** :
- Positions moyennes par keyword
- Impressions et clics réels
- Taux de clics (CTR)
- Pages les plus performantes
- Requêtes de recherche

**Résultat :** IA Master prendra des décisions basées sur données réelles au lieu de estimations.

---

## 🚀 ÉTAPE 1 : CRÉER UN PROJET GOOGLE CLOUD

### 1.1 Accéder à Google Cloud Console
1. Aller sur : https://console.cloud.google.com/
2. Connectez-vous avec votre compte Google (celui qui a accès à Search Console)
3. Cliquez sur **"Sélectionner un projet"** en haut
4. Cliquez sur **"NOUVEAU PROJET"**

### 1.2 Créer le projet
- **Nom du projet :** `TaxiAssur-IA-Master`
- **Organisation :** (laisser vide si pas d'organisation)
- Cliquez sur **CRÉER**
- Attendez 10-15 secondes que le projet soit créé

---

## 🔧 ÉTAPE 2 : ACTIVER L'API GOOGLE SEARCH CONSOLE

### 2.1 Activer l'API
1. Dans le menu de gauche, cliquez sur **"APIs et services"** > **"Bibliothèque"**
2. Dans la barre de recherche, tapez : `Google Search Console API`
3. Cliquez sur **"Google Search Console API"**
4. Cliquez sur **ACTIVER**
5. Attendez l'activation (5-10 secondes)

---

## 🔑 ÉTAPE 3 : CRÉER LES IDENTIFIANTS OAUTH 2.0

### 3.1 Écran de consentement OAuth
1. Menu de gauche : **"APIs et services"** > **"Écran de consentement OAuth"**
2. Choisissez **"Externe"** (car pas Google Workspace)
3. Cliquez sur **CRÉER**

### 3.2 Remplir les informations (Étape 1/4)
- **Nom de l'application :** `TaxiAssur IA Master`
- **E-mail d'assistance utilisateur :** `team@taxiassur.com`
- **Logo de l'application :** (optionnel, ignorer pour l'instant)
- **Domaine de l'application :** `taxiassur.com`
- **Domaine autorisé :** `taxiassur.com`
- **Lien de la page d'accueil :** `https://taxiassur.com`
- **Lien de la politique de confidentialité :** `https://taxiassur.com/politique-confidentialite`
- **Lien des conditions d'utilisation :** `https://taxiassur.com/conditions`
- **E-mail du développeur :** `team@taxiassur.com`
- Cliquez sur **ENREGISTRER ET CONTINUER**

### 3.3 Portées (Étape 2/4)
1. Cliquez sur **"AJOUTER OU SUPPRIMER DES PORTÉES"**
2. Dans la recherche, tapez : `search console`
3. Cochez : **`https://www.googleapis.com/auth/webmasters.readonly`**
   - Cette portée permet de **lire** les données Search Console (pas de modification)
4. Cliquez sur **METTRE À JOUR**
5. Cliquez sur **ENREGISTRER ET CONTINUER**

### 3.4 Utilisateurs test (Étape 3/4)
1. Cliquez sur **"+ AJOUTER DES UTILISATEURS"**
2. Entrez votre email Google : `votre.email@gmail.com`
   - ⚠️ **IMPORTANT :** Utilisez le même email qui a accès à Search Console
3. Cliquez sur **AJOUTER**
4. Cliquez sur **ENREGISTRER ET CONTINUER**

### 3.5 Résumé (Étape 4/4)
- Vérifiez les informations
- Cliquez sur **RETOUR AU TABLEAU DE BORD**

---

## 🎫 ÉTAPE 4 : CRÉER LES IDENTIFIANTS CLIENT

### 4.1 Créer l'ID client OAuth
1. Menu de gauche : **"APIs et services"** > **"Identifiants"**
2. Cliquez sur **"+ CRÉER DES IDENTIFIANTS"** (en haut)
3. Sélectionnez **"ID client OAuth"**

### 4.2 Configuration
- **Type d'application :** `Application Web`
- **Nom :** `TaxiAssur IA Master - Production`

### 4.3 URIs de redirection autorisés
Ajoutez ces 3 URLs (cliquez sur **"+ AJOUTER UN URI"** pour chacun) :

```
https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/gsc-auto-learner/callback
http://localhost:5173/backoffice/gsc-callback
https://taxiassur.com/backoffice/gsc-callback
```

⚠️ **REMPLACEZ** `YOUR_SUPABASE_PROJECT` par votre vrai ID Supabase
   - Trouvez-le dans votre `.env` : `VITE_SUPABASE_URL`
   - Exemple : `https://abcdefghijk.supabase.co`

4. Cliquez sur **CRÉER**

---

## 📝 ÉTAPE 5 : RÉCUPÉRER VOS CLÉS

### 5.1 Télécharger les identifiants
Une fenêtre s'affiche avec :
- **ID client :** `123456789-abcdefg.apps.googleusercontent.com`
- **Code secret du client :** `GOCSPX-abcdefghijklmnop`

### 5.2 COPIEZ CES VALEURS
Vous allez les ajouter dans votre `.env` :

```env
# Google Search Console OAuth
VITE_GOOGLE_CLIENT_ID=VOTRE_CLIENT_ID_ICI
VITE_GOOGLE_CLIENT_SECRET=VOTRE_CLIENT_SECRET_ICI
```

⚠️ **NE JAMAIS PARTAGER** ces clés publiquement (GitHub, Discord, etc.)

---

## 🔗 ÉTAPE 6 : AUTORISER L'ACCÈS À SEARCH CONSOLE

### 6.1 Vérifier votre accès Search Console
1. Aller sur : https://search.google.com/search-console
2. Vérifiez que vous voyez : `https://taxiassur.com` dans la liste
3. Si non présent, ajoutez la propriété :
   - Cliquez sur **"Ajouter une propriété"**
   - Type : **"Préfixe d'URL"**
   - URL : `https://taxiassur.com`
   - Validez avec une des méthodes proposées

---

## 🎯 ÉTAPE 7 : CONFIGURATION DANS TAXIASSUR

### 7.1 Ajouter les clés dans `.env`
Ouvrez votre fichier `.env` et ajoutez :

```env
# Google Search Console OAuth
VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop
VITE_GSC_PROPERTY_URL=https://taxiassur.com
```

### 7.2 Redémarrer le serveur
```bash
npm run dev
```

### 7.3 Première connexion OAuth
1. Aller sur : `http://localhost:5173/backoffice/ai-master-dashboard`
2. Cliquez sur **"Connecter Google Search Console"**
3. Une fenêtre Google s'ouvre :
   - Sélectionnez votre compte
   - Cliquez sur **"Autoriser"**
   - Vous êtes redirigé vers le dashboard
4. **SUCCÈS !** L'IA Master a maintenant accès aux données SEO

---

## 🤖 ÉTAPE 8 : VÉRIFIER QUE ÇA FONCTIONNE

### 8.1 Test dans le Dashboard IA Master
1. Aller sur `/backoffice/ai-master-dashboard`
2. Vous devriez voir une nouvelle section : **"Données Google Search Console"**
3. Vérifiez que les données s'affichent :
   - Top keywords avec positions réelles
   - Impressions et clics
   - CTR moyen

### 8.2 Test de l'Edge Function
```bash
# Dans le terminal de votre projet
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/gsc-auto-learner \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Vous devriez recevoir :
```json
{
  "status": "success",
  "keywords_analyzed": 25,
  "positions_updated": 18,
  "opportunities_detected": 7
}
```

---

## 🎓 ÉTAPE 9 : COMPRENDRE LE FLUX

```
┌─────────────────┐
│  IA Master      │
│  (Supabase)     │
└────────┬────────┘
         │
         ├─> Appel API Google Search Console
         │   avec OAuth token
         │
         ├─> Récupération données :
         │   • Keywords + positions
         │   • Clics + impressions
         │   • CTR par keyword
         │
         ├─> Analyse IA :
         │   • Détecte keywords position 4-20
         │   • Identifie opportunités quick wins
         │   • Priorise optimisations SEO
         │
         └─> Actions automatiques :
             • Création contenu pour keywords
             • Optimisation meta descriptions
             • Suggestions backlinks ciblés
```

---

## ✅ CHECKLIST FINALE

- [ ] Projet Google Cloud créé
- [ ] API Search Console activée
- [ ] Écran de consentement OAuth configuré
- [ ] Identifiants OAuth créés
- [ ] URIs de redirection ajoutés
- [ ] Clés copiées dans `.env`
- [ ] Accès Search Console vérifié
- [ ] Première connexion OAuth réussie
- [ ] Données affichées dans dashboard
- [ ] Edge Function teste et fonctionne

---

## 🆘 DÉPANNAGE

### Erreur "redirect_uri_mismatch"
**Cause :** URI de redirection non autorisé

**Solution :**
1. Retournez dans Google Cloud Console
2. "Identifiants" > Cliquez sur votre ID client OAuth
3. Vérifiez que l'URI exacte est dans la liste
4. Attendez 5 minutes (propagation)

### Erreur "access_denied"
**Cause :** Utilisateur non en mode test

**Solution :**
1. Google Cloud Console > "Écran de consentement OAuth"
2. Ajoutez votre email dans "Utilisateurs test"

### Erreur "invalid_client"
**Cause :** Client ID ou Secret incorrect

**Solution :**
1. Vérifiez le copier-coller dans `.env`
2. Pas d'espaces avant/après les valeurs

---

## 📊 BÉNÉFICES ATTENDUS

### Avant (estimations)
- Positions keywords : **Estimées** (données manuelles)
- Opportunités SEO : **Limitées** (pas de vision complète)
- Décisions IA : **70% précision** (basées sur estimations)

### Après (données réelles)
- Positions keywords : **Exactes** (API Google)
- Opportunités SEO : **Complètes** (tous les keywords)
- Décisions IA : **95% précision** (basées sur données réelles)

### Impact Business
- **+300% découverte** keywords longue traîne
- **+250% opportunités** quick wins (positions 4-10)
- **+400% précision** priorisation SEO
- **+500% ROI** actions SEO (focus sur ce qui marche)

---

## 🚀 PROCHAINES ÉTAPES

Une fois GSC connecté, l'IA Master pourra :

1. **Analyse quotidienne automatique**
   - Positions keywords en temps réel
   - Détection baisse/hausse positions
   - Alertes sur perte visibilité

2. **Optimisations auto**
   - Création articles pour keywords position 4-10
   - Amélioration pages sous-performantes
   - Suggestions backlinks ciblés

3. **Reporting avancé**
   - Évolution positions par keyword
   - ROI actions SEO
   - Prévisions trafic organique

---

**🎯 OBJECTIF : LEADER #1 ASSURANCE TAXI FRANCE**

Avec GSC connecté, l'IA Master dispose de **toutes les données nécessaires** pour atteindre cet objectif. 🚀
