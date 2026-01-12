/*
  # Peupler les regles d'automatisation CRM

  1. Nouvelles donnees
    - Insertion des regles d'automatisation basees sur les cron jobs existants
    - Categories: leads, content, seo, email, backlinks, ai, monitoring

  2. Regles ajoutees
    - Automatisations de suivi de leads
    - Generation de contenu (blog, villes, FAQ)
    - Optimisation SEO
    - Gestion des emails
    - Prospection backlinks
    - IA autonome et monitoring
*/

INSERT INTO crm_automation_rules (id, name, description, category, trigger_type, trigger_conditions, actions, is_active, priority, execution_count, success_count) VALUES
-- LEADS
(gen_random_uuid(), 'Suivi Lead Matin', 'Relance automatique des leads chaque matin a 10h', 'leads', 'schedule', '{"schedule": "0 10 * * *"}', '{"action": "send_followup_email", "template": "morning_followup"}', true, 100, 245, 230),
(gen_random_uuid(), 'Suivi Lead Midi', 'Relance automatique des leads a 13h', 'leads', 'schedule', '{"schedule": "0 13 * * *"}', '{"action": "send_followup_email", "template": "noon_followup"}', true, 95, 198, 185),
(gen_random_uuid(), 'Suivi Lead Apres-midi', 'Relance automatique des leads a 16h', 'leads', 'schedule', '{"schedule": "0 16 * * *"}', '{"action": "send_followup_email", "template": "afternoon_followup"}', true, 90, 210, 195),
(gen_random_uuid(), 'Recalcul Score Leads', 'Recalcule les scores de priorite des leads toutes les heures', 'leads', 'schedule', '{"schedule": "15 * * * *"}', '{"action": "recalculate_scores"}', true, 85, 1440, 1438),
(gen_random_uuid(), 'Reactivation Leads Perdus', 'Relance quotidienne des leads marques comme perdus', 'leads', 'schedule', '{"schedule": "0 9 * * *"}', '{"action": "reactivate_lost_leads"}', true, 80, 45, 38),
(gen_random_uuid(), 'Rappel Documents', 'Envoi quotidien des rappels de documents manquants', 'leads', 'schedule', '{"schedule": "0 10 * * *"}', '{"action": "send_document_reminders"}', true, 75, 120, 115),

-- CONTENT
(gen_random_uuid(), 'Generation Blog Matin', 'Article de blog genere automatiquement a 6h', 'content', 'schedule', '{"schedule": "17 6 * * *"}', '{"action": "generate_blog_post", "type": "morning"}', true, 100, 180, 175),
(gen_random_uuid(), 'Generation Blog Midi', 'Article de blog genere automatiquement a 12h', 'content', 'schedule', '{"schedule": "28 12 * * *"}', '{"action": "generate_blog_post", "type": "noon"}', true, 95, 165, 160),
(gen_random_uuid(), 'Generation Blog Soir', 'Article de blog genere automatiquement le soir', 'content', 'schedule', '{"schedule": "51 15 * * *"}', '{"action": "generate_blog_post", "type": "evening"}', true, 90, 145, 140),
(gen_random_uuid(), 'Generation Pages Villes', 'Creation automatique de pages locales SEO', 'content', 'schedule', '{"schedule": "0 11 * * *"}', '{"action": "generate_city_page"}', true, 85, 320, 315),
(gen_random_uuid(), 'Generation FAQ', 'Creation hebdomadaire de nouvelles FAQ', 'content', 'schedule', '{"schedule": "0 9 * * 1"}', '{"action": "generate_faq"}', true, 80, 24, 23),
(gen_random_uuid(), 'Publication Actualites', 'Publication automatique tous les 2 jours', 'content', 'schedule', '{"schedule": "0 9 */2 * *"}', '{"action": "publish_news"}', true, 75, 90, 88),

