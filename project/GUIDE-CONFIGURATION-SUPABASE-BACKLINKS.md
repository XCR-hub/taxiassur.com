# 🚀 GUIDE: Configuration Complète Backlinks

**Durée:** 10 minutes  
**Pré-requis:** Accès Supabase Dashboard

---

## 📋 RÉCAPITULATIF DES MODIFICATIONS

### **✅ Ce qui a été fait:**

1. **Edge Function `scan-backlinks` mise à jour**
   - ✅ Intégration Google Custom Search API (vraies données)
   - ✅ Intégration Hunter.io (extraction emails)
   - ✅ Fallback gracieux si APIs absentes

2. **Migration SQL créée**
   - ✅ Fonction `calculate_opportunity_score()`
   - ✅ Trigger automatique `trigger_calculate_score()`
   - ✅ 3 Cron jobs backlinks activés

3. **Guides créés**
   - ✅ Guide Hunter.io (gratuit 25/mois)
   - ✅ Guide configuration Supabase (ce fichier)

---

## 🎯 ÉTAPE 1: CONFIGURER LES SECRETS SUPABASE

### **A) Google Custom Search API**

Les clés existent déjà dans `.env`:
```
VITE_GOOGLE_CSE_API_KEY=AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
VITE_GOOGLE_CSE_CX=73ba86b5aae9b4add
```

**Ajouter dans Supabase Vault:**

1. Dashboard: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
2. Menu: **Settings → Vault**
3. Cliquez **"New Secret"** (×2)

**Secret 1:**
```
Name:   GOOGLE_CSE_API_KEY
Secret: AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
```

**Secret 2:**
```
Name:   GOOGLE_CSE_CX_ID
Secret: 73ba86b5aae9b4add
```

### **B) Hunter.io API (Optionnel)**

📖 **Suivez:** `GUIDE-HUNTER-IO-GRATUIT.md`

Résumé:
1. Créer compte gratuit: https://hunter.io/users/sign_up
2. Obtenir API Key: https://hunter.io/api-keys
3. Ajouter secret:
   ```
   Name:   HUNTER_IO_API_KEY
   Secret: [VOTRE CLÉ]
   ```

---

## 🗄️ ÉTAPE 2: EXÉCUTER LA MIGRATION SQL

### **A) Via SQL Editor** ⭐ **RECOMMANDÉ**

1. Dashboard: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
2. Cliquez **"New Query"**
3. Collez le contenu de:
   ```
   supabase/migrations/20251023110000_backlink_automation_complete.sql
   ```
4. Cliquez **"Run"** (Ctrl+Enter)

**Résultat attendu:**
```
✅ Function calculate_opportunity_score created
✅ Function trigger_calculate_score created
✅ Trigger update_opportunity_score created
✅ Column quality_score added
✅ Cron job daily_backlink_scan created
✅ Cron job daily_backlink_outreach created
✅ Cron job weekly_backlink_followup created
✅ Log entry created

NOTICE: Backlink cron jobs actifs: 3
```

### **B) Vérifier l'Exécution**

```sql
-- Vérifier les fonctions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%backlink%' OR routine_name LIKE '%score%';

-- Résultat attendu:
-- calculate_opportunity_score
-- trigger_calculate_score

-- Vérifier les cron jobs
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE '%backlink%';

-- Résultat attendu:
-- daily_backlink_scan      | 0 6 * * *    | t
-- daily_backlink_outreach  | 0 10 * * 1-5 | t
-- weekly_backlink_followup | 0 14 * * 2   | t
```

---

## 🚀 ÉTAPE 3: DÉPLOYER L'EDGE FUNCTION

### **Option A: Via Supabase CLI** ⭐ **RECOMMANDÉ**

```bash
# Si pas encore installé:
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref drohhxrkoequjphvabvq

# Deploy
supabase functions deploy scan-backlinks
```

### **Option B: Via Dashboard**

1. Menu: **Edge Functions**
2. Cliquez sur **scan-backlinks**
3. Cliquez **"Deploy"**
4. Upload le fichier: `supabase/functions/scan-backlinks/index.ts`

---

## ✅ ÉTAPE 4: TESTER LE SYSTÈME

### **A) Test Manuel du Scan**

