# 🚀 GUIDE COMPLET DE DÉPLOIEMENT - TAXIASSUR

## 📊 SITUATION ACTUELLE

### ✅ Ce qui fonctionne :
- Les leads s'affichent dans le backoffice
- Les données sont visibles (nom, email, téléphone)
- La politique RLS de lecture est active

### ❌ Ce qui ne fonctionne pas :
- Erreur 500 lors de l'envoi de devis
- Tables supplémentaires manquantes dans Supabase
- Fonctions Edge manquantes

---

## 🎯 OBJECTIF

Déployer la configuration complète pour avoir :
1. ✅ Lecture des leads (FAIT)
2. ✅ Mise à jour des statuts
3. ✅ Envoi de devis/contrats
4. ✅ Toutes les tables nécessaires
5. ✅ Toutes les fonctions

---

## 📋 ÉTAPE 1 : VÉRIFIER LES FICHIERS PHP

### Problème actuel

L'erreur 500 vient de `lead-manager.php` qui n'est pas à jour sur le serveur.

### Solution

**Uploadez ce fichier sur IONOS :**

```
Fichier local : /public/api/lead-manager-supabase.php
Destination : /api/lead-manager.php
```

**Important :** Renommez l'ancien fichier avant :
```
/api/lead-manager.php → /api/lead-manager-OLD-20251007.php
```

### Vérification

Testez cette URL :
```
https://taxiassur.com/api/lead-manager.php?action=list
```

Résultat attendu :
```json
{
  "success": true,
  "leads": [...],
  "count": 8
}
```

---

## 📋 ÉTAPE 2 : CONFIGURER SUPABASE

### Tables actuelles

Vous avez **seulement** :
- ✅ `leads` (table principale)
- ✅ `leads_stats` (vue - marquée "Unrestricted")
- ✅ `recent_leads` (vue - marquée "Unrestricted")

### Tables manquantes

D'après les migrations, il devrait y avoir **15+ tables** :

**Système de backlinks :**
1. `backlink_opportunities`
2. `backlink_outreach_campaigns`
3. `backlink_email_logs`
4. `backlink_email_templates`
5. `backlink_scan_history`

**Système d'automatisation :**
6. `email_inbox`
7. `email_responses`
8. `email_queue`
9. `lead_follow_ups`
10. `partner_prospects`
11. `outreach_campaigns`
12. `competitor_monitoring`
13. `ai_learning_data`
14. `automation_logs`
15. `automation_schedule`
16. `cron_execution_history`

### Dois-je créer toutes ces tables ?

**Réponse : NON pour le moment !**

Pour que le backoffice fonctionne **immédiatement**, vous avez besoin **uniquement** de :
- ✅ `leads` (existe déjà)
- ✅ Politique RLS de lecture (ajoutée)
- ✅ Fonctions de mise à jour

**Les autres tables sont pour :**
- Automatisation avancée (backlinks, campagnes email)
- Fonctionnalités futures
- Pas nécessaires pour le backoffice de base

---

## 📋 ÉTAPE 3 : AJOUTER LES FONCTIONS SUPABASE

### Pourquoi ?

Les fonctions permettent de :
- Mettre à jour les statuts de leads
- Envoyer des devis/contrats
- Obtenir des statistiques

### Comment ?

**1. Connectez-vous à Supabase Dashboard**
```
https://supabase.com/dashboard
```

**2. Ouvrez SQL Editor**

**3. Exécutez ce script :**

```sql
-- Fonction pour mettre à jour le statut d'un lead
CREATE OR REPLACE FUNCTION update_lead_status(
  p_lead_id uuid,
  p_new_status text,
  p_prime_realisee numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_timestamp timestamptz := now();
BEGIN
  UPDATE leads
  SET
    lead_status = p_new_status,
    updated_at = v_timestamp,
    contacted_at = CASE
      WHEN p_new_status = 'contacte' THEN v_timestamp
      ELSE contacted_at
    END,
    devis_envoye_at = CASE
      WHEN p_new_status = 'devis_envoye' THEN v_timestamp
      ELSE devis_envoye_at
    END,
    client_at = CASE
      WHEN p_new_status = 'client' THEN v_timestamp
      ELSE client_at
    END,
    prime_realisee = COALESCE(p_prime_realisee, prime_realisee),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_lead_id;

  SELECT json_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'new_status', p_new_status,
    'updated_at', v_timestamp
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION update_lead_status TO anon;
```

**4. Vérifiez** le message de succès

---

## 📋 ÉTAPE 4 : TESTER LE BACKOFFICE

### Test 1 : Lecture des leads

1. Ouvrez le backoffice → Gestion des leads
2. Vérifiez que tous les leads s'affichent
3. ✅ Si oui : Lecture OK

### Test 2 : Envoi de devis

1. Cliquez sur un lead
2. Cliquez sur "Envoyer un Devis"
3. Vérifiez qu'il n'y a **pas d'erreur 500**
4. Vérifiez que le statut passe à "Devis Envoyé"

**Si erreur 500 :**
- Vérifiez que `lead-manager-supabase.php` est bien uploadé
- Vérifiez qu'il est renommé en `lead-manager.php`
- Consultez les logs PHP sur IONOS

### Test 3 : Envoi de contrat

1. Cliquez sur un lead avec statut "Devis Envoyé"
2. Cliquez sur "Envoyer un Contrat"
3. Vérifiez que le statut passe à "Client"

