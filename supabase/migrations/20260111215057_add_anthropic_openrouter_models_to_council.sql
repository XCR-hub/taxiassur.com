/*
  # Add Anthropic Claude and OpenRouter models to LLM Council

  1. Nouveaux modeles ajoutes
    - Claude 3.5 Sonnet (Anthropic direct) - Chairman
    - Claude 3 Opus (Anthropic direct)
    - DeepSeek Chat (OpenRouter)
    - Llama 3.1 405B (OpenRouter)
    - Qwen 2.5 72B (OpenRouter)

  2. Configuration
    - Claude 3.5 Sonnet devient Chairman (meilleure synthese)
    - 6 modeles actifs pour le conseil multi-provider
*/

-- Ajouter les nouveaux modeles
INSERT INTO llm_council_configs (model_id, display_name, provider, is_active, is_chairman, temperature, max_tokens, priority_order, cost_per_1k_tokens)
VALUES
  ('anthropic/claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'Anthropic', true, true, 0.7, 4096, 1, 0.003),
  ('anthropic/claude-3-opus-20240229', 'Claude 3 Opus', 'Anthropic', true, false, 0.7, 4096, 2, 0.015),
  ('openrouter/deepseek/deepseek-chat', 'DeepSeek Chat', 'OpenRouter', true, false, 0.7, 4096, 8, 0.0001),
  ('openrouter/meta-llama/llama-3.1-405b-instruct', 'Llama 3.1 405B', 'OpenRouter', true, false, 0.7, 4096, 9, 0.003),
  ('openrouter/qwen/qwen-2.5-72b-instruct', 'Qwen 2.5 72B', 'OpenRouter', true, false, 0.7, 4096, 10, 0.0004)
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

-- S'assurer que Claude 3.5 Sonnet est le seul Chairman
UPDATE llm_council_configs SET is_chairman = false WHERE model_id != 'anthropic/claude-3-5-sonnet-20241022';
UPDATE llm_council_configs SET is_chairman = true WHERE model_id = 'anthropic/claude-3-5-sonnet-20241022';

-- Desactiver GPT-4o comme chairman (il reste membre)
UPDATE llm_council_configs SET is_chairman = false WHERE model_id = 'openai/gpt-4o';
