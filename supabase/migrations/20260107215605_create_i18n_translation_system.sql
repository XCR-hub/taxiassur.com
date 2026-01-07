/*
  # Système i18n Multi-Langues

  1. Nouvelles Tables
    - `languages` - Langues supportées
    - `translations` - Traductions par clé
    - `user_language_preferences` - Préférences utilisateurs

  2. Langues Supportées
    - Français (fr)
    - English (en)
    - Español (es)
    - Deutsch (de)
    - Italiano (it)
    - العربية (ar)

  3. Security
    - RLS activé
    - Traductions publiques en lecture
    - Modification admin uniquement
*/

-- Table des langues
CREATE TABLE IF NOT EXISTS languages (
  code text PRIMARY KEY, -- fr, en, es, de, it, ar
  name text NOT NULL,
  native_name text NOT NULL,
  is_rtl boolean DEFAULT false,
  is_active boolean DEFAULT true,
  flag_emoji text,
  created_at timestamptz DEFAULT now()
);

-- Table des traductions
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL, -- ex: "dashboard.welcome"
  language_code text REFERENCES languages(code) ON DELETE CASCADE,
  value text NOT NULL,
  context text, -- Description pour les traducteurs
  category text, -- ui, email, seo, legal
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(key, language_code)
);

-- Table des préférences utilisateurs
CREATE TABLE IF NOT EXISTS user_language_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  language_code text REFERENCES languages(code),
  fallback_language text REFERENCES languages(code) DEFAULT 'en',
  auto_detect boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key);
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_code);
CREATE INDEX IF NOT EXISTS idx_translations_category ON translations(category);
CREATE INDEX IF NOT EXISTS idx_translations_key_lang ON translations(key, language_code);

-- Enable RLS
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_language_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active languages"
  ON languages FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins manage languages"
  ON languages FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Everyone can view translations"
  ON translations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins manage translations"
  ON translations FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Users manage own preferences"
  ON user_language_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insérer les langues
INSERT INTO languages (code, name, native_name, is_rtl, flag_emoji) VALUES
('fr', 'French', 'Français', false, '🇫🇷'),
('en', 'English', 'English', false, '🇬🇧'),
('es', 'Spanish', 'Español', false, '🇪🇸'),
('de', 'German', 'Deutsch', false, '🇩🇪'),
('it', 'Italian', 'Italiano', false, '🇮🇹'),
('ar', 'Arabic', 'العربية', true, '🇸🇦')
ON CONFLICT DO NOTHING;

-- Traductions de base (UI commune)
INSERT INTO translations (key, language_code, value, category) VALUES
-- Navigation
('nav.home', 'fr', 'Accueil', 'ui'),
('nav.home', 'en', 'Home', 'ui'),
('nav.home', 'es', 'Inicio', 'ui'),
('nav.home', 'de', 'Startseite', 'ui'),
('nav.home', 'it', 'Home', 'ui'),
('nav.home', 'ar', 'الرئيسية', 'ui'),

('nav.about', 'fr', 'À propos', 'ui'),
('nav.about', 'en', 'About', 'ui'),
('nav.about', 'es', 'Acerca de', 'ui'),
('nav.about', 'de', 'Über uns', 'ui'),
('nav.about', 'it', 'Chi siamo', 'ui'),
('nav.about', 'ar', 'عن', 'ui'),

('nav.contact', 'fr', 'Contact', 'ui'),
('nav.contact', 'en', 'Contact', 'ui'),
('nav.contact', 'es', 'Contacto', 'ui'),
('nav.contact', 'de', 'Kontakt', 'ui'),
('nav.contact', 'it', 'Contatto', 'ui'),
('nav.contact', 'ar', 'اتصل', 'ui'),

-- Boutons communs
('common.submit', 'fr', 'Envoyer', 'ui'),
('common.submit', 'en', 'Submit', 'ui'),
('common.submit', 'es', 'Enviar', 'ui'),
('common.submit', 'de', 'Senden', 'ui'),
('common.submit', 'it', 'Invia', 'ui'),
('common.submit', 'ar', 'إرسال', 'ui'),

('common.cancel', 'fr', 'Annuler', 'ui'),
('common.cancel', 'en', 'Cancel', 'ui'),
('common.cancel', 'es', 'Cancelar', 'ui'),
('common.cancel', 'de', 'Abbrechen', 'ui'),
('common.cancel', 'it', 'Annulla', 'ui'),
('common.cancel', 'ar', 'إلغاء', 'ui'),

('common.save', 'fr', 'Enregistrer', 'ui'),
('common.save', 'en', 'Save', 'ui'),
('common.save', 'es', 'Guardar', 'ui'),
('common.save', 'de', 'Speichern', 'ui'),
('common.save', 'it', 'Salva', 'ui'),
('common.save', 'ar', 'حفظ', 'ui'),

('common.delete', 'fr', 'Supprimer', 'ui'),
('common.delete', 'en', 'Delete', 'ui'),
('common.delete', 'es', 'Eliminar', 'ui'),
('common.delete', 'de', 'Löschen', 'ui'),
('common.delete', 'it', 'Elimina', 'ui'),
('common.delete', 'ar', 'حذف', 'ui'),

-- Dashboard
('dashboard.welcome', 'fr', 'Bienvenue', 'ui'),
('dashboard.welcome', 'en', 'Welcome', 'ui'),
('dashboard.welcome', 'es', 'Bienvenido', 'ui'),
('dashboard.welcome', 'de', 'Willkommen', 'ui'),
('dashboard.welcome', 'it', 'Benvenuto', 'ui'),
('dashboard.welcome', 'ar', 'مرحبا', 'ui'),

('dashboard.stats', 'fr', 'Statistiques', 'ui'),
('dashboard.stats', 'en', 'Statistics', 'ui'),
('dashboard.stats', 'es', 'Estadísticas', 'ui'),
('dashboard.stats', 'de', 'Statistiken', 'ui'),
('dashboard.stats', 'it', 'Statistiche', 'ui'),
('dashboard.stats', 'ar', 'إحصائيات', 'ui')
ON CONFLICT (key, language_code) DO NOTHING;

-- Fonction pour obtenir une traduction avec fallback
CREATE OR REPLACE FUNCTION get_translation(
  p_key text,
  p_language_code text DEFAULT 'fr',
  p_fallback_language text DEFAULT 'en'
)
RETURNS text AS $$
DECLARE
  v_translation text;
BEGIN
  -- Essayer langue demandée
  SELECT value INTO v_translation
  FROM translations
  WHERE key = p_key AND language_code = p_language_code;
  
  IF v_translation IS NOT NULL THEN
    RETURN v_translation;
  END IF;
  
  -- Essayer fallback
  SELECT value INTO v_translation
  FROM translations
  WHERE key = p_key AND language_code = p_fallback_language;
  
  IF v_translation IS NOT NULL THEN
    RETURN v_translation;
  END IF;
  
  -- Retourner la clé si rien trouvé
  RETURN p_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
