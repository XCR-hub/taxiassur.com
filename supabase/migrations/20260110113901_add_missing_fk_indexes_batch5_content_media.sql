/*
  # Add Missing Foreign Key Indexes - Batch 5: Content & Media

  1. Performance Improvements
    - Add indexes on content and media foreign keys
    - Improves content, video, and PDF queries

  2. Indexes Added
    - used_images.article_id
    - video_generations.script_id
    - video_generations.template_id
    - pdf_exports.template_id
    - rfm_history.segment_id
*/

-- Used Images
CREATE INDEX IF NOT EXISTS idx_used_images_article_id
  ON used_images(article_id);

-- Video Generations
CREATE INDEX IF NOT EXISTS idx_video_generations_script_id
  ON video_generations(script_id);

CREATE INDEX IF NOT EXISTS idx_video_generations_template_id
  ON video_generations(template_id);

-- PDF Exports
CREATE INDEX IF NOT EXISTS idx_pdf_exports_template_id
  ON pdf_exports(template_id);

-- RFM History
CREATE INDEX IF NOT EXISTS idx_rfm_history_segment_id
  ON rfm_history(segment_id);
