# 🚀 GUIDE CONFIGURATION SUPABASE - TAXIASSUR

## ✅ ÉTAPE 1 : Connexion configurée !

Vos clés sont maintenant dans `.env` :
```
VITE_SUPABASE_URL=https://viuuznfqkauatkjcegcj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

---

## 📊 ÉTAPE 2 : Appliquer les 4 migrations SQL

Vous devez copier-coller chaque fichier SQL dans Supabase Dashboard.

### 🔗 URL Supabase SQL Editor :
**👉 https://viuuznfqkauatkjcegcj.supabase.co/project/_/sql/new**

---

### Migration 1/4 : Système Backlinks

**Fichier :** `supabase/migrations/20251006014504_create_backlink_opportunities_system.sql`

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
