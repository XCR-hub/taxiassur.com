# 📊 Guide d'Application de la Migration Supabase

## ✅ Migration à Appliquer

**Fichier** : `supabase/migrations/20251008003439_create_content_management_tables.sql`

Cette migration crée les tables nécessaires pour le système de gestion de contenu IA.

---

## 🎯 Méthode 1 : Via Supabase Dashboard (Recommandé)

### Étape 1 : Connectez-vous à Supabase
1. Allez sur https://supabase.com
2. Connectez-vous à votre projet
3. Sélectionnez votre projet TaxiAssur

### Étape 2 : Accédez au SQL Editor
1. Dans le menu de gauche, cliquez sur **SQL Editor**
2. Cliquez sur **New query**

### Étape 3 : Copiez-Collez la Migration

Copiez le contenu de `/supabase/migrations/20251008003439_create_content_management_tables.sql` et collez-le dans l'éditeur SQL.

Ou utilisez ce contenu directement :

```sql
-- Create enum types
DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'published', 'scheduled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('hidden', 'published');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('blog', 'faq', 'review');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Blog Posts Table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  meta_description text,
  tags text[] DEFAULT '{}',
  cover_image text,
  author text DEFAULT 'TaxiAssur',
  reading_time integer DEFAULT 5,
  status content_status DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- FAQ Entries Table
CREATE TABLE IF NOT EXISTS faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  tags text[] DEFAULT '{}',
  status content_status DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  source text,
  status review_status DEFAULT 'published',
  created_at timestamptz DEFAULT now()
);

-- Content Schedule Table
CREATE TABLE IF NOT EXISTS content_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type content_type NOT NULL,
  frequency_per_week integer NOT NULL DEFAULT 3,
  auto_publish boolean DEFAULT false,
  keywords text[] DEFAULT '{}',
  last_generated_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_posts
CREATE POLICY "Anyone can view published blog posts"
  ON blog_posts FOR SELECT
  TO public
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));

CREATE POLICY "Authenticated users can manage all blog posts"
  ON blog_posts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for faq_entries
CREATE POLICY "Anyone can view published FAQs"
  ON faq_entries FOR SELECT
  TO public
  USING (status = 'published');

CREATE POLICY "Authenticated users can manage all FAQs"
  ON faq_entries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for reviews
CREATE POLICY "Anyone can view published reviews"
  ON reviews FOR SELECT
  TO public
  USING (status = 'published');

CREATE POLICY "Authenticated users can manage all reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for content_schedule
CREATE POLICY "Authenticated users can manage content schedule"
  ON content_schedule FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_faq_entries_status ON faq_entries(status);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- Insert default content schedule configurations
INSERT INTO content_schedule (content_type, frequency_per_week, auto_publish, keywords)
VALUES
  ('blog', 3, false, ARRAY['assurance taxi', 'RC professionnelle', 'devis gratuit']),
  ('faq', 2, true, ARRAY['prix', 'garanties', 'sinistre', 'résiliation'])
ON CONFLICT DO NOTHING;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for auto-updating updated_at
DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
  CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_faq_entries_updated_at ON faq_entries;
  CREATE TRIGGER update_faq_entries_updated_at
    BEFORE UPDATE ON faq_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_content_schedule_updated_at ON content_schedule;
  CREATE TRIGGER update_content_schedule_updated_at
    BEFORE UPDATE ON content_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

### Étape 4 : Exécutez la Migration
1. Cliquez sur **Run** (ou Ctrl+Enter)
2. Attendez la confirmation "Success"
3. Vérifiez qu'il n'y a pas d'erreurs

### Étape 5 : Vérification
1. Allez dans **Table Editor**
2. Vérifiez que les tables apparaissent :
   - ✅ `blog_posts`
   - ✅ `faq_entries`
   - ✅ `reviews`
   - ✅ `content_schedule`

---

## 🎯 Méthode 2 : Via Supabase CLI (Alternative)

Si vous avez Supabase CLI installé localement :

```bash
# Appliquer la migration
supabase db push

# Ou exécuter le fichier SQL directement
supabase db execute -f supabase/migrations/20251008003439_create_content_management_tables.sql
```

---

## 📊 Tables Créées

### 1. **blog_posts**
Stocke les articles de blog générés par l'IA
- Champs SEO : title, slug, meta_description
- Statuts : draft, published, scheduled
- Tags pour catégorisation

### 2. **faq_entries**
Stocke les questions/réponses FAQ
- Question + réponse
- Tags pour regroupement
- Statuts : draft, published

### 3. **reviews**
Stocke les avis clients (futur usage)
- Nom, note (1-5), commentaire
- Source (Google, Trustpilot, etc.)
- Statuts : hidden, published

### 4. **content_schedule**
Configuration de l'automatisation
- Type de contenu (blog, faq, review)
- Fréquence par semaine
- Mode auto-publish ou draft
- Mots-clés cibles
- État actif/inactif

---

## 🔒 Sécurité (RLS)

**Row Level Security activé** sur toutes les tables :

### Accès Public
- ✅ Lecture des articles **publiés** uniquement
- ✅ Lecture des FAQ **publiées** uniquement
- ✅ Lecture des avis **publiés** uniquement

### Accès Authentifié (Backoffice)
- ✅ Lecture/Écriture complète sur tous les contenus
- ✅ Gestion des planifications

---

## ✅ Après la Migration

Une fois la migration appliquée :

1. **Testez le générateur IA**
   - Allez sur `/backoffice/ai-generator`
   - Générez un article
   - Cliquez sur "Publier"
   - Vérifiez dans Supabase que l'article est enregistré

2. **Configurez la planification**
   - Allez sur `/backoffice/automation-scheduler`
   - Configurez la fréquence souhaitée
   - Activez l'automatisation

3. **Déployez la Edge Function corrigée**
   ```bash
   # Depuis le projet
   supabase functions deploy generate-seo-content
   ```

---

## ❌ Erreurs Courantes

### "relation already exists"
➡️ **Normal** : Les tables existent déjà, pas de problème

### "permission denied"
➡️ **Solution** : Vérifiez que vous êtes bien authentifié sur le bon projet

### "syntax error"
➡️ **Solution** : Assurez-vous d'avoir copié tout le SQL, y compris les DO blocks

---

## 🚀 Prochaine Étape

Après avoir appliqué la migration, déployez la Edge Function corrigée :

```bash
# Déployer la fonction generate-seo-content
supabase functions deploy generate-seo-content
```

Ou via le dashboard Supabase :
1. Edge Functions
2. Deploy new function
3. Upload `/supabase/functions/generate-seo-content/index.ts`

---

**Questions ?** Vérifiez les logs dans Supabase Dashboard → Database → Logs
