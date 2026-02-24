# GUIDE COMPLET : CONFIGURATION GOOGLE SEARCH CONSOLE
## TAXIASSUR - 24 FÉVRIER 2026

---

## 🎯 OBJECTIF

Connecter Google Search Console à TaxiAssur pour :
- Synchroniser automatiquement les données GSC
- Générer du contenu SEO optimisé
- Analyser les performances en temps réel
- Automatiser la publication d'articles

**Temps estimé : 18 minutes**

---

## 📋 PRÉREQUIS

- Compte Google avec accès à Search Console
- Accès au projet Supabase TaxiAssur
- Site vérifié dans Google Search Console

---

## 🚀 ÉTAPE 1 : CRÉER UN SERVICE ACCOUNT (5 MIN)

### 1.1 Accéder à Google Cloud Console

```
https://console.cloud.google.com/
```

### 1.2 Créer ou sélectionner un projet

1. Cliquer sur le sélecteur de projet en haut
2. Créer un nouveau projet : **"TaxiAssur GSC"**
3. Attendre la création (30 secondes)

### 1.3 Créer le Service Account

1. Menu ☰ → **IAM & Admin** → **Service Accounts**
2. Cliquer sur **"+ CREATE SERVICE ACCOUNT"**
3. Remplir les informations :
   - **Name** : `taxiassur-gsc-bot`
   - **ID** : `taxiassur-gsc-bot` (auto-généré)
   - **Description** : `Service account for Google Search Console API access`
4. Cliquer sur **"CREATE AND CONTINUE"**
5. **Ignorer les rôles** → Cliquer sur **"CONTINUE"**
6. **Ignorer les accès** → Cliquer sur **"DONE"**

### 1.4 Générer la clé JSON

1. Trouver le Service Account créé dans la liste
2. Cliquer sur les **3 points** → **"Manage keys"**
3. Cliquer sur **"ADD KEY"** → **"Create new key"**
4. Choisir **JSON**
5. Cliquer sur **"CREATE"**
6. **SAUVEGARDER** le fichier JSON téléchargé

**⚠️ IMPORTANT** : Ce fichier contient des informations sensibles, ne le partagez jamais !

---

## 🔧 ÉTAPE 2 : ACTIVER L'API SEARCH CONSOLE (2 MIN)

### 2.1 Activer l'API

1. Menu ☰ → **APIs & Services** → **Library**
2. Chercher **"Google Search Console API"**
3. Cliquer sur **"Google Search Console API"**
4. Cliquer sur **"ENABLE"**
5. Attendre l'activation (30 secondes)

---

## 🔗 ÉTAPE 3 : AJOUTER LE SERVICE ACCOUNT À GSC (3 MIN)

### 3.1 Récupérer l'email du Service Account

Dans le fichier JSON téléchargé, chercher :
```json
"client_email": "taxiassur-gsc-bot@your-project.iam.gserviceaccount.com"
```

**Copier cet email** (vous en aurez besoin).

### 3.2 Ajouter à Google Search Console

1. Aller sur **https://search.google.com/search-console**
2. Sélectionner votre propriété **https://taxiassur.com**
3. Menu ☰ → **Paramètres** (en bas)
4. Cliquer sur **"Utilisateurs et autorisations"**
5. Cliquer sur **"AJOUTER UN UTILISATEUR"**
6. **Coller l'email** du Service Account
7. **Autorisation** : Sélectionner **"Propriétaire"** ou **"Accès complet"**
8. Cliquer sur **"AJOUTER"**

---

## 🔐 ÉTAPE 4 : CONFIGURER LES SECRETS SUPABASE (5 MIN)

### 4.1 Ouvrir le fichier JSON

Ouvrir le fichier JSON téléchargé avec un éditeur de texte.

Vous devriez voir quelque chose comme :
```json
{
  "type": "service_account",
  "project_id": "taxiassur-gsc-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "taxiassur-gsc-bot@taxiassur-gsc-123456.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  ...
}
```

### 4.2 Préparer les valeurs

Vous aurez besoin de 3 valeurs :

1. **GSC_SERVICE_ACCOUNT_EMAIL** : La valeur de `client_email`
2. **GSC_SERVICE_ACCOUNT_PRIVATE_KEY** : La valeur de `private_key` (avec les \n)
3. **GSC_SITE_URL** : L'URL de votre site : `https://taxiassur.com/`

### 4.3 Configurer dans Supabase

#### Méthode 1 : Via l'interface Supabase (Recommandé)

1. Aller sur **https://supabase.com/dashboard**
2. Sélectionner votre projet **TaxiAssur**
3. Menu **Project Settings** → **Edge Functions** → **Secrets**
4. Cliquer sur **"Add new secret"**
5. Ajouter les 3 secrets :

**Secret 1** :
- **Name** : `GSC_SERVICE_ACCOUNT_EMAIL`
- **Value** : `taxiassur-gsc-bot@taxiassur-gsc-123456.iam.gserviceaccount.com`

**Secret 2** :
- **Name** : `GSC_SERVICE_ACCOUNT_PRIVATE_KEY`
- **Value** : La clé privée complète (avec -----BEGIN PRIVATE KEY----- et les \n)
  ```
  -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
  ```

**Secret 3** :
- **Name** : `GSC_SITE_URL`
- **Value** : `https://taxiassur.com/`

⚠️ **ATTENTION** : Pour la clé privée, copiez EXACTEMENT le contenu tel quel, y compris les `\n` qui représentent les retours à la ligne.

#### Méthode 2 : Via Supabase CLI (Alternative)

