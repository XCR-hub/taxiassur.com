# 🔴 CORRECTION ERREUR 400 - BACKLINK AUTOMATION

## ❌ PROBLÈME ACTUEL

**Erreur Console:**
```
Could not find a relationship between 'backlink_outreach_log' 
and 'backlink_opportunities' in the schema cache
Hint: Perhaps you meant 'backlink_campaigns' instead
```

**Symptôme:**
- Bouton "Lancer Automatisation" grisé
- Tableau vide
- Erreur 400 sur requête REST

---

## 🔍 DIAGNOSTIC

L'erreur dit: **"backlink_opportunities table not found"**

Cela signifie que **LA TABLE N'EXISTE PAS DANS SUPABASE!**

Le code cherche à joindre `backlink_outreach_log` avec `backlink_opportunities`,
mais cette table n'existe pas encore dans votre base de données.

---

## ✅ SOLUTION: EXÉCUTER LA MIGRATION SQL

### **Étape 1: Ouvrir SQL Editor Supabase**

https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql

### **Étape 2: Vérifier si la table existe**

```sql
-- Vérifier les tables backlink existantes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'backlink%'
ORDER BY table_name;
```

**Résultat actuel (probablement):**
```
table_name
backlink_campaigns
backlink_outreach_log
```

**Manquant:** `backlink_opportunities` ❌

---

### **Étape 3: Créer la table manquante**

**Coller ce code dans SQL Editor:**

```sql
-- ═══════════════════════════════════════════════════════════════
--  ✅ CRÉER TABLE backlink_opportunities
-- ═══════════════════════════════════════════════════════════════

-- 1. Créer la table principale
CREATE TABLE IF NOT EXISTS backlink_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  url text NOT NULL UNIQUE,
  title text,
  description text,
  contact_email text,
  contact_name text,
  quality_score numeric DEFAULT 0,
  domain_authority numeric,
  page_authority numeric,
  spam_score numeric,
  found_via text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'replied', 'accepted', 'rejected', 'acquired')),
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Créer les index pour performance
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_status 
  ON backlink_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_quality_score 
  ON backlink_opportunities(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_created_at 
  ON backlink_opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_domain 
  ON backlink_opportunities(domain);

-- 3. Activer RLS
ALTER TABLE backlink_opportunities ENABLE ROW LEVEL SECURITY;

-- 4. Créer politique lecture publique (pour backoffice)
DROP POLICY IF EXISTS "Allow public read access" ON backlink_opportunities;
CREATE POLICY "Allow public read access" 
  ON backlink_opportunities 
  FOR SELECT 
  TO public 
  USING (true);

-- 5. Créer politique écriture publique (pour edge functions)
DROP POLICY IF EXISTS "Allow public insert access" ON backlink_opportunities;
CREATE POLICY "Allow public insert access" 
  ON backlink_opportunities 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access" ON backlink_opportunities;
CREATE POLICY "Allow public update access" 
  ON backlink_opportunities 
  FOR UPDATE 
  TO public 
  USING (true)
  WITH CHECK (true);

-- 6. Créer la relation avec backlink_outreach_log
ALTER TABLE backlink_outreach_log 
  DROP CONSTRAINT IF EXISTS backlink_outreach_log_opportunity_id_fkey;

-- Vérifier que la colonne opportunity_id existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backlink_outreach_log' 
      AND column_name = 'opportunity_id'
  ) THEN
    ALTER TABLE backlink_outreach_log 
      ADD COLUMN opportunity_id uuid REFERENCES backlink_opportunities(id);
  END IF;
END $$;

-- Créer la contrainte de clé étrangère
ALTER TABLE backlink_outreach_log 
  ADD CONSTRAINT backlink_outreach_log_opportunity_id_fkey 
  FOREIGN KEY (opportunity_id) 
  REFERENCES backlink_opportunities(id) 
  ON DELETE CASCADE;

-- 7. Vérifier la création
SELECT 
  'backlink_opportunities' as table_name,
  COUNT(*) as row_count,
  '✅ Table créée avec succès' as status
FROM backlink_opportunities;
```

**Cliquer "Run" ou Ctrl+Enter**

---

### **Étape 4: Vérifier les tables**

```sql
-- Lister toutes les tables backlink
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE columns.table_name = tables.table_name) as columns_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'backlink%'
ORDER BY table_name;
```

**Résultat attendu:**
```
table_name                  | columns_count
backlink_campaigns          | 8
backlink_opportunities      | 17  ← NOUVEAU
backlink_outreach_log       | 10
```

---

### **Étape 5: Tester la page**

1. Retourner sur: https://taxiassur.com/backoffice/backlink-automation
2. **Ctrl+Shift+R** (hard refresh)
3. Vérifier la console

**Résultat attendu:**
- ✅ Plus d'erreur 400
- ✅ Bouton "Lancer Automatisation" actif (bleu)
- ✅ Tableaux vides (normal, pas encore de données)

---

## 🧪 TESTER LE SYSTÈME

Une fois la table créée, tester le scan:

```sql
-- Insérer une opportunité test
INSERT INTO backlink_opportunities (
  domain, url, title, quality_score, status
) VALUES (
  'example.com',
  'https://example.com/test',
  'Test Opportunity',
  75.5,
  'new'
) ON CONFLICT (url) DO NOTHING;

-- Vérifier l'insertion
SELECT * FROM backlink_opportunities;
```

**Recharger la page backlink-automation**

Vous devriez voir l'opportunité test dans le tableau! 🎉

---

## 📋 CHECKLIST RÉSOLUTION

- [ ] Exécuter SQL création table `backlink_opportunities`
- [ ] Vérifier 3 tables backlink existantes
- [ ] Recharger page avec Ctrl+Shift+R
- [ ] Plus d'erreur 400 dans console
- [ ] Bouton "Lancer Automatisation" actif
- [ ] Insérer opportunité test
- [ ] Opportunité visible dans tableau

---

## 🎯 APRÈS RÉSOLUTION

Une fois la table créée, vous pouvez:

1. **Ajouter la clé Hunter.io:**
   ```sql
   SELECT vault.create_secret(
     'HUNTER_IO_API_KEY',
     '1e15e1c7b4db255256872dc4bf9939f3b655981c',
     'Hunter.io API Key'
   );
   ```

2. **Lancer le scan manuel:**
   ```sql
   SELECT cron.run_job('daily_backlink_scan');
   ```

3. **Attendre 60 secondes**

4. **Vérifier les résultats:**
   ```sql
   SELECT COUNT(*) as total, COUNT(contact_email) as with_email
   FROM backlink_opportunities
   WHERE created_at > now() - interval '5 minutes';
   ```

---

## ⚠️ POURQUOI CE PROBLÈME?

La migration SQL complète n'a probablement pas été exécutée.

**Fichier complet à exécuter:**
`supabase/migrations/20251023110000_backlink_automation_complete.sql`

Ce fichier contient:
- Création table `backlink_opportunities`
- Création table `backlink_campaigns`
- Fonction de scoring
- 3 cron jobs
- Toutes les relations

**Solution rapide ci-dessus:** Crée juste la table manquante
**Solution complète:** Exécuter tout le fichier migration

---

## 📞 SI ÇA NE MARCHE TOUJOURS PAS

**Erreur persiste après création table?**

Vérifier les politiques RLS:

```sql
-- Voir les politiques existantes
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'backlink_opportunities';
```

Si vide, réexécuter les politiques (étape 4 du SQL ci-dessus).

---

**🎯 Temps:** 2 minutes  
**🎁 Résultat:** Page fonctionnelle + Système activé
