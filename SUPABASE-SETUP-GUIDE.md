# 🚀 GUIDE CONFIGURATION SUPABASE - TAXIASSUR (NOUVEAU PROJET)

## 📋 ÉTAPE 1 : CRÉER UN NOUVEAU PROJET SUPABASE

### 1.1 Créer le projet

1. Allez sur https://supabase.com/dashboard
2. Cliquez sur **"New Project"**
3. Remplissez les informations :
   - **Name** : `taxiassur-production`
   - **Database Password** : Choisissez un mot de passe FORT (sauvegardez-le !)
   - **Region** : `West EU (Ireland)` (le plus proche de la France)
   - **Pricing Plan** : Free
4. Cliquez sur **"Create new project"**

⏱️ **Attendez 2-3 minutes** que le projet soit créé.

---

## 📋 ÉTAPE 2 : RÉCUPÉRER VOS NOUVELLES CLÉS API

### 2.1 Accéder aux clés

1. Dans votre nouveau projet Supabase, cliquez sur **"Project Settings"** (icône engrenage)
2. Cliquez sur **"API"** dans le menu de gauche
3. Vous verrez :

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.2 Notez ces valeurs

**IMPORTANT :** Gardez ces valeurs, vous allez les utiliser !

---

## 📋 ÉTAPE 3 : EXÉCUTER LA MIGRATION SQL COMPLÈTE

### 3.1 Ouvrir le SQL Editor

1. Dans votre projet Supabase, cliquez sur **"SQL Editor"** dans le menu
2. Cliquez sur **"New query"**

### 3.2 Exécuter la migration initiale

**Copiez TOUT le contenu du fichier** `supabase/migrations/00_initial_setup.sql`

Ou utilisez le lien direct de votre SQL Editor :
**👉 https://supabase.com/dashboard/project/VOTRE_REF/sql/new**

Collez le code et cliquez **"RUN"** (ou Ctrl + Entrée)

✅ Vous devriez voir : **"Success. No rows returned"**

### 3.3 Vérifier que tout est créé

Exécutez cette requête :

```sql
-- Vérifier la table leads
SELECT COUNT(*) FROM leads;

-- Vérifier les politiques RLS
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'leads';

-- Vérifier les vues
SELECT * FROM leads_stats;
```

**Résultat attendu :**
- Table `leads` avec 0 lignes ✅
- 3 politiques RLS actives ✅
- Vue `leads_stats` fonctionnelle ✅

---

## 📋 ÉTAPE 4 : CONFIGURER LES VARIABLES D'ENVIRONNEMENT

### 4.1 Mettre à jour `.env` (développement local)

Éditez le fichier `.env` à la racine du projet avec VOS NOUVELLES clés :

```env
VITE_SUPABASE_URL=https://VOTRE_NOUVELLE_URL.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.VOTRE_NOUVELLE_CLE
```

### 4.2 Mettre à jour `public/env-config.js` (production IONOS)

Éditez le fichier `public/env-config.js` avec VOS NOUVELLES clés :

```javascript
// Configuration Supabase pour la production
window.ENV = {
  VITE_SUPABASE_URL: 'https://VOTRE_NOUVELLE_URL.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.VOTRE_NOUVELLE_CLE'
};
```

---

## 📋 ÉTAPE 5 : DÉPLOYER L'EDGE FUNCTION SEND-EMAIL

### 5.1 Installer Supabase CLI

```bash
npm install -g supabase
```

### 5.2 Se connecter à Supabase

```bash
supabase login
```

### 5.3 Lier votre projet

```bash
supabase link --project-ref VOTRE_REF_PROJET
```

(Remplacez VOTRE_REF_PROJET par les lettres dans votre URL Supabase)

### 5.4 Déployer la fonction send-email

```bash
supabase functions deploy send-email
```

### 5.5 Ajouter le secret SendGrid

1. Allez dans **Project Settings** > **Edge Functions** > **Secrets**
2. Cliquez **"Add secret"**
3. Name : `SENDGRID_API_KEY`
4. Value : Votre clé API SendGrid (commence par `SG.`)
5. Cliquez **"Save"**

---

## 📋 ÉTAPE 6 : TESTER LE FORMULAIRE EN LOCAL

### 6.1 Rebuild le projet

```bash
npm run build
```

### 6.2 Lancer le serveur dev

```bash
npm run dev
```

### 6.3 Tester la soumission

