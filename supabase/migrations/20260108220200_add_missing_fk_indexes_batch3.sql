/*
  # Add Missing Foreign Key Indexes - Batch 3 (Final)

  Final batch of missing FK indexes.
  
  ## Tables Fixed (Batch 3):
  - user_language_preferences (fallback_language, language_code)
  - video_generations (script_id, template_id)
  - workflow_executions (current_step_id)
  - workflow_step_executions (step_id)
  - workflow_steps (parent_step_id)
*/

-- user_language_preferences
CREATE INDEX IF NOT EXISTS idx_user_language_preferences_fallback_language 
ON user_language_preferences(fallback_language);

CREATE INDEX IF NOT EXISTS idx_user_language_preferences_language_code 
ON user_language_preferences(language_code);

-- video_generations
CREATE INDEX IF NOT EXISTS idx_video_generations_script_id 
ON video_generations(script_id);

CREATE INDEX IF NOT EXISTS idx_video_generations_template_id 
ON video_generations(template_id);

-- workflow_executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_current_step_id 
ON workflow_executions(current_step_id);

-- workflow_step_executions
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_step_id 
ON workflow_step_executions(step_id);

-- workflow_steps
CREATE INDEX IF NOT EXISTS idx_workflow_steps_parent_step_id 
ON workflow_steps(parent_step_id);
