# 🔴 ACTION IMMÉDIATE - FIX RELATION BACKLINK

**Temps:** 1 minute  
**Problème:** Erreur 400 - "Could not find relationship"

---

## 📍 FAIRE MAINTENANT

### **Étape 1: Exécuter le fix (30 sec)**

1. **Ouvrir SQL Editor:**
   https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql

2. **New Query**

3. **Copier-coller ce code:**

```sql
-- Ajouter la colonne opportunity_id si manquante
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backlink_outreach_log' 
      AND column_name = 'opportunity_id'
  ) THEN
    ALTER TABLE backlink_outreach_log 
      ADD COLUMN opportunity_id uuid;
  END IF;
END $$;

-- Créer la relation
ALTER TABLE backlink_outreach_log 
  DROP CONSTRAINT IF EXISTS backlink_outreach_log_opportunity_id_fkey;

ALTER TABLE backlink_outreach_log 
  ADD CONSTRAINT backlink_outreach_log_opportunity_id_fkey 
  FOREIGN KEY (opportunity_id) 
  REFERENCES backlink_opportunities(id) 
  ON DELETE CASCADE;

-- Créer index
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_log_opportunity_id 
  ON backlink_outreach_log(opportunity_id);

-- Test
INSERT INTO backlink_opportunities (
  domain, url, title, quality_score, status
) VALUES (
  'test-relation.fr',
  'https://test-relation.fr/test',
  'Test Relation',
  75.0,
  'new'
) ON CONFLICT (url) DO NOTHING;

-- Vérifier
SELECT '✅ SUCCÈS' as status, COUNT(*) as count 
FROM backlink_opportunities;
```

4. **Cliquer "Run"**

5. **Résultat attendu:**
   ```
   status     | count
   ✅ SUCCÈS  | 1
   ```

---

### **Étape 2: Rafraîchir le cache Supabase (30 sec)**

**Dans SQL Editor, nouvelle query:**

```sql
-- Forcer le rafraîchissement du cache de schéma
NOTIFY pgrst, 'reload schema';

-- Vérifier la relation est visible
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'backlink_outreach_log'
  AND kcu.column_name = 'opportunity_id';
```

**Résultat attendu:**
```
table_name              | column_name   | foreign_table
backlink_outreach_log   | opportunity_id | backlink_opportunities
```

✅ **Si vous voyez cette ligne → C'est bon!**

---

### **Étape 3: Tester la page (30 sec)**

1. Aller sur: https://taxiassur.com/backoffice/backlink-automation

2. **Attendre 30 secondes** (le cache met du temps à se rafraîchir)

3. **Ctrl+Shift+R** (hard refresh)

4. Vérifier console:
   - ✅ Plus d'erreur 400
   - ✅ Bouton "Lancer Automatisation" actif

---

## ⚠️ SI ÇA NE MARCHE PAS

**Forcer le redémarrage de PostgREST:**

1. **Dans SQL Editor:**
   ```sql
   -- Forcer un changement pour redémarrer PostgREST
   COMMENT ON TABLE backlink_opportunities IS 'Updated to force PostgREST reload';
   ```

2. **Attendre 30 secondes**

3. **Recharger la page**

---

## 🧪 TEST FINAL

**Dans SQL Editor:**

```sql
-- Vérifier que la relation fonctionne
SELECT 
  bol.id,
  bol.recipient_email,
  bo.domain,
  bo.url
FROM backlink_outreach_log bol
LEFT JOIN backlink_opportunities bo ON bol.opportunity_id = bo.id
LIMIT 5;
```

Si ça fonctionne sans erreur → **SUCCÈS!** 🎉

---

## 📋 CHECKLIST

- [ ] SQL fix exécuté avec succès
- [ ] Cache Supabase rafraîchi (NOTIFY pgrst)
- [ ] Relation visible dans information_schema
- [ ] Page rechargée (Ctrl+Shift+R)
- [ ] Plus d'erreur 400 dans console
- [ ] Bouton actif et bleu

---

## 🎯 APRÈS

Une fois réparé:

1. **Ajouter clé Hunter.io** (si pas fait):
   ```sql
   SELECT vault.create_secret(
     'HUNTER_IO_API_KEY',
     '1e15e1c7b4db255256872dc4bf9939f3b655981c',
     'Hunter.io API Key'
   );
   ```

2. **Lancer premier scan:**
   ```sql
   SELECT cron.run_job('daily_backlink_scan');
   ```

3. **Attendre 60 secondes**

4. **Vérifier:**
   ```sql
   SELECT COUNT(*) FROM backlink_opportunities
   WHERE created_at > now() - interval '5 minutes';
   ```

   Résultat: 30-50 opportunités ✅

---

**🎊 C'est terminé! Le système est opérationnel!**
