# 🚀 SETUP RAPIDE - À EXÉCUTER MAINTENANT

## ✅ ÉTAPE 1 : Variables configurées !

Les fichiers `.env` et `public/env-config.js` sont déjà à jour avec vos clés.

---

## 📊 ÉTAPE 2 : Exécuter le SQL dans Supabase

### Ouvrir l'éditeur SQL

**👉 https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql/new**

### Copier-coller ce code SQL complet

```sql
-- ============================================
-- CRÉATION TABLE LEADS
-- ============================================

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  status text DEFAULT 'taxi',
  immatriculation text,
  fingerprint text,
  behavior_score integer DEFAULT 0,
  time_on_page integer DEFAULT 0,
  source text DEFAULT 'website_form',
  lead_status text DEFAULT 'new',
  emails_sent integer DEFAULT 0,
  last_email_sent_at timestamptz,
  conversion_date timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('taxi', 'vtc', 'autre')),
  CONSTRAINT valid_lead_status CHECK (lead_status IN ('new', 'contacted', 'interested', 'converted', 'lost')),
  CONSTRAINT valid_behavior_score CHECK (behavior_score >= 0 AND behavior_score <= 100),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================
-- INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);

-- ============================================
-- TRIGGER AUTO-UPDATE
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (SÉCURITÉ)
-- ============================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to leads" ON leads;
CREATE POLICY "Service role has full access to leads"
  ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous users to submit leads" ON leads;
CREATE POLICY "Allow anonymous users to submit leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read all leads" ON leads;
CREATE POLICY "Authenticated users can read all leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- VUES STATISTIQUES
-- ============================================

CREATE OR REPLACE VIEW leads_stats AS
SELECT
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE lead_status = 'new') as new_leads,
  COUNT(*) FILTER (WHERE lead_status = 'contacted') as contacted_leads,
  COUNT(*) FILTER (WHERE lead_status = 'interested') as interested_leads,
  COUNT(*) FILTER (WHERE lead_status = 'converted') as converted_leads,
  COUNT(*) FILTER (WHERE lead_status = 'lost') as lost_leads,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_leads,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_leads,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_leads,
  ROUND(AVG(behavior_score), 2) as avg_behavior_score,
  ROUND(AVG(time_on_page) / 1000, 2) as avg_time_on_page_seconds
FROM leads;

CREATE OR REPLACE VIEW recent_leads AS
SELECT
  id,
  name,
  email,
  phone,
  city,
  status,
  lead_status,
  behavior_score,
  created_at
FROM leads
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;

-- ============================================
-- FONCTION STATS PAR VILLE
-- ============================================

CREATE OR REPLACE FUNCTION get_leads_by_city()
RETURNS TABLE (
  city text,
  count bigint,
  converted bigint,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.city,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE l.lead_status = 'converted') as converted,
    ROUND(
      (COUNT(*) FILTER (WHERE l.lead_status = 'converted')::numeric / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as conversion_rate
  FROM leads l
  GROUP BY l.city
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ✅ TERMINÉ !
-- ============================================
```

### Cliquer sur "RUN" (ou Ctrl + Entrée)

✅ Vous devriez voir : **"Success. No rows returned"**

---

## 🧪 ÉTAPE 3 : VÉRIFIER QUE ÇA FONCTIONNE

Dans le même éditeur SQL, exécutez :

```sql
-- Vérifier la table
SELECT COUNT(*) FROM leads;

-- Vérifier les politiques RLS
SELECT tablename, policyname
FROM pg_policies
WHERE tablename = 'leads';

-- Voir les stats
SELECT * FROM leads_stats;
```

**Résultat attendu :**
- `COUNT(*)` = 0 (table vide mais prête) ✅
- 3 politiques RLS visibles ✅
- Vue `leads_stats` fonctionne ✅

---

## 🚀 ÉTAPE 4 : TESTER L'INSERTION D'UN LEAD

Dans le même éditeur SQL :

```sql
INSERT INTO leads (name, email, phone, city, status)
VALUES ('Test Setup', 'test@setup.com', '0612345678', 'Paris', 'taxi')
RETURNING *;
```

✅ Vous devriez voir le lead créé avec un `id` uuid !

---

## 📧 ÉTAPE 5 : DÉPLOYER L'EDGE FUNCTION (OPTIONNEL)

Pour que les emails fonctionnent, vous devez déployer la fonction `send-email`.

### Option A : Via Supabase CLI (recommandé)

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier le projet
supabase link --project-ref drohhxrkoequjphvabvq

# Déployer la fonction
supabase functions deploy send-email
```

### Option B : Via Dashboard Supabase

1. Allez sur https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/functions
2. Cliquez "Deploy new function"
3. Name: `send-email`
4. Copiez le contenu de `supabase/functions/send-email/index.ts`
5. Cliquez "Deploy"

### Ajouter le secret SendGrid

1. Allez dans **Project Settings** > **Edge Functions** > **Secrets**
2. Name : `SENDGRID_API_KEY`
3. Value : Votre clé API SendGrid (SG.xxx...)
4. Cliquez "Save"

---

## ✅ ÉTAPE 6 : BUILD ET TEST

```bash
npm run build
```

Le projet est maintenant 100% opérationnel !

---

## 🎯 RÉCAPITULATIF

- ✅ Variables `.env` et `env-config.js` configurées
- ✅ Table `leads` créée avec RLS
- ✅ 3 politiques de sécurité actives
- ✅ Vues statistiques disponibles
- ✅ Fonction `get_leads_by_city()` prête
- ✅ Projet buildé

### CE QUI FONCTIONNE MAINTENANT :

1. ✅ Formulaire enregistre dans Supabase
2. ✅ Données sécurisées par RLS
3. ✅ Statistiques en temps réel
4. ⏳ Emails (si Edge Function déployée)

---

## 📞 TEST RAPIDE DU FORMULAIRE

1. Lancez : `npm run dev`
2. Ouvrez : http://localhost:5173
3. Remplissez le formulaire
4. Vérifiez dans Supabase : **Table Editor** > **leads**

Vous devriez voir votre lead ! 🎉

---

## 🚨 PROBLÈME ?

### La table n'existe pas ?
→ Réexécutez le SQL complet ci-dessus

### RLS bloque les insertions ?
→ Vérifiez que les 3 politiques sont actives avec :
```sql
SELECT * FROM pg_policies WHERE tablename = 'leads';
```

### Le formulaire ne soumet pas ?
→ Ouvrez la console (F12) et regardez les erreurs

---

**Tout est prêt ! Exécutez juste le SQL et c'est bon ! 🚀**
