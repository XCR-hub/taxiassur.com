# 🎯 GUIDE COMPLET - FIX EMAILS BACKLINKS

## PROBLÈME IDENTIFIÉ

Vous avez **27 opportunités** scrapées dont **16 avec emails valides**, mais **0 email envoyé**.

### Cause racine
Les opportunités sont en status **"new"** au lieu de **"pending"**, donc l'Edge Function `backlink-auto-outreach` ne les voit pas.

---

## SOLUTION EN 1 FICHIER

**Exécutez `FIX-BACKLINK-ENVOI-FINAL-V3.sql` dans Supabase SQL Editor**

### Ce que fait ce fichier :

#### ✅ ÉTAPE 1 : Change status "new" → "pending"
```sql
UPDATE backlink_opportunities
SET status = 'pending'
WHERE status = 'new' AND contact_email IS NOT NULL;
```
→ **16 opportunités** passent en "pending"

#### ✅ ÉTAPE 2 : Crée une campagne active
```sql
INSERT INTO backlink_campaigns (
  name, status, target_count, sent_count, replied_count
) VALUES (
  'Campagne Backlinks TaxiAssur', 'active', 100, 0, 0
);
```
→ Campagne prête à suivre les envois

#### ✅ ÉTAPE 3 : Trigger automatique
```sql
CREATE TRIGGER trigger_auto_update_backlink_status
```
→ Les futures opportunités avec email seront automatiquement en "pending"

#### ✅ ÉTAPE 4 : Test d'envoi
```sql
SELECT net.http_post(...backlink-auto-outreach...)
```
→ Envoie immédiatement **3 emails** de test

#### ✅ ÉTAPE 5 : Vérification des logs
```sql
SELECT * FROM backlink_outreach_log...
```
→ Confirme que les emails sont partis

---

## RÉSULTAT ATTENDU

### Immédiat (après exécution SQL)
- ✅ 16 opportunités en status "pending"
- ✅ 1 campagne active créée
- ✅ 3 emails envoyés (si SendGrid configuré)
- ✅ Dashboard affiche "3 emails envoyés"

### Court terme (5 jours)
- ✅ 13 emails restants envoyés (5/jour via cron)
- ✅ 2-3 réponses positives attendues
- ✅ 1-2 backlinks acquis

### Moyen terme (30 jours)
- ✅ 50-100 nouvelles opportunités scrapées
- ✅ 50+ emails envoyés
- ✅ 10-15 backlinks acquis
- ✅ Domain Authority +5-10 points

---

## PRÉREQUIS IMPORTANT

### SendGrid API Key
Pour que les emails partent **réellement** :

1. **Créer compte SendGrid** (gratuit 100 emails/jour)
   - https://signup.sendgrid.com/

2. **Obtenir API Key**
   - Dashboard → Settings → API Keys
   - Create API Key → Full Access
   - Copier la clé : `SG.xxxxxxxxxxxxx`

3. **Configurer dans Supabase**
   - Supabase Dashboard
   - Project Settings → Edge Functions → Secrets
   - Add secret : `SENDGRID_API_KEY = SG.xxxxxxxxxxxxx`

⚠️ **Sans SendGrid configuré**, l'Edge Function retournera une erreur.

---

## VÉRIFICATION ÉTAPE PAR ÉTAPE

### 1. Avant exécution SQL
```sql
SELECT status, COUNT(*) 
FROM backlink_opportunities 
GROUP BY status;

-- Résultat actuel :
-- new: 26
-- pending: 1
```

### 2. Après ÉTAPE 1 (UPDATE status)
```sql
-- new: 10
-- pending: 17  ← ✅ 16 ajoutés
```

### 3. Après ÉTAPE 4 (Test envoi)
Attendre 30 secondes puis :
```sql
SELECT * FROM backlink_outreach_log 
ORDER BY created_at DESC LIMIT 3;

-- Devrait afficher 3 lignes avec :
-- - action_type: 'email_sent'
-- - status: 'success'
-- - recipient_email: les 3 premiers emails
```

### 4. Dashboard Backlinks
- Rafraîchir la page https://taxiassur.com/backoffice/backlink-reports
- **Emails Envoyés** devrait afficher : **3**
- **Sites Contactés** devrait afficher : **3**

---

## TROUBLESHOOTING

### Problème 1 : "0 emails envoyés" après 30 secondes
**Cause** : SendGrid API Key manquante ou invalide

**Solution** :
1. Vérifier Supabase Secrets contient `SENDGRID_API_KEY`
2. Tester la clé SendGrid :
```bash
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer SG.xxxxx" \
  -H "Content-Type: application/json"
```

### Problème 2 : "Error 401 Unauthorized"
**Cause** : Token Supabase invalide dans le net.http_post

**Solution** : Le token est déjà correct dans le fichier V3

### Problème 3 : "Edge Function not found"
**Cause** : Edge Function `backlink-auto-outreach` pas déployée

**Solution** : 
```bash
# Vérifier sur Supabase Dashboard → Edge Functions
# La fonction doit être listée et active
```

---

## AUTOMATISATION

### Cron Job déjà configuré
Un cron job envoie automatiquement **5 emails/jour** :

```sql
SELECT cron.schedule(
  'backlink-daily-outreach',
  '0 10 * * *',  -- 10h chaque jour
  'SELECT net.http_post(...)'
);
```

### Vérifier le cron
```sql
SELECT * FROM cron.job 
WHERE jobname = 'backlink-daily-outreach';
```

---

## CHECKLIST FINALE

Avant d'exécuter le SQL :
- [ ] SendGrid API Key créée
- [ ] API Key ajoutée dans Supabase Secrets
- [ ] Page Backlink Dashboard ouverte pour voir résultat
- [ ] Console SQL Editor prête

Après exécution :
- [ ] 16 opportunités en "pending" ✅
- [ ] 1 campagne active ✅
- [ ] 3 emails dans les logs ✅
- [ ] Dashboard affiche "3 envoyés" ✅

---

## FICHIERS CONCERNÉS

1. **FIX-BACKLINK-ENVOI-FINAL-V3.sql** ← À EXÉCUTER
2. **GUIDE-COMPLET-BACKLINK-FIX.md** ← Ce fichier
3. **DIAGNOSTIC-BACKLINK-TABLE.sql** ← Pour debug si besoin

---

## SUPPORT

Si problème persiste après exécution :
1. Exécuter `DIAGNOSTIC-BACKLINK-TABLE.sql`
2. Me donner les résultats
3. Vérifier logs Edge Function dans Supabase