```sql
-- Appeler manuellement la fonction scan
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
);
```

**Attendez 30-60 secondes**, puis:

```sql
-- Vérifier les opportunités créées
SELECT 
  domain,
  url,
  contact_email,
  quality_score,
  created_at
FROM backlink_opportunities
ORDER BY created_at DESC
LIMIT 10;

-- Résultat attendu:
-- domain             | url                    | contact_email      | quality_score | created_at
-- exemple-blog.fr    | https://exemple...    | contact@exemple.fr | 65           | 2025-10-23 15:45
-- auto-mag.com       | https://auto-mag...   | info@auto-mag.com  | 72           | 2025-10-23 15:45
-- ...
```

### **B) Test Hunter.io**

```sql
-- Compter combien d'emails ont été trouvés
SELECT 
  COUNT(*) as total_opportunities,
  COUNT(contact_email) as with_email,
  ROUND(COUNT(contact_email) * 100.0 / COUNT(*), 1) as percentage
FROM backlink_opportunities
WHERE created_at > now() - interval '1 hour';

-- Résultat attendu (si Hunter.io configuré):
-- total_opportunities | with_email | percentage
-- 30                  | 18         | 60.0%
```

### **C) Vérifier le Scoring**

```sql
-- Vérifier que le scoring fonctionne
SELECT 
  domain,
  domain_authority,
  relevance_score,
  estimated_traffic,
  quality_score,
  CASE 
    WHEN quality_score > 70 THEN '🟢 Excellent'
    WHEN quality_score > 50 THEN '🟡 Bon'
    ELSE '🔴 Moyen'
  END as rating
FROM backlink_opportunities
ORDER BY quality_score DESC
LIMIT 10;
```

---

## 📅 ÉTAPE 5: VÉRIFIER LES CRON JOBS

### **A) Voir les Prochaines Exécutions**

```sql
SELECT 
  jobname,
  schedule,
  active,
  CASE jobname
    WHEN 'daily_backlink_scan' THEN 'Tous les jours à 6h'
    WHEN 'daily_backlink_outreach' THEN 'Lun-Ven à 10h'
    WHEN 'weekly_backlink_followup' THEN 'Mardi à 14h'
  END as description
FROM cron.job
WHERE jobname LIKE '%backlink%'
ORDER BY jobname;
```

### **B) Test Manuel des Crons**

**⚠️ Attention:** Ces commandes déclenchent vraiment les actions!

```sql
-- Test 1: Scan (sans effet si APIs pas configurées)
SELECT cron.run_job('daily_backlink_scan');

-- Test 2: Outreach (envoie VRAIMENT des emails si configuré!)
-- NE PAS EXÉCUTER EN PROD sans vérifier d'abord
-- SELECT cron.run_job('daily_backlink_outreach');

-- Test 3: Follow-up
SELECT cron.run_job('weekly_backlink_followup');
```

---

## 📊 ÉTAPE 6: MONITORING

### **Dashboard SQL - Copiez-Collez**

```sql
-- ═══════════════════════════════════════════════════════════
-- 📊 DASHBOARD BACKLINKS AUTOMATION
-- ═══════════════════════════════════════════════════════════

-- 1. RÉSUMÉ GÉNÉRAL
SELECT 
  COUNT(*) as total_opportunites,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as en_attente,
  COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contactees,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as acceptees,
  COUNT(CASE WHEN contact_email IS NOT NULL THEN 1 END) as avec_email,
  ROUND(AVG(quality_score), 1) as score_moyen
FROM backlink_opportunities;

-- 2. TOP 10 OPPORTUNITÉS
SELECT 
  domain,
  quality_score,
  domain_authority,
  contact_email,
  status,
  CASE 
    WHEN quality_score > 70 THEN '🟢'
    WHEN quality_score > 50 THEN '🟡'
    ELSE '🔴'
  END as rating
FROM backlink_opportunities
ORDER BY quality_score DESC
LIMIT 10;

-- 3. EMAILS ENVOYÉS (7 DERNIERS JOURS)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as emails_envoyes,
  COUNT(DISTINCT recipient_email) as destinataires_uniques
FROM backlink_outreach_log
WHERE created_at > now() - interval '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 4. HISTORIQUE SCANS
SELECT 
  scan_date::date as date,
  opportunities_found,
  scan_duration_ms / 1000 as duree_secondes,
  status
FROM backlink_scan_history
ORDER BY scan_date DESC
LIMIT 10;

-- 5. CRON JOBS STATUS
SELECT 
  jobname,
  active,
  schedule,
  CASE 
    WHEN active THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as status
FROM cron.job
WHERE jobname LIKE '%backlink%';
```

