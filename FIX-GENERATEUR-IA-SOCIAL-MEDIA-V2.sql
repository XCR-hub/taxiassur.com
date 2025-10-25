/*
═══════════════════════════════════════════════════════════════════
🔧 FIX: Générateur IA Réseaux Sociaux - VERSION SANS ERREUR
═══════════════════════════════════════════════════════════════════

PROBLÈME: Erreur 500 lors de "Générer avec IA" dans /backoffice/social-media

CETTE VERSION: Évite l'erreur ON CONFLICT et vérifie les doublons

COPIER/COLLER DANS: Supabase Dashboard → SQL Editor → RUN
═══════════════════════════════════════════════════════════════════
*/

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 1: DIAGNOSTIC - Vérifier l'existence des templates
-- ═════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📊 DIAGNOSTIC TEMPLATES VIRAUX';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

SELECT
  'Total templates' as metric,
  COUNT(*)::text as valeur
FROM viral_templates
UNION ALL
SELECT
  'Templates actifs' as metric,
  COUNT(*)::text as valeur
FROM viral_templates
WHERE is_active = true
UNION ALL
SELECT
  'Catégories' as metric,
  string_agg(DISTINCT category, ', ') as valeur
FROM viral_templates;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 2: SUPPRIMER LES ANCIENS TEMPLATES (OPTIONNEL)
-- ═════════════════════════════════════════════════════════════

-- ⚠️ DÉCOMMENTER LA LIGNE CI-DESSOUS POUR RÉINITIALISER
-- DELETE FROM viral_templates WHERE category = 'assurance';

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 3: INSÉRER LES TEMPLATES (SI ILS N'EXISTENT PAS)
-- ═════════════════════════════════════════════════════════════

-- Template 1: Question Choc
INSERT INTO viral_templates (
  name, category, template_text, hashtags, emoji_pattern,
  engagement_tactics, avg_views, performance_score, is_active
)
SELECT
  'Question Choc - Assurance',
  'assurance',
  'Saviez-vous que [CHIFFRE PRÉCIS] % des [PUBLIC CIBLE] paient TROP CHER leur assurance ? 😱

Voici LA méthode que personne ne vous dit pour économiser jusqu''à [MONTANT] € par an :

1️⃣ [ASTUCE 1]
2️⃣ [ASTUCE 2]
3️⃣ [ASTUCE 3]

💡 Bonus : [CONSEIL SECRET]

👉 Qui applique ça dès aujourd''hui ? Commentez "OUI" 👇',
  ARRAY['#AssuranceTaxi', '#EconomiesGaranties', '#ConseildExpert', '#VTC', '#TaxiPro'],
  '😱💡👉📊✅',
  '{"hook": "question_choc", "call_to_action": "commentez", "social_proof": "chiffres_precis", "curiosity_gap": true}'::jsonb,
  7200000,
  95,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM viral_templates WHERE name = 'Question Choc - Assurance'
);

-- Template 2: Histoire personnelle
INSERT INTO viral_templates (
  name, category, template_text, hashtags, emoji_pattern,
  engagement_tactics, avg_views, performance_score, is_active
)
SELECT
  'Histoire Personnelle - Témoignage',
  'assurance',
  'Il y a [DURÉE], j''ai failli perdre [CONSÉQUENCE DRAMATIQUE] 😰

Aujourd''hui, grâce à [SOLUTION], j''ai économisé [MONTANT PRÉCIS] € et je dors tranquille.

Ce que j''ai compris :
✅ [LEÇON 1]
✅ [LEÇON 2]
✅ [LEÇON 3]

D''ailleurs, [STATISTIQUE SURPRENANTE]

Mon conseil : [ACTION CONCRÈTE]

🔥 Sauvegardez ce post, vous le retrouverez au bon moment !',
  ARRAY['#TémoignageTaxi', '#AssurancePro', '#ConseilExpert', '#TaxiConseils', '#VTCBusiness'],
  '😰✅🔥💪📈',
  '{"hook": "histoire_personnelle", "emotion": "peur_puis_soulagement", "call_to_action": "sauvegardez", "credibility": "statistique"}'::jsonb,
  5800000,
  92,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM viral_templates WHERE name = 'Histoire Personnelle - Témoignage'
);

-- Template 3: Liste numérotée
INSERT INTO viral_templates (
  name, category, template_text, hashtags, emoji_pattern,
  engagement_tactics, avg_views, performance_score, is_active
)
SELECT
  'Top 5 Erreurs - Liste Virale',
  'assurance',
  'TOP 5 des ERREURS qui vous coûtent des milliers d''euros en assurance taxi 💸

(La #3 est la plus courante)

1️⃣ [ERREUR 1] → Conséquence : [COÛT]
2️⃣ [ERREUR 2] → Perte moyenne : [MONTANT]
3️⃣ [ERREUR 3] → 89% des taxis font ça ! 😱
4️⃣ [ERREUR 4] → Impact : [CHIFFRE]
5️⃣ [ERREUR 5] → Solution : [CONSEIL]

💡 Celle que vous devez corriger MAINTENANT : la #3

👉 Identifiez un chauffeur qui doit voir ça !',
  ARRAY['#ErreursTaxi', '#AssuranceOptimale', '#ConseilsAssurance', '#TaxiEconomies', '#ProTips'],
  '💸😱💡👉⚡',
  '{"hook": "top_liste", "curiosity_gap": true, "call_to_action": "identifiez", "urgency": "maintenant"}'::jsonb,
  8500000,
  98,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM viral_templates WHERE name = 'Top 5 Erreurs - Liste Virale'
);

