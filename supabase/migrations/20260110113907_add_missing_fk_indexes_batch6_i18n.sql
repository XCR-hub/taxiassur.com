/*
  # Add Missing Foreign Key Indexes - Batch 6: Internationalization

  1. Performance Improvements
    - Add indexes on language preference foreign keys
    - Improves i18n queries

  2. Indexes Added
    - user_language_preferences.language_code
    - user_language_preferences.fallback_language
*/

-- User Language Preferences
CREATE INDEX IF NOT EXISTS idx_user_language_preferences_language_code
  ON user_language_preferences(language_code);

CREATE INDEX IF NOT EXISTS idx_user_language_preferences_fallback_language
  ON user_language_preferences(fallback_language);