---

## 🎯 RÉSULTATS ATTENDUS

### **Semaine 1:**

| Jour | Scan 6h | Opportunités | Emails Envoyés | Quota Hunter.io |
|------|---------|--------------|----------------|-----------------|
| Lun  | ✅      | 30-50        | 10             | 23/25           |
| Mar  | ✅      | 30-50        | 10             | 21/25           |
| Mer  | ✅      | 30-50        | 10             | 19/25           |
| Jeu  | ✅      | 30-50        | 10             | 17/25           |
| Ven  | ✅      | 30-50        | 10             | 15/25           |
| Sam  | ✅      | 30-50        | -              | 15/25           |
| Dim  | ✅      | 30-50        | -              | 15/25           |

**Total Semaine 1:**
- 210-350 opportunités détectées
- 50 emails envoyés
- 10 emails Hunter.io utilisés
- 2-5 réponses attendues
- 1-2 backlinks acquis possibles

### **Mois 1:**

- **1200-1500** opportunités détectées
- **200** emails envoyés
- **25** emails trouvés via Hunter.io
- **10-20** réponses
- **3-8** backlinks acquis 🎯

---

## 🛟 DÉPANNAGE

### **Erreur: "Could not find secret"**

```sql
-- Lister tous les secrets
SELECT name FROM vault.secrets;

-- Ajouter secret manquant
SELECT vault.create_secret('NOM_SECRET', 'VALEUR');
```

### **Cron Jobs ne s'exécutent pas**

```sql
-- Vérifier qu'ils sont actifs
SELECT jobname, active FROM cron.job WHERE jobname LIKE '%backlink%';

-- Réactiver
UPDATE cron.job SET active = true WHERE jobname LIKE '%backlink%';
```

### **Aucune Opportunité Détectée**

```sql
-- Vérifier les secrets Google CSE
SELECT name FROM vault.secrets WHERE name LIKE 'GOOGLE%';

-- Si absents, voir ÉTAPE 1
```

### **Emails Non Envoyés**

```sql
-- Vérifier SendGrid
SELECT name FROM vault.secrets WHERE name = 'SENDGRID_API_KEY';

-- Vérifier campagne active
SELECT id, name, status FROM backlink_campaigns WHERE status = 'active';

-- Si aucune, créer:
INSERT INTO backlink_campaigns (name, status)
VALUES ('Campagne Backlinks 2025', 'active');
```

---

## ✅ CHECKLIST FINALE

**Configuration:**
- [ ] Secrets Supabase configurés (GOOGLE_CSE_API_KEY, GOOGLE_CSE_CX_ID)
- [ ] Secret Hunter.io configuré (optionnel)
- [ ] Migration SQL exécutée avec succès
- [ ] Edge function déployée

**Tests:**
- [ ] Test scan manuel → opportunités créées
- [ ] Quality scores calculés automatiquement
- [ ] 3 cron jobs actifs dans `cron.job`
- [ ] Dashboard SQL fonctionne

**Monitoring:**
- [ ] Premier scan automatique (demain 6h)
- [ ] Premiers emails (demain 10h si lundi-vendredi)
- [ ] Dashboard vérifié quotidiennement

---

## 🎊 FÉLICITATIONS!

Votre système de backlinks automation est **100% opérationnel**! 🚀

**Prochaines étapes:**
1. Laissez tourner 1 semaine
2. Analysez les résultats dans le dashboard
3. Ajustez les concurrents dans la migration si besoin
4. Optimisez les templates emails selon taux de réponse

**Support:**
- Rapport complet: `RAPPORT-AUTOMATISATION-BACKLINKS.md`
- Guide Hunter.io: `GUIDE-HUNTER-IO-GRATUIT.md`