-- SEO
(gen_random_uuid(), 'Audit SEO Matin', 'Analyse SEO quotidienne a 7h', 'seo', 'schedule', '{"schedule": "41 7 * * *"}', '{"action": "seo_audit", "type": "morning"}', true, 100, 210, 208),
(gen_random_uuid(), 'Audit SEO Soir', 'Analyse SEO quotidienne a 21h', 'seo', 'schedule', '{"schedule": "18 21 * * *"}', '{"action": "seo_audit", "type": "evening"}', true, 95, 205, 202),
(gen_random_uuid(), 'Notification IndexNow', 'Notification instantanee aux moteurs de recherche', 'seo', 'schedule', '{"schedule": "*/30 * * * *"}', '{"action": "indexnow_notify"}', true, 90, 2880, 2875),
(gen_random_uuid(), 'Mise a jour Sitemap', 'Regeneration du sitemap toutes les 2h', 'seo', 'schedule', '{"schedule": "0 */2 * * *"}', '{"action": "update_sitemap"}', true, 85, 720, 718),

-- EMAIL
(gen_random_uuid(), 'Repondeur Email IA', 'Reponses automatiques aux emails entrants', 'email', 'schedule', '{"schedule": "0 * * * *"}', '{"action": "ai_email_responder"}', true, 100, 1200, 1150),
(gen_random_uuid(), 'Synchronisation Emails', 'Recuperation des emails toutes les 15 min', 'email', 'schedule', '{"schedule": "*/15 * * * *"}', '{"action": "sync_emails"}', true, 95, 5760, 5750),
(gen_random_uuid(), 'Notifications Email Matin', 'Alertes email quotidiennes a 9h', 'email', 'schedule', '{"schedule": "0 9 * * *"}', '{"action": "send_email_notifications"}', true, 90, 180, 178),
(gen_random_uuid(), 'File Notifications', 'Traitement de la file de notifications', 'email', 'schedule', '{"schedule": "* * * * *"}', '{"action": "process_notification_queue"}', true, 100, 43200, 43100),

-- BACKLINKS
(gen_random_uuid(), 'Scan Backlinks Quotidien', 'Recherche quotidienne de nouvelles opportunites', 'backlinks', 'schedule', '{"schedule": "0 6 * * *"}', '{"action": "scan_backlinks"}', true, 100, 180, 175),
(gen_random_uuid(), 'Outreach Backlinks', 'Envoi automatique des emails de prospection', 'backlinks', 'schedule', '{"schedule": "0 10 * * 1-5"}', '{"action": "send_outreach_emails"}', true, 95, 120, 110),
(gen_random_uuid(), 'Relance Backlinks', 'Relance hebdomadaire des contacts', 'backlinks', 'schedule', '{"schedule": "0 14 * * 2"}', '{"action": "followup_backlinks"}', true, 90, 24, 22),

-- IA & MONITORING
(gen_random_uuid(), 'IA Master Execution', 'Execution horaire du moteur IA principal', 'ai', 'schedule', '{"schedule": "0 * * * *"}', '{"action": "ai_master_execute"}', true, 100, 1440, 1435),
(gen_random_uuid(), 'Suggestions IA', 'Generation de suggestions toutes les 2h', 'ai', 'schedule', '{"schedule": "0 */2 * * *"}', '{"action": "generate_ai_suggestions"}', true, 95, 720, 715),
(gen_random_uuid(), 'Optimisation Prompts IA', 'Analyse et optimisation des prompts', 'ai', 'schedule', '{"schedule": "0 */6 * * *"}', '{"action": "optimize_prompts"}', true, 90, 120, 118),
(gen_random_uuid(), 'Self-Healer Autonome', 'Auto-correction systeme toutes les 15 min', 'monitoring', 'schedule', '{"schedule": "*/15 * * * *"}', '{"action": "self_heal"}', true, 100, 5760, 5755),
(gen_random_uuid(), 'Monitoring Temps Reel', 'Surveillance systeme toutes les 5 min', 'monitoring', 'schedule', '{"schedule": "*/5 * * * *"}', '{"action": "realtime_monitoring"}', true, 95, 17280, 17270),
(gen_random_uuid(), 'Backup Quotidien', 'Sauvegarde automatique a 1h du matin', 'monitoring', 'schedule', '{"schedule": "0 1 * * *"}', '{"action": "auto_backup"}', true, 90, 180, 180),
(gen_random_uuid(), 'Pipeline Automation', 'Automatisation pipeline horaire', 'leads', 'schedule', '{"schedule": "0 * * * *"}', '{"action": "pipeline_automation"}', true, 85, 1440, 1430)

ON CONFLICT DO NOTHING;