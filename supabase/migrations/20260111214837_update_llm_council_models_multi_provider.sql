/*
  # Update LLM Council Models - Multi-Provider Direct Access

  1. Mise a jour des modeles
    - OpenAI GPT-4o (API directe)
    - Google Gemini 2.0 Flash (API directe)
    - Google Gemini 1.5 Pro (API directe)
    - HuggingFace Mistral 7B (API directe)
    - HuggingFace Zephyr 7B (API directe)

  2. Configuration
    - Chairman: GPT-4o (meilleur synthetiseur)
    - Modeles actifs pour le conseil
*/

-- Supprimer les anciens modeles et ajouter les nouveaux
DELETE FROM llm_council_configs WHERE model_id LIKE '%openrouter%' OR model_id LIKE 'x-ai%' OR model_id LIKE 'deepseek%' OR model_id LIKE 'meta-llama%' OR model_id LIKE 'mistralai%';

-- Inserer/Mettre a jour les modeles avec acces direct aux APIs
INSERT INTO llm_council_configs (model_id, display_name, provider, is_active, is_chairman, temperature, max_tokens, priority_order, cost_per_1k_tokens)
VALUES
  ('openai/gpt-4o', 'GPT-4o', 'OpenAI', true, true, 0.7, 4096, 1, 0.005),
  ('openai/gpt-4o-mini', 'GPT-4o Mini', 'OpenAI', true, false, 0.7, 4096, 2, 0.00015),
  ('google/gemini-2.0-flash', 'Gemini 2.0 Flash', 'Google', true, false, 0.7, 4096, 3, 0.0001),
  ('google/gemini-1.5-flash', 'Gemini 1.5 Flash', 'Google', true, false, 0.7, 4096, 4, 0.00005),
  ('google/gemini-1.5-pro', 'Gemini 1.5 Pro', 'Google', true, false, 0.7, 4096, 5, 0.00125),
  ('huggingface/mistralai/Mistral-7B-Instruct-v0.3', 'Mistral 7B', 'HuggingFace', true, false, 0.7, 2048, 6, 0.0001),
  ('huggingface/HuggingFaceH4/zephyr-7b-beta', 'Zephyr 7B', 'HuggingFace', true, false, 0.7, 2048, 7, 0.0001)
ON CONFLICT (model_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  provider = EXCLUDED.provider,
  is_active = EXCLUDED.is_active,
  is_chairman = EXCLUDED.is_chairman,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  priority_order = EXCLUDED.priority_order,
  cost_per_1k_tokens = EXCLUDED.cost_per_1k_tokens,
  updated_at = now();

-- S'assurer qu'il n'y a qu'un seul chairman
UPDATE llm_council_configs SET is_chairman = false WHERE model_id != 'openai/gpt-4o';
UPDATE llm_council_configs SET is_chairman = true WHERE model_id = 'openai/gpt-4o';