-- Template 4: Avant/Après
INSERT INTO viral_templates (
  name, category, template_text, hashtags, emoji_pattern,
  engagement_tactics, avg_views, performance_score, is_active
)
SELECT
  'Transformation Avant/Après',
  'assurance',
  'AVANT ❌ vs APRÈS ✅

Il y a [DURÉE], je payais [MONTANT_AVANT] € d''assurance taxi.

Mes erreurs :
❌ [ERREUR 1]
❌ [ERREUR 2]
❌ [ERREUR 3]

AUJOURD''HUI, je paie seulement [MONTANT_APRÈS] € 🎯

Ce qui a changé :
✅ [AMÉLIORATION 1]
✅ [AMÉLIORATION 2]
✅ [AMÉLIORATION 3]

Résultat : [ÉCONOMIE ANNUELLE] € économisés par an !

En fait, la clé c''était [INSIGHT CLÉ].

💬 Et vous, vous payez combien actuellement ?',
  ARRAY['#TransformationTaxi', '#EconomiesAssurance', '#AvantAprès', '#TaxiSuccess', '#OptimisationCoûts'],
  '❌✅🎯💪📊',
  '{"hook": "avant_apres", "social_proof": "montants_precis", "call_to_action": "question", "credibility": "transparence"}'::jsonb,
  6400000,
  94,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM viral_templates WHERE name = 'Transformation Avant/Après'
);

-- Template 5: Mythe vs Réalité
INSERT INTO viral_templates (
  name, category, template_text, hashtags, emoji_pattern,
  engagement_tactics, avg_views, performance_score, is_active
)
SELECT
  'Mythe VS Réalité - Éducation',
  'assurance',
  '🚨 MYTHE vs RÉALITÉ sur l''assurance taxi 🚨

❌ MYTHE : [CROYANCE FAUSSE RÉPANDUE]
✅ RÉALITÉ : [VÉRITÉ SURPRENANTE]

❌ MYTHE : [IDÉE REÇUE 2]
✅ RÉALITÉ : [FAIT CONCRET AVEC CHIFFRE]

❌ MYTHE : [ERREUR COMMUNE 3]
✅ RÉALITÉ : [EXPLICATION CLAIRE]

Notamment, [STATISTIQUE CHOC] % des chauffeurs pensent encore que [MYTHE], alors qu''en réalité [VÉRITÉ].

Ce que ça change pour vous :
💰 [IMPACT FINANCIER]
🛡️ [IMPACT PROTECTION]
⏱️ [IMPACT TEMPS]

📌 Sauvegardez ce post pour le partager à vos collègues !',
  ARRAY['#MythesAssurance', '#VéritésTaxi', '#ÉducationFinancière', '#AssuranceDémystifiée', '#ConnaissancesPro'],
  '🚨❌✅💰🛡️',
  '{"hook": "mythe_realite", "education": true, "call_to_action": "sauvegardez", "social_proof": "statistique", "virality": "partage_collegues"}'::jsonb,
  7800000,
  96,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM viral_templates WHERE name = 'Mythe VS Réalité - Éducation'
);

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 4: VÉRIFICATION FINALE
-- ═════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ RÉSULTAT FINAL';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- Compter les templates actifs
SELECT
  '📊 Total templates actifs' as info,
  COUNT(*)::text as valeur
FROM viral_templates
WHERE is_active = true
UNION ALL
SELECT
  '📈 Vues moyennes' as info,
  ROUND(AVG(avg_views)/1000000, 1)::text || 'M' as valeur
FROM viral_templates
WHERE is_active = true
UNION ALL
SELECT
  '⭐ Score moyen' as info,
  ROUND(AVG(performance_score))::text || '/100' as valeur
FROM viral_templates
WHERE is_active = true;

-- Lister les templates disponibles
SELECT
  '📝 ' || name as "Template",
  (avg_views / 1000000)::numeric(10,1) || 'M vues' as "Performance",
  performance_score || '/100' as "Score"
FROM viral_templates
WHERE is_active = true
ORDER BY avg_views DESC;

-- Tester la fonction RPC
DO $$
DECLARE
  template_count integer;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM get_viral_template('assurance');

  IF template_count > 0 THEN
    RAISE NOTICE '✅ Fonction get_viral_template() fonctionne: % templates trouvés', template_count;
  ELSE
    RAISE WARNING '⚠️ Fonction get_viral_template() ne retourne aucun template!';
  END IF;
END $$;

/*
═══════════════════════════════════════════════════════════════════
✅ SUCCÈS !
═══════════════════════════════════════════════════════════════════

Si vous voyez les résultats ci-dessus, les templates sont installés.

PROCHAINES ÉTAPES:

1. Configurer la clé OpenAI
   → Supabase Dashboard → Settings → Edge Functions → Secrets
   → Ajouter: OPENAI_API_KEY = sk-proj-...

2. Tester le générateur
   → Aller sur /backoffice/social-media
   → Cliquer "Générer avec IA"
   → Attendre 5-10 secondes
   → ✅ Contenu généré !

AIDE:
- Si erreur 500 persiste: vérifier OPENAI_API_KEY
- Si "No viral template found": réexécuter ce script
- Documentation: CONFIGURATION-OPENAI-SUPABASE.md

═══════════════════════════════════════════════════════════════════
*/