1. Ouvrez http://localhost:5173
2. Remplissez le formulaire
3. Soumettez

### 6.4 Vérifier dans Supabase

1. Allez dans **"Table Editor"** > **"leads"**
2. Vous devriez voir votre nouveau lead !

---

## 📋 ÉTAPE 7 : DÉPLOYER EN PRODUCTION

### 7.1 Rebuild final

```bash
npm run build
```

### 7.2 Upload sur IONOS

1. Connectez-vous à votre serveur IONOS via FileZilla
2. Uploadez **tout le contenu du dossier `/dist`** vers la racine
3. Vérifiez que `env-config.js` est bien présent

### 7.3 Tester en production

1. Allez sur https://taxiassur.com
2. Testez le formulaire
3. Vérifiez dans Supabase que le lead apparaît

---

## ✅ VÉRIFICATION COMPLÈTE

### Test 1 : Insertion directe (console navigateur)

```javascript
// Sur taxiassur.com, console (F12)
fetch('https://VOTRE_URL.supabase.co/rest/v1/leads', {
  method: 'POST',
  headers: {
    'apikey': 'VOTRE_ANON_KEY',
    'Authorization': 'Bearer VOTRE_ANON_KEY',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    name: 'Test Console',
    email: 'test@console.com',
    phone: '0612345678',
    city: 'Paris',
    status: 'taxi'
  })
}).then(r => r.json()).then(console.log);
```

**Résultat attendu :** Un objet avec l'ID créé ✅

### Test 2 : Statistiques

```sql
SELECT * FROM leads_stats;
```

**Résultat attendu :** Une ligne avec vos statistiques ✅

---

## 📊 MIGRATIONS OPTIONNELLES (Système Backlinks)

Si vous voulez activer le système de backlinks automatique

**Ce que ça crée :**
- ✅ Table `backlink_opportunities` (10 prospects pré-chargés)
- ✅ Table `backlink_outreach_campaigns` (gestion campagnes)
- ✅ Table `backlink_email_logs` (historique emails)
- ✅ Table `backlink_email_templates` (3 templates prêts)
- ✅ Table `backlink_scan_history` (historique scans)
- ✅ RLS activée (sécurité)
- ✅ Indexes (performance)

**Instructions :**
1. Ouvrez : https://viuuznfqkauatkjcegcj.supabase.co/project/_/sql/new
2. Copiez TOUT le contenu de `supabase/migrations/20251006014504_create_backlink_opportunities_system.sql`
3. Collez dans l'éditeur SQL
4. Cliquez **RUN** (bouton en bas à droite)
5. Vérifiez : ✅ "Success. No rows returned"

---

### Migration 2/4 : Système Automation

**Fichier :** `supabase/migrations/20251006114108_create_automation_system.sql`

**Ce que ça crée :**
- ✅ Table `email_inbox` (réception emails)
- ✅ Table `email_outbox` (file attente envoi)
- ✅ Table `chatbot_conversations` (historique chat)
- ✅ Table `automation_tasks` (tâches auto)
- ✅ Table `partner_prospects` (prospects partenaires)
- ✅ RLS + Policies

**Instructions :**
1. Nouvelle requête : https://viuuznfqkauatkjcegcj.supabase.co/project/_/sql/new
2. Copiez le contenu de `supabase/migrations/20251006114108_create_automation_system.sql`
3. Collez et cliquez **RUN**
4. Vérifiez : ✅ "Success"

---

### Migration 3/4 : Table Leads

**Fichier :** `supabase/migrations/20251006131105_create_leads_table.sql`

**Ce que ça crée :**
- ✅ Table `leads` (tous vos prospects)
- ✅ Champs : nom, email, téléphone, type véhicule, ville, statut...
- ✅ RLS pour sécurité
- ✅ Indexes pour recherche rapide

**Instructions :**
1. Nouvelle requête : https://viuuznfqkauatkjcegcj.supabase.co/project/_/sql/new
2. Copiez le contenu de `supabase/migrations/20251006131105_create_leads_table.sql`
3. Collez et cliquez **RUN**
4. Vérifiez : ✅ "Success"

---

### Migration 4/4 : CRON Jobs (Automation)

**Fichier :** `supabase/migrations/20251006135310_enable_cron_automation.sql`

