/*
  # Add multi-model tracking to AI decisions

  1. Modified Tables
    - `crm_ai_decisions`
      - `model_used` (text) - Label of the AI model used (e.g. "GPT-4o", "Claude Sonnet", "Gemini 2.0 Flash")
      - `model_provider` (text) - Provider identifier (openai, anthropic, gemini, huggingface)

  2. Important Notes
    - Existing decisions will have NULL for these columns (backwards compatible)
    - New decisions from the multi-provider engine will populate both fields
    - Enables tracking which AI model generates the best decisions per agent type
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_ai_decisions' AND column_name = 'model_used'
  ) THEN
    ALTER TABLE crm_ai_decisions ADD COLUMN model_used text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_ai_decisions' AND column_name = 'model_provider'
  ) THEN
    ALTER TABLE crm_ai_decisions ADD COLUMN model_provider text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_ai_decisions_model_provider
  ON crm_ai_decisions(model_provider)
  WHERE model_provider IS NOT NULL;
