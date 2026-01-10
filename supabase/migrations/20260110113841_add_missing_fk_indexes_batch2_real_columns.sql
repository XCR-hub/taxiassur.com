/*
  # Add Missing Foreign Key Indexes - Batch 2: Email & Communications

  1. Performance Improvements
    - Add indexes on foreign key columns that exist
    - Improves email and communication queries

  2. Indexes Added
    - email_classifications.email_id
    - email_replies.email_send_id
    - dynamic_content_blocks.personalization_rule_id
*/

-- Email Classifications
CREATE INDEX IF NOT EXISTS idx_email_classifications_email_id
  ON email_classifications(email_id);

-- Email Replies
CREATE INDEX IF NOT EXISTS idx_email_replies_email_send_id
  ON email_replies(email_send_id);

-- Dynamic Content Blocks
CREATE INDEX IF NOT EXISTS idx_dynamic_content_blocks_personalization_rule_id
  ON dynamic_content_blocks(personalization_rule_id);