**Ce que ça crée :**
- ✅ Extension pg_cron (tâches planifiées)
- ✅ 5 CRON jobs automatiques :
  - 📧 Email auto-responder (chaque minute)
  - 🔄 Lead follow-up (tous les jours 9h)
  - 📝 SEO content generator (tous les jours 6h)
  - 🤝 Partner outreach (Lundi & Jeudi 10h)
  - 📊 Weekly reporting (Dimanche 12h)

**⚠️ IMPORTANT :** Cette migration nécessite des privilèges élevés.

**Instructions :**
1. Nouvelle requête : https://viuuznfqkauatkjcegcj.supabase.co/project/_/sql/new
2. Copiez le contenu de `supabase/migrations/20251006135310_enable_cron_automation.sql`
3. Collez et cliquez **RUN**
4. Si erreur "permission denied" :
   - C'est normal, pg_cron nécessite le plan Pro de Supabase
   - Vous pourrez activer les CRON plus tard
   - Le reste du site fonctionne sans problème !

---

## ✅ VÉRIFICATION

Après avoir appliqué les 3 premières migrations, vérifiez que tout est OK :

### Test 1 : Tables créées ?

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Vous devriez voir :**
- backlink_email_logs
- backlink_email_templates
- backlink_opportunities
- backlink_outreach_campaigns
- backlink_scan_history
- chatbot_conversations
- email_inbox
- email_outbox
- leads
- partner_prospects

---

### Test 2 : Données pré-chargées ?

```sql
-- 10 opportunités backlinks
SELECT COUNT(*) as backlink_opportunities FROM backlink_opportunities;

-- 3 templates emails
SELECT COUNT(*) as email_templates FROM backlink_email_templates;
```

**Résultat attendu :**
- backlink_opportunities: **10**
- email_templates: **3**

---

### Test 3 : RLS activée ?

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
```

**Toutes vos tables doivent avoir `rowsecurity = true`**

---

## 🎉 MIGRATION TERMINÉE !

Une fois les migrations appliquées, vous pouvez :

1. ✅ **Builder le site** avec `npm run build`
2. ✅ **Uploader `/dist/` sur IONOS**
3. ✅ **Le site sera 100% fonctionnel !**

---

## 🚀 PROCHAINES ÉTAPES

### 1. Activer les Edge Functions (Optionnel)

Vous avez **11 Edge Functions** prêtes à déployer :
- `chatbot` (IA conversationnelle)
- `send-email` (envoi emails)
- `auto-followup` (relances auto)
- `scan-backlinks` (détection opportunités)
- `send-outreach-emails` (prospection auto)
- Et 6 autres...

**Comment les déployer :**
```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Lien au projet
supabase link --project-ref viuuznfqkauatkjcegcj

# Déployer toutes les fonctions
supabase functions deploy chatbot
supabase functions deploy send-email
# etc...
```

---

### 2. Ajouter les API Keys tierces (Optionnel)

Pour activer l'automation complète, ajoutez ces secrets dans Supabase :

**Dashboard → Settings → Secrets**

```bash
OPENAI_API_KEY=sk-...          # Pour le chatbot IA
SENDGRID_API_KEY=SG.xxx...     # Pour emails
GOOGLE_CSE_API_KEY=AIza...     # Pour recherche Google
GOOGLE_CSE_CX=xxx...           # Custom Search Engine ID
```

---

### 3. Configurer CRON (Plan Pro uniquement)

Si vous upgrader vers Supabase Pro (25$/mois) :
- Les CRON jobs s'activent automatiquement
- 5 automations tournent 24/7
- Génération de leads en pilote automatique

**Sinon :** Le site fonctionne parfaitement sans CRON, vous gérez manuellement.

---

## 📞 BESOIN D'AIDE ?

- **Problème migrations ?** Vérifiez que vous êtes connecté au bon projet
- **Erreur permissions ?** Normal pour pg_cron, ignorez
- **Tables manquantes ?** Réappliquez la migration concernée

---

## 🎯 CHECKLIST FINALE

- [ ] Migration 1/4 appliquée (backlinks)
- [ ] Migration 2/4 appliquée (automation)
- [ ] Migration 3/4 appliquée (leads)
- [ ] Migration 4/4 tentée (cron - peut échouer)
- [ ] Test 1 : 10 tables créées ✅
- [ ] Test 2 : Données pré-chargées ✅
- [ ] Test 3 : RLS activée ✅
- [ ] Build réussi : `npm run build` ✅
- [ ] Upload `/dist/` sur IONOS ✅
- [ ] Site fonctionne ! 🎉

---

**Vous êtes prêt ! 🚀**
