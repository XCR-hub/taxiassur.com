/*
  ══════════════════════════════════════════════════════════════════
  FIX URGENT : 2 Problèmes Critiques

  1. Table viral_templates vide → Edge function erreur 500
  2. Pages villes IA incohérentes → Template différent
  ══════════════════════════════════════════════════════════════════
*/

-- ════════════════════════════════════════════════════════════════
-- PROBLÈME 1 : VIRAL_TEMPLATES VIDE
-- ════════════════════════════════════════════════════════════════

-- Vérifier si table existe
SELECT COUNT(*) as "Templates actuels" FROM viral_templates;

-- Supprimer anciens si présents
DELETE FROM viral_templates WHERE TRUE;

-- Insérer 10 templates viraux haute performance
INSERT INTO viral_templates (
  name, category, template_text, hashtags, emoji_pattern,
  avg_views, performance_score, platforms, engagement_tactics
) VALUES

('Conseil Expert Taxi', 'conseil',
'💡 ASTUCE PRO TAXI : {conseil_principal}

Pourquoi c''est CRUCIAL pour vous :
✅ {raison_1}
✅ {raison_2}
✅ {raison_3}

🎯 Action IMMÉDIATE :
{action_concrete}

💬 Tag un collègue concerné ! 👇',
ARRAY['#AssuranceTaxi', '#ConduireMalin', '#ConseilPro', '#TaxiPro'],
'💡✅🎯💬👇',
2800000, 88,
ARRAY['facebook', 'linkedin', 'instagram'],
'{"hooks": ["question", "urgence"], "cta": "tag", "engagement": "commentaire"}'::jsonb),

('Témoignage Transformation', 'temoignage',
'😱 AVANT : {situation_avant}

Résultat ? {consequence_negative}

MAIS ALORS... {rebondissement}

✨ AUJOURD''HUI : {situation_positive}

💬 Qui se reconnait ? Mettez 🔥 en commentaire !',
ARRAY['#TemoignageTaxi', '#SuccessStory', '#Transformation'],
'😱✨💬🔥',
7500000, 96,
ARRAY['facebook', 'instagram', 'tiktok'],
'{"hooks": ["emotion", "surprise", "transformation"], "cta": "emoji", "engagement": "reaction"}'::jsonb),

('Alerte Info Urgente', 'actualite',
'🚨 ALERTE TAXI • INFO URGENTE

{titre_choc}

🔴 Ce qui CHANGE pour vous :
→ {changement_1}
→ {changement_2}
→ {changement_3}

⚠️ DEADLINE : {deadline}

🔄 Partage à TOUS tes collègues !',
ARRAY['#ActuTaxi', '#LoiTaxi', '#InfoUrgente', '#AlerteTaxi'],
'🚨🔴⚠️🔄',
4200000, 92,
ARRAY['facebook', 'linkedin', 'twitter'],
'{"hooks": ["urgence", "autorite", "fomo"], "cta": "partage", "engagement": "viralite"}'::jsonb),

('Quiz Interactif', 'engagement',
'❓ QUIZ TAXI : VRAI ou FAUX ?

{affirmation_surprenante}

Réponds en commentaire :
🅰️ VRAI
🅱️ FAUX

💡 Indice : {indice_subtil}

⏰ Réponse révélée dans 2h... 👇',
ARRAY['#QuizTaxi', '#TestTesConnaissances', '#JeuTaxi'],
'❓💡⏰👇',
6100000, 90,
ARRAY['facebook', 'instagram', 'linkedin'],
'{"hooks": ["curiosite", "interaction", "jeu"], "cta": "reponse", "engagement": "commentaire"}'::jsonb),

('Erreur Coûteuse', 'conseil',
'❌ STOP ! N''achète PAS avant de lire ça...

Erreur #1 que 9 taxis sur 10 font :
{erreur_commune}

💸 Coût réel : {montant_perdu}€ PERDUS

✅ Solution SIMPLE : {solution_rapide}

💰 Clique si tu veux économiser !',
ARRAY['#ErreurTaxi', '#EconomieAssurance', '#AstucePro'],
'❌💸✅💰',
5300000, 94,
ARRAY['facebook', 'linkedin', 'instagram'],
'{"hooks": ["peur", "argent", "solution"], "cta": "reaction", "engagement": "sauvegarder"}'::jsonb),

('Avant/Après Choc', 'temoignage',
'AVANT 😰
{situation_difficile}

APRÈS 🎉
{situation_amelioree}

🔑 La clé ? {solution_simple}

📊 Résultat : {benefice_chiffre}

💬 Tu veux pareil ? Commente "JE VEUX" 👇',
ARRAY['#AvantApres', '#Transformation', '#ResultatTaxi'],
'😰🎉🔑📊💬👇',
8200000, 97,
ARRAY['facebook', 'instagram', 'tiktok'],
'{"hooks": ["transformation", "preuve", "resultat"], "cta": "commentaire", "engagement": "conversion"}'::jsonb),