---

## 📋 ÉTAPE 5 : EDGE FUNCTIONS (OPTIONNEL)

### Actuellement

Vous avez **1 Edge Function** :
- `smart-processor` (déployée il y a 9 heures)

### Fonctions manquantes

D'après le projet, il devrait y avoir **11 fonctions** :
1. `auto-followup`
2. `automation-dashboard-api`
3. `chatbot`
4. `cron-orchestrator`
5. `email-auto-responder`
6. `generate-seo-content`
7. `partner-scraper-outreach`
8. `scan-backlinks`
9. `send-email`
10. `send-outreach-emails`
11. `webhook-email-receiver`

### Dois-je les déployer ?

**Réponse : NON pour le moment !**

Ces fonctions sont pour :
- Automatisation avancée
- Emails automatiques
- Chatbot IA
- Scraping de backlinks

**Pour le backoffice de base, vous n'en avez PAS besoin !**

---

## ✅ CONFIGURATION MINIMALE POUR BACKOFFICE FONCTIONNEL

### Fichiers PHP à uploader sur IONOS

**1. lead-manager.php** (le principal)
```
Source : /public/api/lead-manager-supabase.php
Destination : /api/lead-manager.php
```

**2. test-supabase-leads.php** (pour tester)
```
Source : /public/api/test-supabase-leads.php
Destination : /api/test-supabase-leads.php
```

### SQL à exécuter dans Supabase

**1. Politique RLS de lecture** (FAIT ✅)
```sql
CREATE POLICY "Allow public read access to leads"
  ON leads FOR SELECT TO anon USING (true);
```

**2. Fonction de mise à jour**
```sql
CREATE OR REPLACE FUNCTION update_lead_status(...)
-- (voir script complet ci-dessus)
```

### C'est tout !

Avec ces 2 fichiers PHP + 2 requêtes SQL, le backoffice sera **100% fonctionnel** !

---

## 🔍 DIAGNOSTIC DES ERREURS

### Erreur 500 lors de l'envoi de devis

**Causes possibles :**
1. ❌ Le fichier `lead-manager.php` n'est pas à jour
2. ❌ La fonction `update_lead_status` n'existe pas dans Supabase
3. ❌ Permissions manquantes sur la fonction

**Solutions :**
1. ✅ Uploader `lead-manager-supabase.php` → `lead-manager.php`
2. ✅ Exécuter le script SQL de création de fonction
3. ✅ Vérifier les permissions : `GRANT EXECUTE ON FUNCTION update_lead_status TO anon;`

### Erreur "permission denied"

**Cause :** Fonction non accessible avec la clé anon

**Solution :**
```sql
GRANT EXECUTE ON FUNCTION update_lead_status TO anon;
GRANT EXECUTE ON FUNCTION update_lead_status TO authenticated;
```

### Leads toujours à 0

**Cause :** Politique RLS manquante

**Solution :**
```sql
CREATE POLICY "Allow public read access to leads"
  ON leads FOR SELECT TO anon USING (true);
```

---

## 📊 CHECKLIST FINALE

### Supabase
- [x] 1. Politique RLS de lecture ajoutée
- [ ] 2. Fonction `update_lead_status` créée
- [ ] 3. Permissions `GRANT EXECUTE` ajoutées
- [ ] 4. Test avec SQL Editor réussi

### IONOS
- [ ] 5. `lead-manager-supabase.php` uploadé
- [ ] 6. Renommé en `lead-manager.php`
- [ ] 7. Ancien fichier sauvegardé
- [ ] 8. Test API : `?action=list` retourne des leads

### Backoffice
- [ ] 9. Leads s'affichent
- [ ] 10. Envoi devis fonctionne (pas d'erreur 500)
- [ ] 11. Envoi contrat fonctionne
- [ ] 12. Changement de statut visible

---

## 🎯 RÉSUMÉ ULTRA-SIMPLE

**Pour un backoffice fonctionnel :**

1. **Upload PHP** : `lead-manager-supabase.php` → `/api/lead-manager.php`

2. **SQL Supabase** : Exécutez dans SQL Editor
   ```sql
   -- Fonction de mise à jour
   CREATE OR REPLACE FUNCTION update_lead_status(...);
   GRANT EXECUTE ON FUNCTION update_lead_status TO anon;
   ```

3. **Test** : Backoffice → Envoi devis → Pas d'erreur !

**C'est tout ! 🚀**

---

## 📁 FICHIERS FOURNIS

1. `lead-manager-supabase.php` - API PHP complète
2. `test-supabase-leads.php` - Test de connexion
3. `SUPABASE-COMPLETE-SETUP.sql` - Script SQL complet
4. `FIX-BACKOFFICE-LEADS.md` - Guide de fix RLS
5. `GUIDE-COMPLET-DEPLOYMENT.md` - Ce guide

---

## 🆘 BESOIN D'AIDE ?

**Si l'erreur 500 persiste après upload :**

1. Vérifiez le nom du fichier sur IONOS (doit être `lead-manager.php`)
2. Vérifiez la date de modification (doit être aujourd'hui)
3. Testez `test-supabase-leads.php` pour vérifier la connexion
4. Consultez les logs PHP sur IONOS
5. Exécutez le script `SUPABASE-COMPLETE-SETUP.sql` dans SQL Editor

**Tout est prêt pour être déployé ! 🎉**