```bash
# Installer Supabase CLI si nécessaire
npm install -g supabase

# Se connecter
supabase login

# Configurer les secrets
supabase secrets set GSC_SERVICE_ACCOUNT_EMAIL="taxiassur-gsc-bot@....iam.gserviceaccount.com"

supabase secrets set GSC_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

supabase secrets set GSC_SITE_URL="https://taxiassur.com/"
```

---

## ✅ ÉTAPE 5 : TESTER LA SYNCHRONISATION (3 MIN)

### 5.1 Lancer la synchronisation manuelle

Deux options :

#### Option A : Via SQL (Dashboard Supabase)

```sql
-- Tester la synchronisation GSC
SELECT cron.schedule(
  'test-gsc-sync-manual',
  '* * * * *',  -- Toutes les minutes (pour le test)
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/gsc-sync-performance',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body:=jsonb_build_object('test', true)
  );
  $$
);

-- Vérifier après 2 minutes
SELECT COUNT(*) as queries FROM gsc_queries;
SELECT COUNT(*) as pages FROM gsc_pages;
```

#### Option B : Via l'interface CRM

1. Se connecter au backoffice : **https://taxiassur.com/admin**
2. Aller dans **SEO Tools** → **Google Search Console**
3. Cliquer sur **"Synchroniser maintenant"**
4. Attendre 1-2 minutes
5. Rafraîchir la page

### 5.2 Vérifier les données

```sql
-- Vérifier que les données sont synchronisées
SELECT
  (SELECT COUNT(*) FROM gsc_queries) as total_queries,
  (SELECT COUNT(*) FROM gsc_pages) as total_pages,
  (SELECT COUNT(*) FROM gsc_performance_data) as total_performance,
  (SELECT MAX(date) FROM gsc_performance_data) as derniere_sync;
```

**Résultat attendu** :
```
total_queries   : > 0 (ex: 450)
total_pages     : > 0 (ex: 120)
total_performance : > 0 (ex: 5400)
derniere_sync   : Date du jour
```

---

## 🎉 ÉTAPE 6 : ACTIVER L'AUTOMATISATION

### 6.1 Vérifier les crons actifs

```sql
SELECT
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname LIKE '%gsc%'
ORDER BY jobname;
```

### 6.2 Crons GSC automatiques

Le système a déjà ces crons configurés :

1. **gsc-sync-daily** : Synchronise les données GSC (1x/jour à 02h00)
2. **gsc-ai-strategy** : Génère des stratégies SEO (1x/jour à 03h00)
3. **gsc-content-production** : Publie du contenu optimisé (3x/jour)

**Pas besoin de configuration supplémentaire !**

---

## 📊 RÉSULTATS ATTENDUS

### Immédiatement (après 5 minutes)
- ✅ Données GSC synchronisées
- ✅ Dashboard analytics fonctionnel
- ✅ Queries et pages visibles

### Après 24 heures
- ✅ 1-3 articles de blog générés automatiquement
- ✅ Contenu optimisé basé sur les vraies queries GSC
- ✅ Stratégie SEO mise à jour

### Après 1 semaine
- ✅ 7-21 articles publiés
- ✅ Amélioration du positionnement sur les requêtes clés
- ✅ Augmentation du trafic organique

---

## 🐛 TROUBLESHOOTING

### Problème 1 : "403 Forbidden"

**Cause** : Le Service Account n'a pas été ajouté à GSC

**Solution** :
1. Vérifier que l'email est bien ajouté dans GSC
2. Vérifier que l'autorisation est "Propriétaire" ou "Accès complet"
3. Attendre 5 minutes et réessayer

### Problème 2 : "Invalid private key"

**Cause** : La clé privée n'a pas été copiée correctement

**Solution** :
1. Ouvrir le fichier JSON
2. Copier EXACTEMENT la valeur de `private_key`
3. Inclure les `\n` (ne pas les remplacer par de vrais retours à la ligne)
4. Reconfigurer le secret dans Supabase

### Problème 3 : "No data returned"

**Cause** : Le site n'a pas assez de données dans GSC

**Solution** :
1. Vérifier que le site a des données dans GSC (derniers 28 jours)
2. Attendre 24-48h après l'ajout du site dans GSC
3. Vérifier que l'URL du site est correcte (avec ou sans /)

### Problème 4 : "API not enabled"

**Cause** : L'API Search Console n'est pas activée

**Solution** :
1. Retourner sur Google Cloud Console
2. APIs & Services → Library
3. Chercher "Google Search Console API"
4. Cliquer sur "ENABLE"

---

## 📞 SUPPORT

**Problème technique ?**
1. Vérifier les logs dans Supabase :
   ```sql
   SELECT * FROM gsc_sync_logs
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. Tester manuellement l'Edge Function :
   ```bash
   curl -X POST \
     https://YOUR_PROJECT_REF.supabase.co/functions/v1/gsc-sync-performance \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

---

## ✅ CHECKLIST FINALE

- [ ] Service Account créé
- [ ] API Search Console activée
- [ ] Service Account ajouté à GSC
- [ ] 3 secrets configurés dans Supabase
- [ ] Synchronisation testée
- [ ] Données visibles dans les tables
- [ ] Crons actifs et fonctionnels

---

## 🎯 PROCHAINES ÉTAPES

Maintenant que GSC est configuré, vous pouvez :

1. **Déployer sur IONOS** (Guide : `DEPLOIEMENT_IONOS_RAPIDE_2026.md`)
2. **Activer Monetico** (Guide : `CONFIGURATION_SECRETS_MONETICO_2026.md`)
3. **Analyser les données SEO** dans le backoffice

---

**Configuration terminée !** 🎉

Le système va maintenant générer automatiquement du contenu optimisé basé sur vos vraies données Google Search Console.