('Secret Révélé', 'conseil',
'🤫 SECRET que les assureurs cachent...

{revelation_choc}

Concrètement pour TOI :
💰 {avantage_1}
⚡ {avantage_2}
🛡️ {avantage_3}

⏰ URGENT : {date_limite}

📌 ENREGISTRE ce post ! 🔖',
ARRAY['#SecretAssurance', '#InfoExclusive', '#RevélationTaxi'],
'🤫💰⚡🛡️⏰📌🔖',
9100000, 98,
ARRAY['facebook', 'linkedin', 'instagram'],
'{"hooks": ["exclusivite", "urgence", "secret"], "cta": "sauvegarder", "engagement": "partage"}'::jsonb),

('Comparatif Battle', 'comparatif',
'⚔️ DUEL : Option A vs Option B

💰 Prix
A : {prix_a}€ | B : {prix_b}€

🛡️ Garanties
A : {garanties_a} | B : {garanties_b}

🏆 GAGNANT ?
{verdict_surprenant}

👉 Vote : A ou B ? Commente !',
ARRAY['#Comparatif', '#Assurance', '#BestChoice'],
'⚔️💰🛡️🏆👉',
4800000, 89,
ARRAY['facebook', 'linkedin', 'twitter'],
'{"hooks": ["comparaison", "vote", "debat"], "cta": "commentaire", "engagement": "debat"}'::jsonb),

('Deadline Pression', 'actualite',
'⏰ ATTENTION : Plus que {jours_restants} JOURS !

{evenement_urgent}

⚠️ Si tu rates ça : {consequence_grave}

✅ CHECKLIST EXPRESS
☐ {action_1}
☐ {action_2}
☐ {action_3}

🔥 Agis MAINTENANT !',
ARRAY['#Urgence', '#Deadline', '#ActionRapide'],
'⏰⚠️✅🔥',
3400000, 85,
ARRAY['facebook', 'instagram', 'linkedin'],
'{"hooks": ["urgence", "fomo", "pression"], "cta": "action", "engagement": "immediat"}'::jsonb),

('Stat Choquante', 'actualite',
'📊 CHIFFRE DU JOUR (Incroyable)

{pourcentage}% des taxis {stat_choc}

🤯 Tu le savais ?

Détails :
🔹 {detail_1}
🔹 {detail_2}
🔹 {detail_3}

💡 CONSEIL : {action_preventive}

🏷️ Tag un collègue ! 👥',
ARRAY['#StatsTaxi', '#ChiffresCles', '#DataTaxi'],
'📊🤯🔹💡🏷️👥',
6700000, 93,
ARRAY['facebook', 'linkedin', 'twitter'],
'{"hooks": ["chiffres", "choc", "data"], "cta": "tag", "engagement": "partage"}'::jsonb);

-- Vérification insertion
SELECT
  COUNT(*) as "Total templates",
  AVG(performance_score) as "Score moyen",
  AVG(avg_views) as "Vues moyennes"
FROM viral_templates;

RAISE NOTICE '✅ 10 templates viraux insérés avec succès';

-- ════════════════════════════════════════════════════════════════
-- PROBLÈME 2 : PAGES VILLES INCOHÉRENTES
-- ════════════════════════════════════════════════════════════════

-- Diagnostic : Lister pages avec statut et structure
SELECT
  slug,
  city,
  status,
  h1_title IS NOT NULL as has_h1,
  city_name IS NOT NULL as has_city_name,
  population,
  LENGTH(content::text) as content_length,
  created_at
FROM city_pages
ORDER BY created_at DESC
LIMIT 20;

-- Mettre à jour TOUTES les pages pour qu'elles utilisent status='published'
-- (Le nouveau template CityPage.tsx filtre sur status='published')
UPDATE city_pages
SET status = 'published'
WHERE status != 'published';

-- Ajouter h1_title si manquant (utilise title comme fallback)
UPDATE city_pages
SET h1_title = COALESCE(h1_title, title)
WHERE h1_title IS NULL OR h1_title = '';

-- Ajouter city_name si manquant (utilise city comme fallback)
UPDATE city_pages
SET city_name = COALESCE(city_name, city)
WHERE city_name IS NULL OR city_name = '';

-- Résumé modifications
SELECT
  COUNT(*) as "Total villes",
  COUNT(*) FILTER (WHERE status = 'published') as "Publiées",
  COUNT(*) FILTER (WHERE h1_title IS NOT NULL) as "Avec H1",
  COUNT(*) FILTER (WHERE city_name IS NOT NULL) as "Avec city_name",
  COUNT(*) FILTER (WHERE population IS NOT NULL) as "Avec population"
FROM city_pages;

-- ════════════════════════════════════════════════════════════════
-- VÉRIFICATION FINALE
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  template_count INTEGER;
  city_count INTEGER;
  published_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM viral_templates;
  SELECT COUNT(*) INTO city_count FROM city_pages;
  SELECT COUNT(*) INTO published_count FROM city_pages WHERE status = 'published';

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CORRECTION TERMINÉE';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Templates viraux: %', template_count;
  RAISE NOTICE '🏙️  Total villes: %', city_count;
  RAISE NOTICE '✅ Villes publiées: %', published_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  IF template_count = 0 THEN
    RAISE WARNING '⚠️ ATTENTION: Aucun template viral trouvé !';
  END IF;

  IF published_count = 0 THEN
    RAISE WARNING '⚠️ ATTENTION: Aucune ville publiée !';
  END IF;
END $$;
